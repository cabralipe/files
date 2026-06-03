'use client'

import { supabase } from '@/lib/supabase-client'
import { useEffect, useMemo, useState } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { useAuth } from '@/hooks/useAuth'
import PeiControls, { type PeiStudent, type PlanKind } from '@/components/PeiControls'


type Skill = {
  id: string
  code: string
  disciplina: string
  ano: string
  unidade_tematica: string
  objeto_conhecimento: string
  habilidade: string
  habilidade_raw: string
}

type PlanForm = {
  title: string
  teacher: string
  school: string
  grade_level: string
  subject: string
  date: string
  duration: string
  methodology: string
  objectives: string
  materials: string
  notes: string
}

type Nivel = 'infantil' | 'fundamental' | 'medio'
type PdfLayout = 'risografico' | 'institucional' | 'simples' | 'verde' | 'colorido' | 'noturno'

const NIVEL_CONFIG: Record<Nivel, {
  label: string; sub: string; file: string; icon: string
  disciplinaLabel: string; hasUnidade: boolean
  count: number; accentVar: string
}> = {
  infantil: {
    label: 'Educação Infantil',
    sub: 'Bebês · Crianças bem pequenas · Crianças pequenas',
    file: '/bncc-infantil-skills.json',
    icon: '🌱',
    disciplinaLabel: 'Campo de experiência',
    hasUnidade: false,
    count: 93,
    accentVar: 'var(--mustard)',
  },
  fundamental: {
    label: 'Ensino Fundamental',
    sub: '1º ao 9º ano · 10 disciplinas',
    file: '/bncc-nacional-skills.json',
    icon: '📚',
    disciplinaLabel: 'Disciplina',
    hasUnidade: true,
    count: 1408,
    accentVar: 'var(--teal)',
  },
  medio: {
    label: 'Ensino Médio',
    sub: '1º ao 3º ano · 6 áreas do conhecimento',
    file: '/bncc-medio-skills.json',
    icon: '🎓',
    disciplinaLabel: 'Área do conhecimento',
    hasUnidade: false,
    count: 209,
    accentVar: 'var(--blue)',
  },
}

const NAC_TUTORIAL_STEPS = [
  {
    icon: '📋',
    iconStyle: { background: 'var(--blue)', color: 'var(--paper-soft)' },
    title: 'Bem-vindo ao BNCC Nacional!',
    body: 'Aqui você acessa as habilidades da Base Nacional Comum Curricular para todas as etapas: Educação Infantil, Ensino Fundamental e Ensino Médio. Crie planos de aula em segundos com ajuda da IA.',
    tip: null,
  },
  {
    icon: '🔍',
    iconStyle: { background: 'var(--teal-wash)', color: 'var(--ink)' },
    title: 'Pesquise as habilidades',
    body: 'Use a aba "Pesquisar" para explorar as habilidades. Filtre por disciplina ou componente curricular, ano/faixa etária e unidade temática. Use a busca livre para encontrar qualquer conteúdo.',
    tip: 'Pesquisar',
  },
  {
    icon: '✔',
    iconStyle: { background: 'var(--mustard-wash)', color: 'var(--ink)' },
    title: 'Selecione as habilidades',
    body: 'Clique em qualquer habilidade para ver os detalhes e expandir o conteúdo. Clique em "+ Selecionar" para adicioná-la ao seu plano. O botão flutuante mostra quantas você selecionou.',
    tip: 'Plano',
  },
  {
    icon: '✦',
    iconStyle: { background: 'var(--plum-wash)', color: 'var(--ink)' },
    title: 'Gere o plano com IA',
    body: 'Vá para a aba "Plano", preencha o tema, professor, escola e as informações da aula. Clique em "Gerar plano com IA" e em menos de 30 segundos você terá um plano completo, pronto para editar.',
    tip: 'Plano',
  },
  {
    icon: '↓',
    iconStyle: { background: 'var(--teal-wash)', color: 'var(--ink)' },
    title: 'Baixe em PDF — 6 layouts',
    body: 'Clique em "Baixar PDF" e escolha entre 6 modelos: Risográfico, Institucional, Simples, Verde Natural, Colorido e Noturno. Use "Visualizar" para ver o plano renderizado com fórmulas matemáticas em LaTeX.',
    tip: null,
  },
]

const PDF_LAYOUTS: { id: PdfLayout; label: string; desc: string }[] = [
  { id: 'risografico', label: 'Risográfico', desc: 'Fundo creme, acentos em vermelho coral.' },
  { id: 'institucional', label: 'Institucional', desc: 'Cabeçalho azul sólido. Visual formal.' },
  { id: 'simples', label: 'Simples', desc: 'Branco puro, ideal para impressão econômica.' },
  { id: 'verde', label: 'Verde Natural', desc: 'Fundo creme-verde, acentos em verde escuro.' },
  { id: 'colorido', label: 'Colorido', desc: 'Laranja vibrante, ótimo para Ensino Infantil.' },
  { id: 'noturno', label: 'Noturno', desc: 'Fundo escuro, texto claro. Visual moderno.' },
]

const emptyForm: PlanForm = {
  title: '', teacher: '', school: '', grade_level: '', subject: '',
  date: new Date().toISOString().slice(0, 10),
  duration: '50 minutos', methodology: 'Aprendizagem ativa',
  objectives: '', materials: 'Quadro, caderno, celular ou computador compartilhado', notes: '',
}

const PAGE_SIZE = 24

const discColor: Record<string, string> = {
  'Computação': 'tcd', 'Computação Ensino Médio': 'tcd',
  'Língua Portuguesa': 'tp',
  'Matemática': 'tm', 'Matemática e suas Tecnologias': 'tm',
  'Ciências': 'tc', 'Ciências da Natureza e suas Tecnologias': 'tc',
  'Arte': 'ta',
  'Língua Inglesa': 'ti', 'Linguagens e suas Tecnologias': 'ti',
  'História': 'th', 'Ciências Humanas e Sociais Aplicadas': 'th',
  'Geografia': 'tg',
  'Educação Física': 'tef',
  'Ensino Religioso': 'ter',
  'Corpo, Gestos e Movimento': 'tm',
  'Escuta, Fala, Pensamento e Imaginação': 'tp',
  'Espaços, tempos, quantidades, relações e transformações': 'tc',
  'O eu, o outro e o nós': 'tg',
  'Traços, Sons, Cores e Formas': 'ta',
}

