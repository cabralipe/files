'use client'

import { useEffect, useMemo, useState } from 'react'

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

const emptyForm: PlanForm = {
  title: '',
  teacher: '',
  school: '',
  grade_level: '',
  subject: '',
  date: new Date().toISOString().slice(0, 10),
  duration: '50 minutos',
  methodology: 'Aprendizagem ativa',
  objectives: '',
  materials: 'Quadro, caderno, celular ou computador compartilhado',
  notes: '',
}

const PAGE_SIZE = 24

const discColor: Record<string, string> = {
  'Computação': 'tcd',
  'Língua Portuguesa': 'tp',
  'Matemática': 'tm',
  'Ciências': 'tc',
  'Arte': 'ta',
  'Língua Inglesa': 'ti',
  'História': 'th',
  'Geografia': 'tg',
  'Educação Física': 'tef',
  'Ensino Religioso': 'ter',
}

type PdfLayout = 'risografico' | 'institucional' | 'simples'

const PDF_LAYOUTS: { id: PdfLayout; label: string; desc: string }[] = [
  { id: 'risografico', label: 'Risográfico', desc: 'Fundo creme, cabeçalhos e acentos em vermelho coral. Design artesanal.' },
  { id: 'institucional', label: 'Institucional', desc: 'Cabeçalho azul, corpo branco, seções em azul. Visual formal e limpo.' },
  { id: 'simples', label: 'Simples', desc: 'Branco puro, tipografia preta, sem decoração. Ideal para impressão econômica.' },
]

