#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Parser do Referencial Curricular de Colônia Leopoldina (RCCL).
Gera colonia-leopoldina-skills.json no formato {"skills":[...]}."""
import json, re, os

UP = "/sessions/bold-sleepy-mayer/mnt/uploads"
def _find(sub):
    for fn in os.listdir(UP):
        if sub in fn.upper() and fn.lower().endswith(".md"):
            return os.path.join(UP, fn)
    raise FileNotFoundError(sub)
EI_FILE, EF_FILE, EJA_FILE = _find("INFANTIL"), _find("FUNDAMENTAL"), _find("EJA")

LOWV = "a-záàâãéêíóôõúüç"
def dehyphen(s): return re.sub(rf"(?<=[{LOWV}])- (?=[{LOWV}])", "", s)
def read(p):
    with open(p, encoding="utf-8") as f: return f.read()
def cl(s):
    s = s.replace("```", "").replace("\xa0", " ")
    s = re.sub(r"\s+", " ", s).strip()
    return dehyphen(s)

NOISE = re.compile(r"^(R E F E R.*|O R G A N I Z.*|FONTE.*|Fonte:.*|Figura \d.*|Tabela \d.*|\d{1,4}|[•\-–]\s*)$")
def is_noise(s):
    if not s: return True
    if NOISE.match(s): return True
    letters=[c for c in s if c.isalpha()]
    if len(s)>20 and letters and s.count(" ")/len(s)>0.45: return True
    return False

def dedup_doubled(s):
    n=len(s)
    if n>6 and n%2==0 and s[:n//2]==s[n//2:]: return s[:n//2]
    m=re.match(r"^(.{12,}?)\1$", s)
    return m.group(1) if m else s

CUTS=["A habilidade em questão","A habilidade em foco","Utilizar temas","Sugest","Orienta",
      "Propor experiências","Grupo etário","Desdobramento","Para essa","Para essas","Durante a",
      "Por exemplo","Esta habilidade","Essa habilidade","Trabalhar","Explorar com","Realizar"]
def first_hab(text):
    text=text.strip()
    cut=len(text)
    for mk in CUTS:
        i=text.find(mk)
        if 30<i<cut: cut=i
    text=text[:cut].strip()
    sents=re.split(r"(?<=[.!?])\s+", text)
    out=""
    for s in sents:
        if out and len(out)+len(s)>360: break
        out=(out+" "+s).strip()
        if len(out)>=60 and out.endswith((".","!","?")) and len(out)>120: break
    out=out.strip().strip("–-•:; ").strip()
    return out or text[:360].strip()

def title_from(desc, n=90):
    t=re.split(r"(?<=[.!?])\s+", desc)[0].strip().rstrip(".;:")
    if len(t)>n: t=t[:n].rsplit(" ",1)[0]+"…"
    return t or desc[:n]

EF_SUBJECT={"LP":"Língua Portuguesa","MA":"Matemática","AR":"Arte","CI":"Ciências","HI":"História",
 "GE":"Geografia","CO":"Computação","LI":"Língua Inglesa","EF":"Educação Física","ER":"Ensino Religioso","LO":"Computação"}
EF_GRADE={"01":"1º Ano","02":"2º Ano","03":"3º Ano","04":"4º Ano","05":"5º Ano","06":"6º Ano",
 "07":"7º Ano","08":"8º Ano","09":"9º Ano","12":"1º ao 2º Ano","15":"1º ao 5º Ano","35":"3º ao 5º Ano",
 "67":"6º ao 7º Ano","69":"6º ao 9º Ano","89":"8º ao 9º Ano"}
EI_CAMPO={"EO":"O eu, o outro e o nós","CG":"Corpo, gestos e movimentos","TS":"Traços, sons, cores e formas",
 "EF":"Escuta, fala, pensamento e imaginação","ET":"Espaços, tempos, quantidades, relações e transformações"}
EI_GRADE={"01":"Bebês (0 a 1 ano e 6 meses)","02":"Crianças bem pequenas (1 ano e 7 meses a 3 anos e 11 meses)",
 "03":"Crianças pequenas (4 anos a 5 anos e 11 meses)"}
EJA_AREA={"PAM":"Práticas de Alfabetização e Matemática","PLC":"Práticas em Linguagens e Cultura Digital",
 "PTT":"Práticas do Mundo do Trabalho e Territórios","LES":"Leitura e Escrita","MAT":"Matemática",
 "CIE":"Ciências da Natureza","CN":"Ciências da Natureza","HIS":"História","GEO":"Geografia",
 "CHS":"Ciências Humanas","ART":"Arte","ING":"Língua Inglesa","ER":"Ensino Religioso","PV":"Projeto de Vida","EF":"Educação Física"}
EJA_ETAPA={"01":"1ª Etapa","02":"2ª Etapa","03":"3ª Etapa","04":"4ª Etapa","05":"5ª Etapa","06":"6ª Etapa",
 "07":"7ª Etapa","08":"8ª Etapa","14":"1ª a 4ª Etapa","58":"5ª a 8ª Etapa"}

def follow(lines, j, code_re, prefix="", limit=1400):
    buf=[prefix] if prefix else []
    while j < len(lines):
        s=cl(lines[j])
        if not is_noise(s):
            if code_re.search(s): break
            buf.append(s)
        j+=1
        if len(" ".join(buf))>limit: break
    return dedup_doubled(cl(" ".join(buf)))

# ---------------- EI ----------------
def parse_ei():
    raw=read(EI_FILE).split("\n")
    cre=re.compile(r"\((EI0\d[A-Z]{2}\d{2})\)")
    out=[]; campo=""
    for i,line in enumerate(raw):
        s=cl(line)
        m=re.match(r"CAMPO DE EXPERIÊNCIA:\s*(.+)", s)
        if m: campo=m.group(1).title(); continue
        cm=cre.search(s)
        if not cm: continue
        code=cm.group(1)
        after=follow(raw, i+1, cre)
        desc=first_hab(after)
        camp=EI_CAMPO.get(code[4:6], campo or "Educação Infantil")
        out.append(dict(code=code,name=title_from(desc),description=desc,
            grade_level=EI_GRADE.get(code[2:4],"Educação Infantil"),
            competency=camp,subject="Educação Infantil",axis=camp.upper()))
    return out

# ---------------- EF ----------------
EFC=r"EF\d{2}[A-Z]{2,6}\d{2}"
def parse_ef():
    raw=read(EF_FILE).split("\n")
    cre=re.compile(rf"\(?({EFC})\)?")
    out=[]; eixo=""
    for i,line in enumerate(raw):
        s=cl(line)
        em=re.match(r"EIXO[:\s]+(.+)", s, re.I)
        if em: eixo=em.group(1)
        code=None; name=None; same_after=""
        m_iso=re.fullmatch(rf"\(?({EFC})\)?[.;:]*", s)
        m_start=re.match(rf"^\(?({EFC})\)?\s+(.{{3,}})$", s)
        m_end=re.match(rf"^(.{{1,55}}?)\(({EFC})\)[:.]?$", s)
        m_mid=re.match(rf"^(.{{1,40}}?)\(({EFC})\):\s*(.{{3,}})$", s)
        m_dash=re.match(rf"^([A-Za-zÀ-ÿ ]{{3,30}}?)\s*[–-]\s*({EFC})\s*[–-]\s*(.+)$", s)
        if m_iso:
            code=m_iso.group(1)
        elif m_dash:
            code=m_dash.group(2); same_after=m_dash.group(3)
        elif m_mid:
            code=m_mid.group(2); name=m_mid.group(1).strip(); same_after=m_mid.group(3)
        elif m_start:
            code=m_start.group(1); same_after=m_start.group(2)
        elif m_end:
            pref=m_end.group(1).strip()
            # evita prosa: prefixo deve parecer objeto (sem terminar frase, poucas palavras)
            if pref and not re.search(r"[a-z],\s*$", pref):
                code=m_end.group(2); name=pref
        if not code: continue
        mid=re.match(r"EF\d{2}([A-Z]{2,6})\d{2}", code).group(1)
        subj=EF_SUBJECT.get(mid[:2],"Computação")
        after=follow(raw, i+1, cre, prefix=same_after)
        desc=first_hab(after)
        if not desc or len(desc)<8: continue
        if name and name.strip(".; ").upper() in ("NÃO CONSTA","NAO CONSTA","NÃO CONSTA."): name=None
        out.append(dict(code=code,name=name or title_from(desc),description=desc,
            grade_level=EF_GRADE.get(code[2:4],code[2:4]),
            competency="Computação" if mid[:2]=="CO" else subj,
            subject=subj, axis=(eixo[:40].upper() if eixo else "ENSINO FUNDAMENTAL")))
    return out

# ---------------- EJA ----------------
def parse_eja():
    raw=read(EJA_FILE).split("\n")
    cre=re.compile(r"(EJA-CL\d{2}-?[A-Z]{2,4}\d{2})")
    out=[]
    for i,line in enumerate(raw):
        s=cl(line)
        cm=cre.search(s)
        if not cm: continue
        code=cm.group(1)
        norm=code.replace("EJA-CL","")
        etapa=norm[:2]
        suf=re.sub(r"\d{2}$","",re.sub(r"^\d{2}-?","",norm))
        area=EJA_AREA.get(suf,suf)
        same=s[cm.end():].strip()
        after=follow(raw, i+1, cre, prefix=same)
        desc=first_hab(after)
        seg="1º Segmento" if etapa in ("01","02","03","04","14") else "2º Segmento"
        out.append(dict(code=code,name=title_from(desc),description=desc,
            grade_level=EJA_ETAPA.get(etapa,etapa),competency=area,
            subject=f"EJA - {area}",axis=seg.upper()))
    return out

def dedupe(sk):
    seen={}
    for s in sk:
        k=s["code"].upper()
        if k not in seen or len(s["description"])>len(seen[k]["description"]):
            seen[k]=s
    return list(seen.values())

if __name__=="__main__":
    ei=dedupe(parse_ei()); ef=dedupe(parse_ef()); eja=dedupe(parse_eja())
    alls=ei+ef+eja
    alls.sort(key=lambda s:s["code"])
    print("EI",len(ei),"EF",len(ef),"EJA",len(eja),"TOTAL",len(alls))
    json.dump({"skills":alls}, open("colonia-leopoldina-skills.json","w",encoding="utf-8"), ensure_ascii=False, indent=2)