function normalizeText(v: string) {
  return v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function latexExprToUnicode(expr: string): string {
  return expr
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\^2(?=[^{]|$)/g, '²').replace(/\^3(?=[^{]|$)/g, '³').replace(/\^n(?=[^{]|$)/g, 'ⁿ')
    .replace(/\^(\{[^}]+\})/g, (_, m) => '^' + m.replace(/[{}]/g, ''))
    .replace(/\\pi\b/g,'π').replace(/\\alpha\b/g,'α').replace(/\\beta\b/g,'β')
    .replace(/\\gamma\b/g,'γ').replace(/\\delta\b/g,'δ').replace(/\\Delta\b/g,'Δ')
    .replace(/\\theta\b/g,'θ').replace(/\\lambda\b/g,'λ').replace(/\\mu\b/g,'μ')
    .replace(/\\sigma\b/g,'σ').replace(/\\Sigma\b/g,'Σ').replace(/\\sum\b/g,'Σ')
    .replace(/\\prod\b/g,'Π').replace(/\\int\b/g,'∫').replace(/\\infty\b/g,'∞')
    .replace(/\\times\b/g,'×').replace(/\\div\b/g,'÷').replace(/\\pm\b/g,'±')
    .replace(/\\neq\b/g,'≠').replace(/\\leq\b/g,'≤').replace(/\\geq\b/g,'≥')
    .replace(/\\approx\b/g,'≈').replace(/\\cdot\b/g,'·').replace(/\\ldots\b/g,'...')
    .replace(/\\text\{([^}]+)\}/g,'$1').replace(/[{}]/g,'').trim()
}

function latexToUnicode(text: string): string {
  return text
    .replace(/\$\$([^$]+)\$\$/g, (_,m) => latexExprToUnicode(m))
    .replace(/\$([^$\n]+)\$/g, (_,m) => latexExprToUnicode(m))
}

function normalizePdfText(value: string) {
  if (!value) return ''
  return latexToUnicode(value)
    .replace(/\*\*/g, '').replace(/Ã¡/g,'á').replace(/Ã©/g,'é').replace(/Ã³/g,'ó')
    .replace(/Ãº/g,'ú').replace(/Ã§/g,'ç').replace(/Ã£/g,'ã').replace(/Ã /g,'à')
    .replace(/Ã¢/g,'â').replace(/Ãª/g,'ê').replace(/Ã­/g,'í').replace(/Ã´/g,'ô')
    .replace(/Ãµ/g,'õ').replace(/Â/g,'')
    .replace(/â€"|â€"/g,'-').replace(/â€˜|â€™/g,"'").replace(/â€œ|â€ /g,'"')
    .replace(/â€¢/g,'-').replace(/[▌▋▊▉█■]/g,'').replace(/�/g,'')
}

function Field({ label, children, wide, required }: { label: string; children: React.ReactNode; wide?: boolean; required?: boolean }) {
  return (
    <label className={`fgr${wide ? ' s2' : ''}`}>
      <span className="fl">{label}{required && <span className="req">*</span>}</span>
      {children}
    </label>
  )
}

function inlineHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\$\$([^$]+?)\$\$/g, (_, m) => {
      try { return katex.renderToString(m, { throwOnError: false, displayMode: true }) } catch { return m }
    })
    .replace(/\$([^$\n]+?)\$/g, (_, m) => {
      try { return katex.renderToString(m, { throwOnError: false, displayMode: false }) } catch { return m }
    })
}