function normalizeText(v: string) {
  return v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function normalizePdfText(value: string) {
  if (!value) return ''
  return value
    .replace(/\*\*/g, '')
    .replace(/Ã¡/g, 'á').replace(/Ã /g, 'à').replace(/Ã¢/g, 'â').replace(/Ã£/g, 'ã')
    .replace(/Ã©/g, 'é').replace(/Ãª/g, 'ê').replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó').replace(/Ã´/g, 'ô').replace(/Ãµ/g, 'õ').replace(/Ãº/g, 'ú')
    .replace(/Ã§/g, 'ç').replace(/Â/g, '')
    .replace(/â€"|â€"/g, '-').replace(/â€œ|â€ /g, '"').replace(/â€˜|â€™/g, "'")
    .replace(/â€¢/g, '-').replace(/�/g, '')
    .replace(/[═─━─╴╶╸╺╼╾◽◾]/g, '-').replace(/[▌▋▊▉█■]/g, '')
    .replace(/[🧠📚🔍💡✏️🎨🧩🎭🛠️📊⚙️✨⚡💡🎓🏫📝✏️💻🚀⭐🏷️📅⏰🕒🗒️📌]/g, '')
}

function Field({ label, children, wide, required }: { label: string; children: React.ReactNode; wide?: boolean; required?: boolean }) {
  return (
    <label className={`fgr${wide ? ' s2' : ''}`}>
      <span className="fl">{label}{required && <span className="req">*</span>}</span>
      {children}
    </label>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="bnac-form-section">{children}</div>
}

export default function BnccNacionalPage() {
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
  const [generated, setGenerated] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingPhrase, setLoadingPhrase] = useState('🧠 Pensando no plano...')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [showPdfModal, setShowPdfModal] = useState(false)

  useEffect(() => {
    fetch('/bncc-nacional-skills.json')
      .then((r) => r.json())
      .then(setSkills)
  }, [])

  useEffect(() => { setPage(1) }, [query, disciplina, ano, unidade])
  useEffect(() => { setUnidade('') }, [disciplina])

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
      const text = normalizeText(`${s.code} ${s.habilidade} ${s.disciplina} ${s.unidade_tematica} ${s.objeto_conhecimento}`)
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

  const selectedSkills = useMemo(
    () => skills.filter((s) => selected.includes(s.id)),
    [skills, selected],
  )

  async function generatePlan() {
    if (!form.title.trim()) { showToast('Informe o tema do plano.'); return }
    if (!selected.length) { showToast('Selecione ao menos uma habilidade.'); return }

    const phrases = [
      '🧠 Analisando as habilidades selecionadas...',
      '📚 Consultando as diretrizes da BNCC...',
      '💡 Formulando objetivos didáticos...',
      '✏️ Estruturando os momentos da aula...',
      '🧩 Decompondo conceitos em atividades simples...',
      '🛠️ Selecionando recursos pedagógicos...',
      '📊 Definindo critérios de avaliação...',
      '⚡ Conectando com IA para gerar o plano...',
      '📝 Rascunhando o passo a passo...',
      '🎨 Refinando a estrutura do conteúdo...',
      '✨ Dando os últimos retoques...',
    ]

    setLoading(true)
    setProgress(0)
    setLoadingPhrase(phrases[0])

    let currentProgress = 0
    const progressInterval = setInterval(() => {
      currentProgress += currentProgress < 40 ? 1.0 : currentProgress < 75 ? 0.35 : currentProgress < 90 ? 0.15 : 0.07
      setProgress(Math.min(currentProgress, 97))
    }, 200)

    let phraseIndex = 0
    const phraseInterval = setInterval(() => {
      phraseIndex = (phraseIndex + 1) % phrases.length
      setLoadingPhrase(phrases[phraseIndex])
    }, 2200)

    try {
      const response = await fetch('/api/bncc-nacional/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          skills: selectedSkills.map((s) => ({
            code: s.code,
            disciplina: s.disciplina,
            unidade_tematica: s.unidade_tematica,
            objeto_conhecimento: s.objeto_conhecimento,
            habilidade: s.habilidade,
          })),
        }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Erro ao gerar')

      const content: string = payload.data?.content || ''
      if (!content.trim()) throw new Error('Plano gerado vazio. Tente novamente.')

      clearInterval(progressInterval)
      clearInterval(phraseInterval)
      setProgress(100)

      const fullText = content
      let currentLength = 0
      const typingInterval = setInterval(() => {
        currentLength += 150
        if (currentLength >= fullText.length) {
          clearInterval(typingInterval)
          setGenerated(fullText)
          setLoading(false)
          showToast('Plano gerado! Edite, copie ou baixe em PDF.')
        } else {
          setGenerated(fullText.slice(0, currentLength) + ' ▌')
          const ta = document.getElementById('po-nac') as HTMLTextAreaElement | null
          if (ta) ta.scrollTop = ta.scrollHeight
        }
      }, 15)
    } catch (error) {
      clearInterval(progressInterval)
      clearInterval(phraseInterval)
      setLoading(false)
      showToast(error instanceof Error ? error.message : 'Erro ao gerar plano')
    }
  }

  function copyPlan() {
    if (!generated) return
    navigator.clipboard.writeText(generated).then(() => showToast('Plano copiado!')).catch(() => showToast('Não foi possível copiar.'))
  }

  async function downloadPdf(layout: PdfLayout) {
    const text = normalizePdfText(generated)
    if (!text.trim()) { showToast('Gere o plano antes de baixar em PDF.'); return }

    setShowPdfModal(false)
    const title = normalizePdfText(form.title || 'plano')
    const safeTitle = normalizeText(title).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const marginX = 18
    const contentWidth = pageWidth - marginX * 2
    let y = 0

    // ── colour tokens per layout ──────────────────────────────────────
    const C = {
      risografico: { bg: [250, 245, 227] as [number,number,number], accent: [229, 57, 75] as [number,number,number], title: [229, 57, 75] as [number,number,number], body: [0, 0, 0] as [number,number,number], muted: [110, 105, 95] as [number,number,number] },
      institucional: { bg: [255, 255, 255] as [number,number,number], accent: [45, 64, 160] as [number,number,number], title: [45, 64, 160] as [number,number,number], body: [0, 0, 0] as [number,number,number], muted: [90, 90, 110] as [number,number,number] },
      simples: { bg: [255, 255, 255] as [number,number,number], accent: [0, 0, 0] as [number,number,number], title: [0, 0, 0] as [number,number,number], body: [0, 0, 0] as [number,number,number], muted: [100, 100, 100] as [number,number,number] },
    }[layout]

    function drawBg() {
      doc.setFillColor(...C.bg)
      doc.rect(0, 0, pageWidth, pageHeight, 'F')
    }

    function rule(x1: number, y1: number, x2: number, y2: number, w = 0.25, color = C.accent) {
      doc.setDrawColor(...color)
      doc.setLineWidth(w)
      doc.line(x1, y1, x2, y2)
    }

    function addPageIfNeeded(h = 10) {
      if (y + h <= pageHeight - 20) return
      doc.addPage()
      drawBg()
      y = 18
      if (layout === 'institucional') drawInstitutionalBand(false)
    }

    function addWrapped(str: string, opts?: { size?: number; bold?: boolean; indent?: number; color?: [number, number, number] }) {
      const size = opts?.size ?? 9
      const indent = opts?.indent ?? 0
      const lh = size * 0.43
      doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal')
      doc.setFontSize(size)
      doc.setTextColor(...(opts?.color ?? C.body))
      const lines = doc.splitTextToSize(str, contentWidth - indent)
      for (const l of lines) {
        addPageIfNeeded(lh + 1)
        doc.text(l, marginX + indent, y)
        y += lh
      }
      y += 1.5
    }

    // ── Layout: Risográfico ───────────────────────────────────────────
    function drawRisoHeader(first: boolean) {
      doc.setTextColor(...C.accent)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(first ? 14 : 9)
      doc.text(first ? 'PLANO DE AULA' : 'Plano de aula', marginX, y)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...C.body)
      doc.text('BNCC Nacional — Base Nacional Comum Curricular', marginX, y + 5)
      rule(marginX, y + 8, pageWidth - marginX, y + 8, 0.4, C.accent)
      y += first ? 16 : 13
    }

    function addRisoSection(t: string) {
      addPageIfNeeded(14)
      y += 2
      rule(marginX, y - 2, pageWidth - marginX, y - 2, 0.5, C.accent)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(...C.accent)
      doc.text(t.toUpperCase(), marginX, y + 2.5)
      rule(marginX, y + 5.5, pageWidth - marginX, y + 5.5, 0.5, C.accent)
      y += 11
    }

    // ── Layout: Institucional ─────────────────────────────────────────
    function drawInstitutionalBand(first: boolean) {
      if (first) {
        doc.setFillColor(...C.accent)
        doc.rect(0, 0, pageWidth, 22, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(13)
        doc.text('PLANO DE AULA', marginX, 13)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.text('BNCC Nacional — Base Nacional Comum Curricular', pageWidth - marginX, 15, { align: 'right' })
        y = 28
      } else {
        doc.setFillColor(...C.accent)
        doc.rect(0, 0, pageWidth, 10, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.text('PLANO DE AULA — BNCC Nacional', marginX, 7)
        y = 16
      }
    }

    function addInstitutionalSection(t: string) {
      addPageIfNeeded(14)
      y += 3
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(...C.accent)
      doc.text(t.toUpperCase(), marginX, y)
      rule(marginX, y + 2, pageWidth - marginX, y + 2, 0.4, [200, 200, 200])
      y += 8
    }

    // ── Layout: Simples ───────────────────────────────────────────────
    function drawSimplesHeader() {
      rule(marginX, y, pageWidth - marginX, y, 0.6, C.body)
      y += 5
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...C.muted)
      doc.text('BNCC Nacional — Base Nacional Comum Curricular', marginX, y)
      y += 6
    }

    function addSimplesSection(t: string) {
      addPageIfNeeded(12)
      y += 4
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...C.body)
      doc.text(t.toUpperCase(), marginX, y)
      y += 5
      rule(marginX, y - 1.5, pageWidth - marginX, y - 1.5, 0.2, C.muted)
    }

    // ── Render ────────────────────────────────────────────────────────
    drawBg()
    y = 18

    if (layout === 'risografico') {
      drawRisoHeader(true)
    } else if (layout === 'institucional') {
      drawInstitutionalBand(true)
    } else {
      drawSimplesHeader()
    }

    // Title
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(layout === 'simples' ? 16 : 13)
    doc.setTextColor(...(layout === 'risografico' ? C.body : C.body))
    doc.text(title.toUpperCase(), marginX, y, { maxWidth: contentWidth })
    y += 10

    // Identification block
    const addSection = layout === 'risografico' ? addRisoSection : layout === 'institucional' ? addInstitutionalSection : addSimplesSection

    addSection('Identificação')
    addWrapped(`Professor(a): ${normalizePdfText(form.teacher || 'Não informado')}`)
    addWrapped(`Escola: ${normalizePdfText(form.school || 'Não informada')}`)
    addWrapped(`Ano/Turma: ${normalizePdfText(form.grade_level || '-')} | Componente: ${normalizePdfText(form.subject || '-')}`)
    addWrapped(`Data: ${form.date || new Date().toLocaleDateString('pt-BR')} | Duração: ${normalizePdfText(form.duration || '-')}`)

    // Content body
    const sectionNames = new Set([
      'OBJETIVOS', 'HABILIDADES DA BNCC', 'CONTEUDOS', 'CONTEÚDOS',
      'METODOLOGIA', 'DESENVOLVIMENTO DA AULA', 'DESENVOLVIMENTO',
      'RECURSOS DIDÁTICOS', 'RECURSOS DIDATICOS', 'RECURSOS',
      'AVALIAÇÃO', 'AVALIACAO', 'OBSERVAÇÕES', 'OBSERVACOES',
      'REFERÊNCIAS', 'REFERENCIAS',
    ])
    const skipHeadings = new Set(['PLANO DE AULA', title.toUpperCase(), 'IDENTIFICAÇÃO', 'IDENTIFICACAO'])

    text.split('\n').forEach((rawLine) => {
      const lineText = rawLine.trim()
      if (!lineText) { y += 1.8; return }

      const upper = lineText.toUpperCase().replace(/[^\wÀ-ÿ ]/g, '')
      if (skipHeadings.has(lineText.toUpperCase())) return
      if (lineText.includes('BNCC Nacional') && lineText.includes('Curricular')) return

      if (sectionNames.has(upper)) { addSection(lineText); return }

      if (lineText.endsWith(':') || /^(Objetivo geral|Objetivos|Momento inicial|Desenvolvimento|Encerramento)/i.test(lineText)) {
        addWrapped(lineText, { bold: true }); return
      }
      if (lineText.startsWith('- ')) {
        addWrapped(`- ${lineText.slice(2)}`, { indent: 3 }); return
      }
      addWrapped(lineText)
    })

    // Footer on all pages
    const totalPdfPages = doc.getNumberOfPages()
    for (let p = 1; p <= totalPdfPages; p++) {
      doc.setPage(p)
      if (layout === 'institucional') {
        doc.setFillColor(...C.accent)
        doc.rect(0, pageHeight - 10, pageWidth, 10, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.text(`Página ${p} de ${totalPdfPages}`, pageWidth / 2, pageHeight - 3.5, { align: 'center' })
      } else {
        rule(marginX, pageHeight - 14, pageWidth - marginX, pageHeight - 14, 0.3, C.accent)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(...C.muted)
        doc.text(`BNCC Nacional — Página ${p} de ${totalPdfPages}`, marginX, pageHeight - 8)
        doc.text(new Date().toLocaleDateString('pt-BR'), pageWidth - marginX, pageHeight - 8, { align: 'right' })
      }
    }

    doc.save(`plano-${safeTitle || 'aula'}-${layout}.pdf`)
    showToast('PDF baixado com sucesso!')
  }

  return (
    <main>
      {message && <div id="toast" className="show" role="alert">{message}</div>}

      {/* ── Modal seletor de layout PDF ── */}
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

      {/* ── Header ── */}
      <header id="hdr">
        <div className="hdr-in">
          <div className="logo">
            <div className="logo-ic" style={{ background: 'var(--blue)' }}>BN</div>
            <div>
              <div className="logo-t">BNCC Nacional</div>
              <div className="logo-s">Base Nacional Comum Curricular · Todas as disciplinas</div>
            </div>
          </div>
          <nav className="hdr-nav" aria-label="Navegação">
            <button className={`nb ${view === 'skills' ? 'on' : ''}`} onClick={() => setView('skills')}>
              Pesquisar
            </button>
            <button className={`nb ${view === 'plan' ? 'on' : ''}`} onClick={() => setView('plan')}>
              Plano <span className="nbadge">{selected.length}</span>
            </button>
          </nav>
        </div>
      </header>

      {/* ── View: Pesquisar ── */}
      {view === 'skills' && (
        <section className="pg">
          <div className="bnac-hero">
            <h1 className="bnac-title">Base Nacional Comum Curricular</h1>
            <p className="bnac-sub">
              {skills.length > 0
                ? `${skills.length.toLocaleString('pt-BR')} habilidades · ${disciplinas.length} disciplinas · Educação Básica completa`
                : 'Carregando habilidades...'}
            </p>
          </div>

          <div className="fbar">
            <div className="sw">
              <span className="sw-icon">⌕</span>
              <input
                type="search"
                placeholder="Pesquisar por código, habilidade, disciplina ou unidade temática"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select value={disciplina} onChange={(e) => setDisciplina(e.target.value)} aria-label="Filtrar por disciplina">
              <option value="">Todas as disciplinas</option>
              {disciplinas.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={ano} onChange={(e) => setAno(e.target.value)} aria-label="Filtrar por ano">
              <option value="">Todos os anos</option>
              {anos.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={unidade} onChange={(e) => setUnidade(e.target.value)} aria-label="Filtrar por unidade temática" disabled={!disciplina}>
              <option value="">Unidades temáticas</option>
              {unidades.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <span className="fcount">
              {filtered.length === 0
                ? '0 resultados'
                : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} de ${filtered.length}`}
            </span>
          </div>

          <div className="grid">
            {paged.map((skill) => {
              const isSelected = selected.includes(skill.id)
              return (
                <article className={`scard bnac-card ${isSelected ? 'in-plan' : ''}`} key={skill.id}>
                  <div className="ctags">
                    <span className={`tag ${discColor[skill.disciplina] || 'tm'}`}>{skill.disciplina}</span>
                    <span className="tag ta">{skill.ano}</span>
                  </div>
                  {skill.code && <div className="ceixo">{skill.code}</div>}
                  <h2 className="cobj">{skill.unidade_tematica}</h2>
                  <p className="chab">{skill.habilidade}</p>
                  {expanded === skill.id && (
                    <p className="bnac-objeto"><strong>Objeto:</strong> {skill.objeto_conhecimento}</p>
                  )}
                  <div className="cacts">
                    <button className="bsm bdet" onClick={() => setExpanded(expanded === skill.id ? null : skill.id)}>
                      {expanded === skill.id ? 'Fechar' : 'Detalhes'}
                    </button>
                    <button
                      className={`bsm badd ${isSelected ? 'added' : ''}`}
                      onClick={() => {
                        toggleSkill(skill.id)
                        if (!isSelected) showToast(`"${skill.code || skill.disciplina}" adicionada ao plano.`)
                      }}
                    >
                      {isSelected ? 'Remover' : '+ Plano'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>

          {skills.length === 0 && (
            <div className="bnac-loading">
              <div className="bnac-spinner" />
              <p>Carregando habilidades da BNCC...</p>
            </div>
          )}

          {skills.length > 0 && filtered.length === 0 && (
            <div className="bnac-empty">
              <p>Nenhuma habilidade encontrada.</p>
              <button className="bsm bdet" onClick={() => { setQuery(''); setDisciplina(''); setAno(''); setUnidade('') }}>
                Limpar filtros
              </button>
            </div>
          )}

          {totalPages > 1 && (
            <nav className="pg-nav" aria-label="Paginação">
              <button className="pg-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} aria-label="Página anterior">‹</button>
              {(() => {
                const items: (number | 'ellipsis')[] = []
                if (totalPages <= 7) {
                  for (let i = 1; i <= totalPages; i++) items.push(i)
                } else {
                  items.push(1)
                  if (page > 3) items.push('ellipsis')
                  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) items.push(i)
                  if (page < totalPages - 2) items.push('ellipsis')
                  items.push(totalPages)
                }
                return items.map((item, idx) =>
                  item === 'ellipsis'
                    ? <span key={`e${idx}`} className="pg-ellipsis">…</span>
                    : <button key={item} className={`pg-btn${page === item ? ' active' : ''}`} onClick={() => setPage(item)} aria-current={page === item ? 'page' : undefined}>{item}</button>
                )
              })()}
              <button className="pg-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Próxima página">›</button>
            </nav>
          )}

          {selected.length > 0 && (
            <div className="bnac-fab" onClick={() => setView('plan')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setView('plan')}>
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
              <div className="sti active">
                <span className="stn">1</span>
                <span className="stl">Dados do plano</span>
              </div>
              <div className={`sti ${selected.length ? 'done' : ''}`}>
                <span className="stn">2</span>
                <span className="stl">Habilidades BNCC</span>
              </div>
              <div className={`sti ${generated ? 'done' : ''}`}>
                <span className="stn">3</span>
                <span className="stl">Plano gerado</span>
              </div>
            </div>

            <div className="pc">
              <h1 className="pct">Criar plano de aula</h1>

              <SectionLabel>Identificação</SectionLabel>
              <div className="fg">
                <Field label="Professor(a)">
                  <input value={form.teacher} onChange={(e) => updateForm('teacher', e.target.value)} placeholder="Nome completo" />
                </Field>
                <Field label="Escola">
                  <input value={form.school} onChange={(e) => updateForm('school', e.target.value)} placeholder="Nome da escola" />
                </Field>
                <Field label="Ano / Turma">
                  <input value={form.grade_level} onChange={(e) => updateForm('grade_level', e.target.value)} placeholder="Ex.: 5º ano A" />
                </Field>
                <Field label="Componente curricular">
                  <input value={form.subject} onChange={(e) => updateForm('subject', e.target.value)} placeholder="Ex.: Matemática" />
                </Field>
                <Field label="Data da aula">
                  <input type="date" value={form.date} onChange={(e) => updateForm('date', e.target.value)} />
                </Field>
                <Field label="Duração">
                  <input value={form.duration} onChange={(e) => updateForm('duration', e.target.value)} placeholder="Ex.: 50 minutos" />
                </Field>
              </div>

              <hr className="dv" />
              <SectionLabel>Conteúdo da aula</SectionLabel>
              <div className="fg">
                <Field label="Tema da aula" wide required>
                  <input value={form.title} onChange={(e) => updateForm('title', e.target.value)} placeholder="Ex.: Frações no cotidiano" />
                </Field>
                <Field label="Objetivos do professor" wide>
                  <textarea rows={3} value={form.objectives} onChange={(e) => updateForm('objectives', e.target.value)} placeholder="O que você quer que os alunos aprendam?" />
                </Field>
                <Field label="Metodologia" wide>
                  <textarea rows={2} value={form.methodology} onChange={(e) => updateForm('methodology', e.target.value)} placeholder="Ex.: Aprendizagem ativa, trabalho em grupo…" />
                </Field>
                <Field label="Recursos disponíveis" wide>
                  <textarea rows={2} value={form.materials} onChange={(e) => updateForm('materials', e.target.value)} placeholder="Ex.: Quadro, caderno, celular…" />
                </Field>
              </div>

              <div className="pacts" style={{ marginTop: 20 }}>
                <button className="btn btn-out" onClick={() => setView('skills')}>← Habilidades</button>
                <button className="btn btn-pri" disabled={loading} onClick={generatePlan}>
                  {loading ? 'Gerando...' : '✦ Gerar plano com IA'}
                </button>
              </div>
            </div>

            <div className="oa">
              <div className="oa-toolbar">
                <span className="oa-label">Plano editável</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-gh" onClick={copyPlan} disabled={!generated}>Copiar</button>
                  <button
                    className="btn btn-pri"
                    disabled={!generated}
                    onClick={() => { if (!generated) { showToast('Gere o plano primeiro.'); return } setShowPdfModal(true) }}
                  >
                    Baixar PDF
                  </button>
                </div>
              </div>

              {loading && (
                <div className="bnac-progress-banner">
                  <div className="bnac-progress-top">
                    <span className="bnac-progress-spin" />
                    <span className="bnac-progress-phrase">{loadingPhrase}</span>
                    <span className="bnac-progress-pct">{Math.round(progress)}%</span>
                  </div>
                  <div className="bnac-progress-track">
                    <div className="bnac-progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              <textarea
                id="po-nac"
                value={generated}
                onChange={(e) => setGenerated(e.target.value)}
                placeholder="O plano gerado aparecerá aqui. Você pode editar o texto antes de baixar ou copiar."
              />
            </div>
          </div>

          <aside className="sb">
            <div className="sbt">
              Habilidades <span className="sbc">{selected.length}</span>
            </div>
            {selectedSkills.length ? (
              <>
                {selectedSkills.map((skill) => (
                  <div className="ssi" key={skill.id}>
                    <button className="ssrm" onClick={() => toggleSkill(skill.id)} aria-label={`Remover ${skill.code}`}>×</button>
                    <div className="ssic">{skill.code || '—'}</div>
                    <div className="ssio">{skill.unidade_tematica}</div>
                    <div className="ssims">{skill.disciplina} · {skill.ano}</div>
                  </div>
                ))}
                <button className="btn btn-out" style={{ width: '100%', marginTop: 10 }} onClick={() => setView('skills')}>
                  + Adicionar mais
                </button>
              </>
            ) : (
              <div className="esel">
                Nenhuma habilidade selecionada.{' '}
                <button className="link-btn" onClick={() => setView('skills')}>Pesquisar</button>{' '}
                para adicionar.
              </div>
            )}
          </aside>
        </section>
      )}
    </main>
  )
}