function RenderedPlan({ text }: { text: string }) {
  const nodes: React.ReactNode[] = []
  const SECTION_RE = /^(#{1,3}\s+|[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÀÇÈÊ\s\-/()]{5,}$)/
  text.split('\n').forEach((line, idx) => {
    const t = line.trim()
    if (!t) { nodes.push(<div key={idx} className="bnac-rp-gap" />); return }
    const blockMath = t.match(/^\$\$(.+)\$\$$/)
    if (blockMath) {
      const html = (() => { try { return katex.renderToString(blockMath[1], { throwOnError: false, displayMode: true }) } catch { return blockMath[1] } })()
      nodes.push(<div key={idx} className="bnac-rp-math-block" dangerouslySetInnerHTML={{ __html: html }} />); return
    }
    const isSection = /^#{1,3} /.test(t) || (/^[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÀÇÈÊ\s\-/():]{5,}$/.test(t) && !/\$/.test(t) && t === t.toUpperCase() && t.length > 4)
    if (isSection) {
      nodes.push(<div key={idx} className="bnac-rp-sec" dangerouslySetInnerHTML={{ __html: inlineHtml(t.replace(/^#{1,3} /, '')) }} />); return
    }
    if (t.endsWith(':') && t.length < 80 && !/\$/.test(t)) {
      nodes.push(<p key={idx} className="bnac-rp-lbl" dangerouslySetInnerHTML={{ __html: inlineHtml(t) }} />); return
    }
    if (t.startsWith('- ') || t.startsWith('• ')) {
      nodes.push(<li key={idx} className="bnac-rp-li" dangerouslySetInnerHTML={{ __html: inlineHtml(t.slice(2)) }} />); return
    }
    nodes.push(<p key={idx} className="bnac-rp-p" dangerouslySetInnerHTML={{ __html: inlineHtml(t) }} />)
  })
  return <div className="bnac-rendered">{nodes}</div>
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="bnac-form-section">{children}</div>
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token
}

export default function BnccNacionalPage() {
  const { user } = useAuth()
  const [nivel, setNivel] = useState<Nivel | null>(null)
  const [skills, setSkills] = useState<Skill[]>([])
  const [view, setView] = useState<'skills' | 'plan'>('skills')
  const [query, setQuery] = useState('')
  const [disciplina, setDisciplina] = useState('')
  const [ano, setAno] = useState('')
  const [unidade, setUnidade] = useState('')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [form, setForm] = useState<PlanForm>(emptyForm)
  const [planKind, setPlanKind] = useState<PlanKind>('plano')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<PeiStudent | null>(null)
  const [generated, setGenerated] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingPhrase, setLoadingPhrase] = useState('🧠 Pensando no plano...')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')
  const [showTutorial, setShowTutorial] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(0)

  // Load skills when nivel changes + log pageview on first selection
  useEffect(() => {
    if (!nivel) return
    setSkills([])
    setSelected([])
    setQuery('')
    setDisciplina('')
    setAno('')
    setUnidade('')
    setPage(1)
    fetch(NIVEL_CONFIG[nivel].file).then((r) => r.json()).then(setSkills)
    void fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'pageview', page: '/bncc-nacional' }),
    }).catch(() => {})
  }, [nivel])

  // Show tutorial on first visit after nivel is selected
  useEffect(() => {
    if (!nivel) return
    if (!localStorage.getItem('bncc_nac_tutorial_seen')) {
      setShowTutorial(true)
    }
  }, [nivel])

  useEffect(() => { setPage(1) }, [query, disciplina, ano, unidade])
  useEffect(() => { setUnidade('') }, [disciplina])

  function closeTutorial() {
    localStorage.setItem('bncc_nac_tutorial_seen', '1')
    setShowTutorial(false)
    setTutorialStep(0)
  }

  function showToast(text: string) {
    setMessage(text)
    window.setTimeout(() => setMessage(''), 2800)
  }

  function toggleSkill(id: string) {
    setSelected((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id])
  }

  function updateForm(field: keyof PlanForm, value: string) {
    setForm((cur) => ({ ...cur, [field]: value }))
  }

  const cfg = nivel ? NIVEL_CONFIG[nivel] : null

  const disciplinas = useMemo(() => [...new Set(skills.map((s) => s.disciplina))].sort(), [skills])

  const anos = useMemo(() => {
    const base = disciplina ? skills.filter((s) => s.disciplina === disciplina) : skills
    const all = base.flatMap((s) => s.ano.split(',').map((a) => a.trim())).filter(Boolean)
    return [...new Set(all)].sort((a, b) => (parseInt(a) || 999) - (parseInt(b) || 999))
  }, [skills, disciplina])

  const unidades = useMemo(() => {
    const base = disciplina ? skills.filter((s) => s.disciplina === disciplina) : skills
    return [...new Set(base.map((s) => s.unidade_tematica).filter(Boolean))].sort()
  }, [skills, disciplina])

  const filtered = useMemo(() => {
    const q = normalizeText(query)
    return skills.filter((s) => {
      const text = normalizeText(`${s.code} ${s.habilidade} ${s.disciplina} ${s.unidade_tematica}`)
      return (q ? text.includes(q) : true)
        && (disciplina ? s.disciplina === disciplina : true)
        && (ano ? s.ano.includes(ano) : true)
        && (unidade ? s.unidade_tematica === unidade : true)
    })
  }, [skills, query, disciplina, ano, unidade])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  )
  const selectedSkills = useMemo(() => skills.filter((s) => selected.includes(s.id)), [skills, selected])

  async function generatePlan() {
    if (!form.title.trim()) { showToast('Informe o tema do plano.'); return }
    if (!selected.length) { showToast('Selecione ao menos uma habilidade.'); return }
    if (planKind === 'pei' && !user) { showToast('Faça login para gerar PEI.'); return }
    if (planKind === 'pei' && !selectedStudentId) { showToast('Selecione o aluno para gerar o PEI.'); return }

    const phrases = [
      '🧠 Analisando as habilidades selecionadas...',
      '📚 Consultando as diretrizes da BNCC...',
      '💡 Formulando objetivos didáticos...',
      '✏️ Estruturando os momentos da aula...',
      '🧩 Decompondo conceitos em atividades...',
      '🛠️ Selecionando recursos pedagógicos...',
      '⚡ Conectando com IA para gerar o plano...',
      '📝 Rascunhando o passo a passo...',
      '✨ Dando os últimos retoques...',
    ]

    setLoading(true); setProgress(0); setLoadingPhrase(phrases[0])

    let cp = 0
    const pi = setInterval(() => {
      cp += cp < 40 ? 1.0 : cp < 75 ? 0.35 : cp < 90 ? 0.15 : 0.07
      setProgress(Math.min(cp, 97))
    }, 200)

    let pi2 = 0
    const pp = setInterval(() => {
      pi2 = (pi2 + 1) % phrases.length
      setLoadingPhrase(phrases[pi2])
    }, 2200)

    try {
      const token = planKind === 'pei' ? await getAccessToken() : ''
      const response = await fetch(planKind === 'pei' ? '/api/pei/generate' : '/api/bncc-nacional/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(
          planKind === 'pei'
            ? {
                student_id: selectedStudentId,
                portal: 'bncc_nacional',
                plan: { ...form, pei_snapshot: { student: selectedStudent } },
                skills_context: selectedSkills
                  .map((s) => `[${s.code}] ${s.disciplina} - ${s.unidade_tematica}\n${s.habilidade}`)
                  .join('\n\n'),
              }
            : {
                ...form,
                skills: selectedSkills.map((s) => ({
                  code: s.code, disciplina: s.disciplina,
                  unidade_tematica: s.unidade_tematica,
                  objeto_conhecimento: s.objeto_conhecimento,
                  habilidade: s.habilidade,
                })),
              },
        ),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Erro ao gerar')
      const content: string = payload.data?.content || ''
      if (!content.trim()) throw new Error('Plano gerado vazio. Tente novamente.')

      clearInterval(pi); clearInterval(pp); setProgress(100)
      let cur = 0
      const ti = setInterval(() => {
        cur += 150
        if (cur >= content.length) {
          clearInterval(ti); setGenerated(content); setLoading(false)
          showToast(planKind === 'pei' ? 'PEI gerado! Revise, copie ou baixe em PDF.' : 'Plano gerado! Edite, copie ou baixe em PDF.')
        } else {
          setGenerated(content.slice(0, cur) + ' ▌')
          const ta = document.getElementById('po-nac') as HTMLTextAreaElement | null
          if (ta) ta.scrollTop = ta.scrollHeight
        }
      }, 15)
    } catch (error) {
      clearInterval(pi); clearInterval(pp); setLoading(false)
      showToast(error instanceof Error ? error.message : 'Erro ao gerar plano')
    }
  }

  function copyPlan() {
    if (!generated) return
    navigator.clipboard.writeText(generated)
      .then(() => showToast('Plano copiado!'))
      .catch(() => showToast('Não foi possível copiar.'))
  }

  async function downloadPdf(layout: PdfLayout) {
    const text = normalizePdfText(generated)
    if (!text.trim()) { showToast('Gere o plano primeiro.'); return }
    setShowPdfModal(false)
    const title = normalizePdfText(form.title || 'plano')
    const safeTitle = normalizeText(title).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pw = doc.internal.pageSize.getWidth()
    const ph = doc.internal.pageSize.getHeight()
    const mx = 18
    const cw = pw - mx * 2
    let y = 0

    const C = {
      risografico:  { bg: [250,245,227] as [number,number,number], accent: [229,57,75]  as [number,number,number], body: [0,0,0]       as [number,number,number], muted: [110,105,95]  as [number,number,number] },
      institucional:{ bg: [255,255,255] as [number,number,number], accent: [45,64,160]  as [number,number,number], body: [0,0,0]       as [number,number,number], muted: [90,90,110]   as [number,number,number] },
      simples:      { bg: [255,255,255] as [number,number,number], accent: [0,0,0]      as [number,number,number], body: [0,0,0]       as [number,number,number], muted: [100,100,100] as [number,number,number] },
      verde:        { bg: [240,248,243] as [number,number,number], accent: [34,120,70]  as [number,number,number], body: [18,45,28]    as [number,number,number], muted: [80,120,95]   as [number,number,number] },
      colorido:     { bg: [255,250,242] as [number,number,number], accent: [220,100,30] as [number,number,number], body: [40,25,10]    as [number,number,number], muted: [140,100,65]  as [number,number,number] },
      noturno:      { bg: [22,24,35]    as [number,number,number], accent: [120,170,255]as [number,number,number], body: [230,235,245] as [number,number,number], muted: [150,155,175] as [number,number,number] },
    }[layout]

    const nivelLabel = nivel ? NIVEL_CONFIG[nivel].label : 'BNCC'

    function bg() { doc.setFillColor(...C.bg); doc.rect(0,0,pw,ph,'F') }
    function rule(x1:number,y1:number,x2:number,y2:number,w=0.25,c=C.accent){doc.setDrawColor(...c);doc.setLineWidth(w);doc.line(x1,y1,x2,y2)}

    function addPageIfNeeded(h=10) {
      if (y+h<=ph-20) return
      doc.addPage(); bg(); y=18
      if (layout==='institucional') drawInstitutionalBand(false)
    }

    function addWrapped(str:string,opts?:{size?:number;bold?:boolean;indent?:number;color?:[number,number,number]}) {
      const size=opts?.size??9; const indent=opts?.indent??0; const lh=size*0.43
      doc.setFont('helvetica',opts?.bold?'bold':'normal'); doc.setFontSize(size)
      doc.setTextColor(...(opts?.color??C.body))
      const lines=doc.splitTextToSize(str,cw-indent)
      for (const l of lines) { addPageIfNeeded(lh+1); doc.text(l,mx+indent,y); y+=lh }
      y+=1.5
    }

    function drawRisoHeader(first:boolean) {
      doc.setTextColor(...C.accent); doc.setFont('helvetica','bold'); doc.setFontSize(first?14:9)
      doc.text('PLANO DE AULA',mx,y)
      doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...C.body)
      doc.text(`BNCC — ${nivelLabel}`,mx,y+5)
      rule(mx,y+8,pw-mx,y+8,0.4,C.accent); y+=first?16:13
    }
    function addRisoSection(t:string) {
      addPageIfNeeded(14); y+=2
      rule(mx,y-2,pw-mx,y-2,0.5,C.accent)
      doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(...C.accent)
      doc.text(t.toUpperCase(),mx,y+2.5)
      rule(mx,y+5.5,pw-mx,y+5.5,0.5,C.accent); y+=11
    }

    function drawInstitutionalBand(first:boolean) {
      if (first) {
        doc.setFillColor(...C.accent); doc.rect(0,0,pw,22,'F')
        doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(13)
        doc.text('PLANO DE AULA',mx,13)
        doc.setFont('helvetica','normal'); doc.setFontSize(8)
        doc.text(`BNCC — ${nivelLabel}`,pw-mx,15,{align:'right'}); y=28
      } else {
        doc.setFillColor(...C.accent); doc.rect(0,0,pw,10,'F')
        doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(8)
        doc.text(`PLANO DE AULA — BNCC ${nivelLabel}`,mx,7); y=16
      }
    }
    function addInstitutionalSection(t:string) {
      addPageIfNeeded(14); y+=3
      doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(...C.accent)
      doc.text(t.toUpperCase(),mx,y); rule(mx,y+2,pw-mx,y+2,0.4,[200,200,200]); y+=8
    }

    function drawSimplesHeader() {
      rule(mx,y,pw-mx,y,0.6,C.body); y+=5
      doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...C.muted)
      doc.text(`BNCC — ${nivelLabel}`,mx,y); y+=6
    }
    function addSimplesSection(t:string) {
      addPageIfNeeded(12); y+=4
      doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(...C.body)
      doc.text(t.toUpperCase(),mx,y); y+=5; rule(mx,y-1.5,pw-mx,y-1.5,0.2,C.muted)
    }

    function drawVerdeHeader(first:boolean) {
      doc.setFillColor(...C.accent); doc.rect(mx-2,y-4,8,8,'F')
      doc.setTextColor(...C.accent); doc.setFont('helvetica','bold'); doc.setFontSize(first?13:9)
      doc.text('PLANO DE AULA',mx+8,y); y+=6
      doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...C.muted)
      doc.text(`BNCC — ${nivelLabel}`,mx+8,y); rule(mx,y+4,pw-mx,y+4,0.5,C.accent); y+= first?12:10
    }
    function addVerdeSection(t:string) {
      addPageIfNeeded(14); y+=3
      doc.setFillColor(...C.accent); doc.rect(mx,y-3,3,8,'F')
      doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(...C.accent)
      doc.text(t.toUpperCase(),mx+6,y+2); y+=10
    }

    function drawColoridoHeader(first:boolean) {
      if (first) {
        doc.setFillColor(...C.accent); doc.rect(0,0,pw,20,'F')
        doc.setFillColor(255,255,255); doc.rect(0,20,pw,3,'F')
        doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(13)
        doc.text('PLANO DE AULA',mx,12)
        doc.setFont('helvetica','normal'); doc.setFontSize(8)
        doc.text(`BNCC — ${nivelLabel}`,pw-mx,14,{align:'right'}); y=30
      } else {
        doc.setFillColor(...C.accent); doc.rect(0,0,pw,10,'F')
        doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(8)
        doc.text(`PLANO DE AULA — BNCC ${nivelLabel}`,mx,7); y=16
      }
    }
    function addColoridoSection(t:string) {
      addPageIfNeeded(14); y+=3
      doc.setFillColor(...C.accent)
      const sw = doc.getTextWidth(t.toUpperCase())*1.1+8
      doc.rect(mx,y-4,sw,8,'F')
      doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(255,255,255)
      doc.text(t.toUpperCase(),mx+4,y+1); y+=10
    }

    function drawNoturnoHeader(first:boolean) {
      rule(mx,y,pw-mx,y,0.6,C.accent); y+=6
      doc.setFont('helvetica','bold'); doc.setFontSize(first?13:8); doc.setTextColor(...C.accent)
      doc.text('PLANO DE AULA',mx,y); y+=5
      doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...C.muted)
      doc.text(`BNCC — ${nivelLabel}`,mx,y); rule(mx,y+4,pw-mx,y+4,0.3,C.muted); y+=first?12:10
    }
    function addNoturnoSection(t:string) {
      addPageIfNeeded(14); y+=4
      rule(mx,y-2,pw-mx,y-2,0.4,C.accent)
      doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(...C.accent)
      doc.text(t.toUpperCase(),mx,y+3); rule(mx,y+6,pw-mx,y+6,0.2,C.muted); y+=12
    }

    bg(); y=18
    if (layout==='risografico') drawRisoHeader(true)
    else if (layout==='institucional') drawInstitutionalBand(true)
    else if (layout==='verde') drawVerdeHeader(true)
    else if (layout==='colorido') drawColoridoHeader(true)
    else if (layout==='noturno') drawNoturnoHeader(true)
    else drawSimplesHeader()

    doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.setTextColor(...C.body)
    doc.text(title.toUpperCase(),mx,y,{maxWidth:cw}); y+=10

    const addSection =
      layout==='risografico'   ? addRisoSection :
      layout==='institucional' ? addInstitutionalSection :
      layout==='verde'         ? addVerdeSection :
      layout==='colorido'      ? addColoridoSection :
      layout==='noturno'       ? addNoturnoSection :
      addSimplesSection

    addSection('Identificação')
    addWrapped(`Professor(a): ${normalizePdfText(form.teacher||'Não informado')}`)
    addWrapped(`Escola: ${normalizePdfText(form.school||'Não informada')}`)
    addWrapped(`Ano/Turma: ${normalizePdfText(form.grade_level||'-')} | Componente: ${normalizePdfText(form.subject||'-')}`)
    addWrapped(`Data: ${form.date||new Date().toLocaleDateString('pt-BR')} | Duração: ${normalizePdfText(form.duration||'-')}`)

    const sectionNames = new Set(['OBJETIVOS','HABILIDADES DA BNCC','CONTEUDOS','CONTEÚDOS','METODOLOGIA','DESENVOLVIMENTO DA AULA','DESENVOLVIMENTO','RECURSOS DIDÁTICOS','RECURSOS DIDATICOS','RECURSOS','AVALIAÇÃO','AVALIACAO','OBSERVAÇÕES','OBSERVACOES','REFERÊNCIAS','REFERENCIAS'])
    const skipHeadings = new Set(['PLANO DE AULA',title.toUpperCase(),'IDENTIFICAÇÃO','IDENTIFICACAO'])

    text.split('\n').forEach((rawLine) => {
      const lineText = rawLine.trim()
      if (!lineText) { y+=1.8; return }
      if (skipHeadings.has(lineText.toUpperCase())) return
      if (lineText.includes('BNCC') && lineText.includes('Curricular')) return
      const upper = lineText.toUpperCase().replace(/[^\wÀ-ÿ ]/g,'')
      if (sectionNames.has(upper)) { addSection(lineText); return }
      if (lineText.endsWith(':') || /^(Objetivo geral|Objetivos|Momento inicial|Desenvolvimento|Encerramento)/i.test(lineText)) {
        addWrapped(lineText,{bold:true}); return
      }
      if (lineText.startsWith('- ')) { addWrapped(`- ${lineText.slice(2)}`,{indent:3}); return }
      addWrapped(lineText)
    })

    const totalPdfPages = doc.getNumberOfPages()
    for (let p=1;p<=totalPdfPages;p++) {
      doc.setPage(p)
      if (layout==='institucional' || layout==='colorido') {
        doc.setFillColor(...C.accent); doc.rect(0,ph-10,pw,10,'F')
        doc.setTextColor(255,255,255); doc.setFont('helvetica','normal'); doc.setFontSize(7.5)
        doc.text(`Página ${p} de ${totalPdfPages}`,pw/2,ph-3.5,{align:'center'})
      } else {
        rule(mx,ph-14,pw-mx,ph-14,0.3,C.accent)
        doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...C.muted)
        doc.text(`BNCC ${nivelLabel} — Página ${p} de ${totalPdfPages}`,mx,ph-8)
        doc.text(new Date().toLocaleDateString('pt-BR'),pw-mx,ph-8,{align:'right'})
      }
    }
    doc.save(`plano-${safeTitle}-${layout}.pdf`)
    showToast('PDF baixado com sucesso!')
  }

  return (
    <main>
      {message && <div id="toast" className="show" role="alert">{message}</div>}

      {/* ── Tutorial ── */}
      {showTutorial && (
        <div className="mbk tut-bk" onClick={closeTutorial}>
          <div className="mdl tut-mdl" onClick={(e) => e.stopPropagation()}>
            <button className="mdl-close" onClick={closeTutorial}>×</button>
            <div className="tut-dots">
              {NAC_TUTORIAL_STEPS.map((_, i) => (
                <button
                  key={i}
                  className={`tut-dot ${i === tutorialStep ? 'on' : i < tutorialStep ? 'done' : ''}`}
                  onClick={() => setTutorialStep(i)}
                  aria-label={`Ir para passo ${i + 1}`}
                />
              ))}
            </div>
            <div className="tut-icon" style={NAC_TUTORIAL_STEPS[tutorialStep].iconStyle}>
              {NAC_TUTORIAL_STEPS[tutorialStep].icon}
            </div>
            <div className="tut-step">Passo {tutorialStep + 1} de {NAC_TUTORIAL_STEPS.length}</div>
            <h2 className="tut-title">{NAC_TUTORIAL_STEPS[tutorialStep].title}</h2>
            <p className="tut-body">{NAC_TUTORIAL_STEPS[tutorialStep].body}</p>
            {NAC_TUTORIAL_STEPS[tutorialStep].tip && (
              <p className="tut-tip">
                Clique em <span className="tut-navmock">{NAC_TUTORIAL_STEPS[tutorialStep].tip}</span> no menu do topo
              </p>
            )}
            <div className="tut-actions">
              {tutorialStep > 0 && (
                <button className="btn btn-out" onClick={() => setTutorialStep(tutorialStep - 1)}>← Anterior</button>
              )}
              {tutorialStep < NAC_TUTORIAL_STEPS.length - 1 ? (
                <button className="btn btn-pri" onClick={() => setTutorialStep(tutorialStep + 1)}>Próximo →</button>
              ) : (
                <button className="btn btn-pri" onClick={closeTutorial}>Entendido! ✓</button>
              )}
            </div>
            <button className="tut-skip" onClick={closeTutorial}>Pular tutorial</button>
          </div>
        </div>
      )}

      {/* ── Popup seletor de nível ── */}
      {!nivel && (
        <div className="bnac-nivel-bk">
          <div className="bnac-nivel-mdl">
            <div className="bnac-nivel-hd">
              <div className="bnac-nivel-logo">
                <div className="logo-ic" style={{ background: 'var(--blue)', transform: 'rotate(-2deg)' }} />
              </div>
              <h1 className="bnac-nivel-title">BNCC Nacional</h1>
              <p className="bnac-nivel-sub">Para qual etapa de ensino você quer criar planos de aula?</p>
            </div>
            <div className="bnac-nivel-cards">
              {(Object.entries(NIVEL_CONFIG) as [Nivel, typeof NIVEL_CONFIG[Nivel]][]).map(([key, nc]) => (
                <button key={key} className="bnac-nivel-card" onClick={() => setNivel(key)} style={{ '--nivel-accent': nc.accentVar } as React.CSSProperties}>
                  <span className="bnac-nivel-card-icon">{nc.icon}</span>
                  <span className="bnac-nivel-card-label">{nc.label}</span>
                  <span className="bnac-nivel-card-sub">{nc.sub}</span>
                  <span className="bnac-nivel-card-count">{nc.count.toLocaleString('pt-BR')} habilidades</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal PDF layout ── */}
      {showPdfModal && (
        <div className="mbk" onClick={() => setShowPdfModal(false)}>
          <div className="bnac-pdf-mdl" onClick={(e) => e.stopPropagation()}>
            <div className="bnac-pdf-mdl-hd">
              <span>Escolha o layout do PDF</span>
              <button onClick={() => setShowPdfModal(false)} aria-label="Fechar">×</button>
            </div>
            <div className="bnac-pdf-layouts">
              {PDF_LAYOUTS.map((l) => (
                <button key={l.id} className="bnac-pdf-layout-card" onClick={() => downloadPdf(l.id)}>
                  <div className={`bnac-pdf-preview bnac-pdf-preview--${l.id}`}>
                    <div className="bpp-header" />
                    <div className="bpp-line" />
                    <div className="bpp-line bpp-line--short" />
                    <div className="bpp-section" />
                    <div className="bpp-line" />
                    <div className="bpp-line bpp-line--med" />
                    <div className="bpp-line" />
                  </div>
                  <div className="bnac-pdf-layout-info">
                    <span className="bnac-pdf-layout-name">{l.label}</span>
                    <span className="bnac-pdf-layout-desc">{l.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {nivel && (
        <>
          {/* ── Header ── */}
          <header id="hdr">
            <div className="hdr-in">
              <div className="logo">
                <div className="logo-ic" style={{ background: cfg!.accentVar }}>BN</div>
                <div>
                  <div className="logo-t">BNCC Nacional</div>
                  <div className="logo-s">{cfg!.label} · Base Nacional Comum Curricular</div>
                </div>
              </div>
              <nav className="hdr-nav" aria-label="Navegação">
                <button className={`nb ${view === 'skills' ? 'on' : ''}`} onClick={() => setView('skills')}>Pesquisar</button>
                <button className={`nb ${view === 'plan' ? 'on' : ''}`} onClick={() => setView('plan')}>
                  Plano <span className="nbadge">{selected.length}</span>
                </button>
                <button className="nb" onClick={() => setNivel(null)} title="Trocar etapa de ensino">
                  {cfg!.icon} Trocar etapa
                </button>
                <button className="nb tut-open" onClick={() => { setTutorialStep(0); setShowTutorial(true) }} aria-label="Abrir tutorial">?</button>
              </nav>
            </div>
          </header>

          {/* ── View: Pesquisar ── */}
          {view === 'skills' && (
            <section className="pg">
              <div className="bnac-hero" style={{ '--hero-accent': cfg!.accentVar } as React.CSSProperties}>
                <div className="bnac-hero-badge" style={{ background: cfg!.accentVar }}>{cfg!.icon} {cfg!.label}</div>
                <h1 className="bnac-title">Base Nacional Comum Curricular</h1>
                <p className="bnac-sub">
                  {skills.length > 0
                    ? `${skills.length.toLocaleString('pt-BR')} habilidades · ${disciplinas.length} ${cfg!.disciplinaLabel.toLowerCase()}s`
                    : 'Carregando habilidades...'}
                </p>
              </div>

              <div className="fbar">
                <div className="sw">
                  <span className="sw-icon">⌕</span>
                  <input type="search" placeholder="Pesquisar por código ou habilidade" value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
                <select value={disciplina} onChange={(e) => setDisciplina(e.target.value)} aria-label={`Filtrar por ${cfg!.disciplinaLabel}`}>
                  <option value="">{cfg!.disciplinaLabel === 'Disciplina' ? 'Todas as disciplinas' : `Todos os ${cfg!.disciplinaLabel.toLowerCase()}s`}</option>
                  {disciplinas.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={ano} onChange={(e) => setAno(e.target.value)} aria-label="Filtrar por ano">
                  <option value="">Todos os anos</option>
                  {anos.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                {cfg!.hasUnidade && (
                  <select value={unidade} onChange={(e) => setUnidade(e.target.value)} aria-label="Filtrar por unidade temática" disabled={!disciplina}>
                    <option value="">Unidades temáticas</option>
                    {unidades.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                )}
                <span className="fcount">
                  {filtered.length === 0 ? '0 resultados'
                    : `${(page-1)*PAGE_SIZE+1}–${Math.min(page*PAGE_SIZE, filtered.length)} de ${filtered.length}`}
                </span>
              </div>

              <div className="grid">
                {paged.map((skill) => {
                  const isSel = selected.includes(skill.id)
                  return (
                    <article className={`scard bnac-card ${isSel ? 'in-plan' : ''}`} key={skill.id}>
                      <div className="ctags">
                        <span className={`tag ${discColor[skill.disciplina] || 'tm'}`}>{skill.disciplina}</span>
                        <span className="tag ta">{skill.ano}</span>
                      </div>
                      {skill.code && <div className="ceixo">{skill.code}</div>}
                      {skill.unidade_tematica && <h2 className="cobj">{skill.unidade_tematica}</h2>}
                      <p className="chab">{skill.habilidade}</p>
                      {expanded === skill.id && skill.objeto_conhecimento && (
                        <p className="bnac-objeto"><strong>Objeto:</strong> {skill.objeto_conhecimento}</p>
                      )}
                      <div className="cacts">
                        {skill.objeto_conhecimento && (
                          <button className="bsm bdet" onClick={() => setExpanded(expanded === skill.id ? null : skill.id)}>
                            {expanded === skill.id ? 'Fechar' : 'Detalhes'}
                          </button>
                        )}
                        <button
                          className={`bsm badd ${isSel ? 'added' : ''}`}
                          onClick={() => {
                            toggleSkill(skill.id)
                            if (!isSel) showToast(`"${skill.code || skill.disciplina}" adicionada ao plano.`)
                          }}
                        >
                          {isSel ? 'Remover' : '+ Plano'}
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>

              {skills.length === 0 && (
                <div className="bnac-loading"><div className="bnac-spinner" /><p>Carregando habilidades...</p></div>
              )}
              {skills.length > 0 && filtered.length === 0 && (
                <div className="bnac-empty">
                  <p>Nenhuma habilidade encontrada.</p>
                  <button className="bsm bdet" onClick={() => { setQuery(''); setDisciplina(''); setAno(''); setUnidade('') }}>Limpar filtros</button>
                </div>
              )}

              {totalPages > 1 && (
                <nav className="pg-nav" aria-label="Paginação">
                  <button className="pg-btn" onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page===1}>‹</button>
                  {(() => {
                    const items: (number|'ellipsis')[] = []
                    if (totalPages<=7) { for (let i=1;i<=totalPages;i++) items.push(i) }
                    else {
                      items.push(1)
                      if (page>3) items.push('ellipsis')
                      for (let i=Math.max(2,page-1);i<=Math.min(totalPages-1,page+1);i++) items.push(i)
                      if (page<totalPages-2) items.push('ellipsis')
                      items.push(totalPages)
                    }
                    return items.map((item,idx) =>
                      item==='ellipsis'
                        ? <span key={`e${idx}`} className="pg-ellipsis">…</span>
                        : <button key={item} className={`pg-btn${page===item?' active':''}`} onClick={() => setPage(item)}>{item}</button>
                    )
                  })()}
                  <button className="pg-btn" onClick={() => setPage((p) => Math.min(totalPages, p+1))} disabled={page===totalPages}>›</button>
                </nav>
              )}

              {selected.length > 0 && (
                <div className="bnac-fab" onClick={() => setView('plan')} role="button" tabIndex={0} onKeyDown={(e) => e.key==='Enter' && setView('plan')}>
                  <span className="bnac-fab-count">{selected.length}</span>
                  Criar plano de aula →
                </div>
              )}
            </section>
          )}

          {/* ── View: Plano ── */}
          {view === 'plan' && (
            <section className="pg play">
              <div>
                <div className="stbar">
                  <div className="sti active"><span className="stn">1</span><span className="stl">Dados do plano</span></div>
                  <div className={`sti ${selected.length ? 'done' : ''}`}><span className="stn">2</span><span className="stl">Habilidades BNCC</span></div>
                  <div className={`sti ${generated ? 'done' : ''}`}><span className="stn">3</span><span className="stl">Plano gerado</span></div>
                </div>

                <div className="pc">
                  <h1 className="pct">Criar plano de aula</h1>
                  <SectionLabel>Identificação</SectionLabel>
                  <PeiControls
                    user={user}
                    school={form.school}
                    planKind={planKind}
                    selectedStudentId={selectedStudentId}
                    onPlanKindChange={setPlanKind}
                    onStudentChange={(studentId, student) => {
                      setSelectedStudentId(studentId)
                      setSelectedStudent(student || null)
                    }}
                  />
                  <div className="fg">
                    <Field label="Professor(a)"><input value={form.teacher} onChange={(e) => updateForm('teacher', e.target.value)} placeholder="Nome completo" /></Field>
                    <Field label="Escola"><input value={form.school} onChange={(e) => updateForm('school', e.target.value)} placeholder="Nome da escola" /></Field>
                    <Field label="Ano / Turma"><input value={form.grade_level} onChange={(e) => updateForm('grade_level', e.target.value)} placeholder="Ex.: 5º ano A" /></Field>
                    <Field label="Componente curricular"><input value={form.subject} onChange={(e) => updateForm('subject', e.target.value)} placeholder="Ex.: Matemática" /></Field>
                    <Field label="Data da aula"><input type="date" value={form.date} onChange={(e) => updateForm('date', e.target.value)} /></Field>
                    <Field label="Duração"><input value={form.duration} onChange={(e) => updateForm('duration', e.target.value)} /></Field>
                  </div>
                  <hr className="dv" />
                  <SectionLabel>Conteúdo da aula</SectionLabel>
                  <div className="fg">
                    <Field label="Tema da aula" wide required><input value={form.title} onChange={(e) => updateForm('title', e.target.value)} placeholder="Ex.: Frações no cotidiano" /></Field>
                    <Field label="Objetivos do professor" wide><textarea rows={3} value={form.objectives} onChange={(e) => updateForm('objectives', e.target.value)} placeholder="O que você quer que os alunos aprendam?" /></Field>
                    <Field label="Metodologia" wide><textarea rows={2} value={form.methodology} onChange={(e) => updateForm('methodology', e.target.value)} /></Field>
                    <Field label="Recursos disponíveis" wide><textarea rows={2} value={form.materials} onChange={(e) => updateForm('materials', e.target.value)} /></Field>
                  </div>
                  <div className="pacts" style={{ marginTop: 20 }}>
                    <button className="btn btn-out" onClick={() => setView('skills')}>← Habilidades</button>
                    <button className="btn btn-pri" disabled={loading} onClick={generatePlan}>{loading ? 'Gerando...' : '✦ Gerar plano com IA'}</button>
                  </div>
                </div>

                <div className="oa">
                  <div className="oa-toolbar">
                    <div className="bnac-view-toggle">
                      <button className={`bnac-vt-btn${viewMode==='edit'?' on':''}`} onClick={() => setViewMode('edit')}>Editar</button>
                      <button className={`bnac-vt-btn${viewMode==='preview'?' on':''}`} onClick={() => setViewMode('preview')} disabled={!generated}>Visualizar</button>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button className="btn btn-gh" onClick={copyPlan} disabled={!generated}>Copiar</button>
                      <button className="btn btn-pri" disabled={!generated} onClick={() => { if (!generated) { showToast('Gere o plano primeiro.'); return } setShowPdfModal(true) }}>Baixar PDF</button>
                    </div>
                  </div>
                  {loading && (
                    <div className="bnac-progress-banner">
                      <div className="bnac-progress-top">
                        <span className="bnac-progress-spin" />
                        <span className="bnac-progress-phrase">{loadingPhrase}</span>
                        <span className="bnac-progress-pct">{Math.round(progress)}%</span>
                      </div>
                      <div className="bnac-progress-track"><div className="bnac-progress-fill" style={{ width:`${progress}%` }} /></div>
                    </div>
                  )}
                  {viewMode==='edit' || !generated ? (
                    <textarea id="po-nac" value={generated} onChange={(e) => setGenerated(e.target.value)} placeholder="O plano gerado aparecerá aqui. Você pode editar antes de baixar ou copiar." style={{ display: viewMode==='preview' && generated ? 'none' : undefined }} />
                  ) : (
                    <RenderedPlan text={generated} />
                  )}
                </div>
              </div>

              <aside className="sb">
                <div className="sbt">Habilidades <span className="sbc">{selected.length}</span></div>
                {selectedSkills.length ? (
                  <>
                    {selectedSkills.map((skill) => (
                      <div className="ssi" key={skill.id}>
                        <button className="ssrm" onClick={() => toggleSkill(skill.id)} aria-label="Remover">×</button>
                        <div className="ssic">{skill.code || '—'}</div>
                        <div className="ssio">{skill.unidade_tematica || skill.disciplina}</div>
                        <div className="ssims">{skill.disciplina} · {skill.ano}</div>
                      </div>
                    ))}
                    <button className="btn btn-out" style={{ width:'100%', marginTop:10 }} onClick={() => setView('skills')}>+ Adicionar mais</button>
                  </>
                ) : (
                  <div className="esel">
                    Nenhuma habilidade.{' '}
                    <button className="link-btn" onClick={() => setView('skills')}>Pesquisar</button>
                  </div>
                )}
              </aside>
            </section>
          )}
        </>
      )}
    </main>
  )
}

