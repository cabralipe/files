'use client'

import { supabase } from '@/lib/supabase-client'

import { useState, useMemo, useEffect } from 'react'
import Link from '@/lib/m-link'
import { useAuth } from '@/hooks/useAuth'
import { municipalSchools } from '@/lib/education-options'
import { useMunicipality } from '@/lib/municipality-context'
import PeiControls, { type PeiStudent, type PlanKind } from '@/components/PeiControls'


// ── Types ─────────────────────────────────────────────────────────────────────

type Skill = {
  code: string
  discipline: string
  year: string
  campo: string
  pratica: string
  objeto: string
  habilidade: string
  desdobramento: string
}

type PlanForm = {
  title: string
  teacher: string
  school: string
  grade_level: string
  subject: string
  date: string
  duration: string
  objectives: string
  methodology: string
  materials: string
  notes: string
}

const emptyForm: PlanForm = {
  title: '',
  teacher: '',
  school: 'Escola Municipal',
  grade_level: '',
  subject: 'Anos Iniciais',
  date: '',
  duration: '50 minutos',
  objectives: '',
  methodology: '',
  materials: '',
  notes: '',
}

type AeeCollaboration = {
  professor_id: string
  nome: string
  data: string
  funcao: string
  contribuicoes: string
  recursos_indicados: string[]
  adaptacoes_sugeridas: string[]
  parecer: string
}

type FamilyConsultation = {
  responsavel_nome: string
  parentesco: string
  data_consulta: string
  formato: 'presencial' | 'telefone' | 'whatsapp' | 'reuniao_online' | 'outro'
  informacoes_relevantes: string
  expectativas: string
  concordancia: 'aprovado' | 'ciencia_sem_aprovacao' | 'pendente'
  observacoes: string
}

const emptyAeeCollaboration: AeeCollaboration = {
  professor_id: '',
  nome: '',
  data: '',
  funcao: 'Professor da sala especial/AEE',
  contribuicoes: '',
  recursos_indicados: [],
  adaptacoes_sugeridas: [],
  parecer: '',
}

const emptyFamilyConsultation: FamilyConsultation = {
  responsavel_nome: '',
  parentesco: '',
  data_consulta: '',
  formato: 'presencial',
  informacoes_relevantes: '',
  expectativas: '',
  concordancia: 'pendente',
  observacoes: '',
}

function splitList(value: string) {
  return value.split(/\n|,/).map(v => v.trim()).filter(Boolean)
}

function joinList(value?: string[]) {
  return (value || []).join('\n')
}

// ── Design helpers ─────────────────────────────────────────────────────────────

const DISC_COLORS: Record<string, { bg: string; fg: string }> = {
  'Língua Portuguesa':              { bg: 'var(--red-wash)',    fg: 'var(--red-deep)' },
  'Arte':                           { bg: 'var(--plum-wash)',   fg: 'var(--plum)' },
  'Educação Física':                { bg: 'var(--blue-wash)',   fg: 'var(--blue)' },
  'Geografia':                      { bg: 'var(--teal-wash)',   fg: 'var(--teal)' },
  'História':                       { bg: 'var(--mustard-wash)',fg: 'var(--mustard-deep)' },
  'Ensino Religioso':               { bg: 'var(--blue-wash)',   fg: 'var(--blue-deep)' },
  'Ciências':                       { bg: 'var(--teal-wash)',   fg: 'var(--teal-deep)' },
  'Matemática':                     { bg: 'var(--red-wash)',    fg: 'var(--red-deep)' },
  'História e Geografia de Atalaia':{ bg: 'var(--mustard-wash)',fg: 'var(--mustard-deep)' },
}

const PAGE_SIZE = 24

function normalizeText(v: string) {
  return v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function skillKey(skill: Skill) {
  return `${skill.discipline}|${skill.year}|${skill.code}`
}

function normalizePdf(v: string) {
  if (!v) return ''
  return v
    .replace(/\*\*/g, '')
    .replace(/Ã¡/g, 'á').replace(/Ã©/g, 'é').replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó').replace(/Ãº/g, 'ú').replace(/Ã§/g, 'ç')
    .replace(/Ã£/g, 'ã').replace(/Ãµ/g, 'õ').replace(/Ã¢/g, 'â')
    .replace(/Ãª/g, 'ê').replace(/Ã´/g, 'ô').replace(/Â/g, '')
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="sc">
      <div className="sc-ic" />
      <div>
        <div className="sc-n">{value}</div>
        <div className="sc-l">{label}</div>
      </div>
    </div>
  )
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`fgr${wide ? ' s2' : ''}`}>
      <span className="fl">{label}</span>
      {children}
    </label>
  )
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AnosIniciaisPage() {
  const { user, signOut } = useAuth()
  const { slug } = useMunicipality()

  // data
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)

  // skill view state
  const [query, setQuery] = useState('')
  const [discipline, setDiscipline] = useState('')
  const [year, setYear] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [selected, setSelected] = useState<Skill[]>([])
  const [page, setPage] = useState(1)

  // views
  const [view, setView] = useState<'skills' | 'plan' | 'saved'>('skills')

  // plan state
  const [form, setForm] = useState<PlanForm>(emptyForm)
  const [planKind, setPlanKind] = useState<PlanKind>('plano')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<PeiStudent | null>(null)
  const [generated, setGenerated] = useState('')
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [phrase, setPhrase] = useState('')
  const [toast, setToast] = useState('')

  // PEI collaboration state
  const [revisaoRegente, setRevisaoRegente] = useState(false)
  const [aee, setAee] = useState<AeeCollaboration>(emptyAeeCollaboration)
  const [family, setFamily] = useState<FamilyConsultation>(emptyFamilyConsultation)
  const [savingPei, setSavingPei] = useState(false)

  // saved plans (localStorage)
  const [saved, setSaved] = useState<Array<{ id: string; name: string; content: string; createdAt: string }>>([])

  // Set today's date after mount to avoid SSR/client timezone mismatch
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    setForm((f) => f.date ? f : { ...f, date: today })
    setAee((a) => a.data ? a : { ...a, data: today })
    setFamily((fam) => fam.data_consulta ? fam : { ...fam, data_consulta: today })
  }, [])

  // Load skills JSON
  useEffect(() => {
    void import('../../../public/anos-iniciais-skills.json').then(mod => {
      setSkills(mod.default as Skill[])
      setLoading(false)
    })
  }, [])

  // Load saved plans
  useEffect(() => {
    try {
      const raw = localStorage.getItem('ai-plans')
      if (raw) setSaved(JSON.parse(raw))
    } catch { /* empty */ }
  }, [])

  // Pre-fill teacher name from user
  useEffect(() => {
    if (user) {
      setForm(f => ({
        ...f,
        teacher: f.teacher || String(user.user_metadata?.name || user.user_metadata?.full_name || ''),
      }))
    }
  }, [user])

  // ── Skill lists ────────────────────────────────────────────────────────────

  const disciplines = useMemo(() => [...new Set(skills.map(s => s.discipline))].sort(), [skills])

  const years = useMemo(() => {
    const ORDER = ['1º Ano','2º Ano','3º Ano','4º Ano','5º Ano',
      '1º e 2º Ano','3º ao 5º Ano','1º ao 5º Ano']
    const all = [...new Set(skills.map(s => s.year))]
    return all.sort((a, b) => {
      const ia = ORDER.indexOf(a), ib = ORDER.indexOf(b)
      if (ia >= 0 && ib >= 0) return ia - ib
      if (ia >= 0) return -1; if (ib >= 0) return 1
      return a.localeCompare(b, 'pt-BR')
    })
  }, [skills])

  const filtered = useMemo(() => skills.filter(s => {
    if (discipline && s.discipline !== discipline) return false
    if (year && s.year !== year) return false
    if (query) {
      const q = normalizeText(query)
      return [s.code, s.habilidade, s.objeto, s.campo, s.discipline].some(f => normalizeText(f).includes(q))
    }
    return true
  }), [skills, discipline, year, query])

  useEffect(() => {
    setPage(1)
    setExpanded(null)
  }, [discipline, year, query])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pagedSkills = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  )

  // ── Helpers ────────────────────────────────────────────────────────────────

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2800)
  }

  function toggleSkill(skill: Skill) {
    const key = skillKey(skill)
    setSelected(prev =>
      prev.some(s => skillKey(s) === key)
        ? prev.filter(s => skillKey(s) !== key)
        : [...prev, skill]
    )
  }

  function updateForm(field: keyof PlanForm, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  // ── Plan generation ────────────────────────────────────────────────────────

  const PHRASES = [
    '🧠 Analisando as habilidades selecionadas...',
    '📚 Consultando o Referencial Curricular de Atalaia-AL...',
    '🌾 Contextualizando para a realidade do município...',
    '💡 Formulando objetivos alinhados ao ano escolar...',
    '✏️ Estruturando a introdução e o aquecimento da aula...',
    '🎭 Desenvolvendo atividades criativas e contextualizadas...',
    '🏫 Adequando a linguagem pedagógica para a rede municipal...',
    '📊 Definindo critérios formativos de avaliação...',
    '✨ Dando os últimos retoques pedagógicos no plano...',
  ]

  async function generatePlan() {
    if (!form.title.trim()) { showToast('Informe o tema do plano.'); return }
    if (!form.grade_level.trim()) { showToast('Informe o ano/turma.'); return }
    if (!selected.length) { showToast('Selecione ao menos uma habilidade.'); return }
    if (planKind === 'pei' && !user) { showToast('Faça login para gerar PEI.'); return }
    if (planKind === 'pei' && !selectedStudentId) { showToast('Selecione o aluno para gerar o PEI.'); return }

    const skills_context = selected
      .map(s => `[${s.code}] ${s.habilidade}${s.objeto ? `\nObjeto: ${s.objeto}` : ''}${s.desdobramento ? `\nDesdobramento: ${s.desdobramento.slice(0, 300)}` : ''}`)
      .join('\n\n')

    setGenerating(true)
    setProgress(0)
    setPhrase(PHRASES[0])

    let prog = 0
    const progTimer = setInterval(() => {
      prog = prog < 40 ? prog + 1 : prog < 75 ? prog + 0.35 : prog < 90 ? prog + 0.15 : prog < 97 ? prog + 0.07 : prog
      setProgress(Math.min(prog, 97))
    }, 200)

    let pi = 0
    const phraseTimer = setInterval(() => {
      pi = (pi + 1) % PHRASES.length
      setPhrase(PHRASES[pi])
    }, 2200)

    try {
      const token = planKind === 'pei' ? await getAccessToken() : ''
      const res = await fetch(planKind === 'pei' ? '/api/pei/generate' : '/api/plans/generate-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(
          planKind === 'pei'
            ? { student_id: selectedStudentId, portal: 'anos_iniciais', plan: form, skills_context }
            : { ...form, skills_context },
        ),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar')
      const text: string = data.data?.content || ''
      if (!text.trim()) throw new Error('Plano gerado vazio.')

      clearInterval(progTimer); clearInterval(phraseTimer)
      setProgress(100); setPhrase('✨ Escrevendo plano...')
      setView('plan')

      let cur = 0
      const typer = setInterval(() => {
        cur += 150
        if (cur >= text.length) {
          clearInterval(typer)
          setGenerated(text)
          setGenerating(false)
          showToast('Plano gerado! Edite antes de salvar.')
        } else {
          setGenerated(text.slice(0, cur) + ' ▌')
          const ta = document.getElementById('ai-plan-ta') as HTMLTextAreaElement | null
          if (ta) ta.scrollTop = ta.scrollHeight
        }
      }, 15)
    } catch (err) {
      clearInterval(progTimer); clearInterval(phraseTimer)
      setGenerating(false)
      showToast(err instanceof Error ? err.message : 'Erro ao gerar plano')
    }
  }

  // ── PDF download ───────────────────────────────────────────────────────────

  async function downloadPdf() {
    const text = normalizePdf(generated)
    if (!text.trim()) { showToast('Gere o plano antes de baixar em PDF.'); return }
    const title = normalizePdf(form.title || 'plano')
    const safeTitle = normalizeText(title).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pw = doc.internal.pageSize.getWidth()
    const ph = doc.internal.pageSize.getHeight()
    const mx = 18
    const cw = pw - mx * 2
    let y = 18

    function drawBg() {
      doc.setFillColor(250, 245, 227)
      doc.rect(0, 0, pw, ph, 'F')
    }
    function drawHeader(first: boolean) {
      doc.setTextColor(229, 57, 75)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(first ? 14 : 9)
      doc.text(first ? 'PLANO DE AULA' : 'Plano de aula', mx, y)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(0, 0, 0)
      doc.text('Referencial Curricular Anos Iniciais · Secretaria Municipal de Educação · Atalaia/AL', mx, y + 5)
      doc.setDrawColor(229, 57, 75); doc.setLineWidth(0.4)
      doc.line(mx, y + 8, pw - mx, y + 8)
      y += first ? 16 : 13
    }
    function needPage(h = 10) {
      if (y + h > ph - 20) { doc.addPage(); drawBg(); y = 18; drawHeader(false) }
    }
    function addWrapped(t: string, opts?: { bold?: boolean; size?: number; indent?: number }) {
      const sz = opts?.size || 9
      const ind = opts?.indent || 0
      const lh = sz * 0.43
      const lines = doc.splitTextToSize(t, cw - ind)
      doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal')
      doc.setFontSize(sz); doc.setTextColor(0, 0, 0)
      for (const l of lines) { needPage(lh + 1); doc.text(l, mx + ind, y); y += lh }
      y += 1.5
    }
    function addSection(t: string) {
      needPage(14); y += 2
      doc.setDrawColor(229, 57, 75); doc.setLineWidth(0.5)
      doc.line(mx, y - 2, pw - mx, y - 2)
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(229, 57, 75)
      doc.text(t.toUpperCase(), mx, y + 2.5)
      doc.line(mx, y + 5.5, pw - mx, y + 5.5)
      y += 11
    }

    drawBg(); drawHeader(true)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(0, 0, 0)
    doc.text(String(title).toUpperCase(), mx, y, { maxWidth: cw }); y += 10

    addSection('Identificação')
    addWrapped(`Professor(a): ${normalizePdf(form.teacher || 'Professor(a)')}`)
    addWrapped(`Escola: ${normalizePdf(form.school)} | Município: Atalaia - AL`)
    addWrapped(`Ano/Turma: ${normalizePdf(form.grade_level)} | Componente: ${normalizePdf(form.subject)}`)
    addWrapped(`Data: ${form.date} | Duração: ${normalizePdf(form.duration)}`)

    const SECTIONS = new Set(['IDENTIFICAÇÃO','IDENTIFICACAO','OBJETIVOS','HABILIDADES DO REFERENCIAL CURRICULAR',
      'CONTEÚDOS','CONTEUDOS','METODOLOGIA','DESENVOLVIMENTO DA AULA','RECURSOS DIDÁTICOS','RECURSOS DIDATICOS',
      'AVALIAÇÃO','AVALIACAO','REFERÊNCIAS','REFERENCIAS','OBSERVAÇÕES','OBSERVACOES',
      'OBJETIVOS DO PROFESSOR'])
    const SKIP = new Set(['PLANO DE AULA', title.toUpperCase()])

    text.split('\n').forEach(raw => {
      const l = raw.trim()
      if (!l) { y += 1.8; return }
      const up = l.toUpperCase()
      if (SKIP.has(up) || l.includes('Secretaria Municipal de Educação')) return
      if (SECTIONS.has(up)) { addSection(l); return }
      if (l.endsWith(':') || /^(Objetivo geral|Objetivos específicos|Momento inicial|Desenvolvimento|Encerramento)/i.test(l)) {
        addWrapped(l, { bold: true }); return
      }
      if (l.startsWith('- ')) { addWrapped(`- ${l.slice(2)}`, { indent: 3 }); return }
      addWrapped(l)
    })

    const np = doc.getNumberOfPages()
    for (let p = 1; p <= np; p++) {
      doc.setPage(p)
      doc.setDrawColor(229, 57, 75); doc.setLineWidth(0.3)
      doc.line(mx, ph - 14, pw - mx, ph - 14)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(0, 0, 0)
      doc.text(`Referencial Curricular Anos Iniciais · Página ${p} de ${np}`, mx, ph - 8)
      doc.text(new Date().toLocaleDateString('pt-BR'), pw - mx, ph - 8, { align: 'right' })
    }

    doc.save(`plano-ai-${safeTitle || 'aula'}.pdf`)
  }

  // ── PEI helpers ────────────────────────────────────────────────────────────

  function updateAee<K extends keyof AeeCollaboration>(field: K, value: AeeCollaboration[K]) {
    setAee(current => ({ ...current, [field]: value }))
  }

  function updateFamily<K extends keyof FamilyConsultation>(field: K, value: FamilyConsultation[K]) {
    setFamily(current => ({ ...current, [field]: value }))
  }

  async function savePei(publish: boolean) {
    if (!generated.trim()) { showToast('Gere o PEI antes de salvar.'); return }
    if (!user) { showToast('Faca login para salvar o PEI.'); return }
    setSavingPei(true)
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...form,
          content: generated,
          is_pei: true,
          student_id: selectedStudentId,
          pei_snapshot: { student: selectedStudent },
          revisao_regente: revisaoRegente,
          colaboracao_aee: aee,
          consulta_familia: family,
          is_published: publish,
          plan_status: publish ? 'vigente' : 'rascunho',
          skill_ids: selected.map(s => s.code),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar PEI')
      showToast(publish ? 'PEI publicado como vigente.' : 'PEI salvo como rascunho.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao salvar PEI')
    } finally {
      setSavingPei(false)
    }
  }

  // ── Save/load plans ────────────────────────────────────────────────────────

  function savePlanLocally() {
    if (!generated.trim()) { showToast('Gere o plano antes de salvar.'); return }
    const plan = { id: Date.now().toString(), name: form.title || 'Plano sem título', content: generated, createdAt: new Date().toISOString() }
    const next = [plan, ...saved]
    setSaved(next)
    localStorage.setItem('ai-plans', JSON.stringify(next))
    showToast('Plano salvo localmente.')
  }

  function deleteSaved(id: string) {
    const next = saved.filter(p => p.id !== id)
    setSaved(next)
    localStorage.setItem('ai-plans', JSON.stringify(next))
  }

  function loadSaved(plan: typeof saved[number]) {
    setGenerated(plan.content)
    setView('plan')
    showToast('Plano carregado para edição.')
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main>
      {/* ── Header ── */}
      <header id="hdr">
        <div className="hdr-in">
          <div className="logo">
            <div className="logo-ic ai-ic" />
            <div>
              <div className="logo-t">Referencial Curricular · Anos Iniciais</div>
              <div className="logo-s">Secretaria Municipal de Educação · Atalaia/AL</div>
            </div>
          </div>
          <nav className="hdr-nav" aria-label="Navegação">
            <button className={`nb${view === 'skills' ? ' on' : ''}`} onClick={() => setView('skills')}>
              Habilidades
            </button>
            <button className={`nb${view === 'plan' ? ' on' : ''}`} onClick={() => setView('plan')}>
              Plano <span className="nbadge">{selected.length}</span>
            </button>
            <button className={`nb${view === 'saved' ? ' on' : ''}`} onClick={() => setView('saved')}>
              Salvos <span className="nbadge">{saved.length}</span>
            </button>
            <Link className="nb" href="/computacao">BNCC Comp.</Link>
            {['aee_teacher', 'coordinator', 'admin', 'municipality_admin', 'super_admin'].includes(String(user?.user_metadata?.role || '')) && (
              <Link className="nb" href="/aee">AEE</Link>
            )}
            <Link className="nb" href={slug ? `/${slug}` : '/'} style={{ opacity: .65, fontSize: 12 }}>Portais</Link>
            {user ? (
              <button className="nb" onClick={() => void signOut()}>Sair</button>
            ) : (
              <Link className="nb nb-cta" href="/auth/login">Login</Link>
            )}
          </nav>
        </div>
      </header>

      {/* ── View: Habilidades ── */}
      {view === 'skills' && (
        <section className="pg">
          {loading ? (
            <div className="ai-loading">
              <div className="ai-spin" />
              <span>Carregando referencial...</span>
            </div>
          ) : (
            <>
              <div className="stats">
                <StatCard value={skills.length} label="habilidades" />
                <StatCard value={disciplines.length} label="disciplinas" />
                <StatCard value={years.length} label="anos/etapas" />
                <StatCard value={filtered.length} label="resultados" />
              </div>

              <div className="fbar">
                <div className="sw">
                  <span className="sw-icon">⌕</span>
                  <input
                    type="search"
                    placeholder="Pesquisar por código, habilidade, objeto ou disciplina..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                  />
                </div>
                <select value={discipline} onChange={e => setDiscipline(e.target.value)} aria-label="Filtrar por disciplina">
                  <option value="">Todas as disciplinas</option>
                  {disciplines.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={year} onChange={e => setYear(e.target.value)} aria-label="Filtrar por ano">
                  <option value="">Todos os anos</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                {(discipline || year || query) && (
                  <button className="btn btn-out" style={{ padding: '8px 14px', fontSize: 12 }}
                    onClick={() => { setDiscipline(''); setYear(''); setQuery('') }}>
                    ✕ Limpar
                  </button>
                )}
                <span className="fcount">
                  {filtered.length === 0
                    ? '0 resultados'
                    : `${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, filtered.length)} de ${filtered.length}`}
                </span>
              </div>

              {filtered.length === 0 ? (
                <div className="est">Nenhuma habilidade encontrada com os filtros aplicados.</div>
              ) : (
                <>
                <div className="grid">
                  {pagedSkills.map(skill => {
                    const color = DISC_COLORS[skill.discipline] ?? { bg: 'var(--paper-deep)', fg: 'var(--ink)' }
                    const key = skillKey(skill)
                    const isOpen = expanded === key
                    const isSel = selected.some(s => skillKey(s) === key)
                    return (
                      <article
                        key={key}
                        className={`scard ai-scard${isSel ? ' in-plan' : ''}`}
                      >
                        <div className="ctags">
                          <span className="tag" style={{ background: color.bg, color: color.fg }}>
                            {skill.discipline}
                          </span>
                          <span className="tag ta">{skill.year}</span>
                          {isSel && <span className="tag tcd">No plano</span>}
                        </div>
                        <div className="ceixo">{skill.code}</div>
                        <h2 className="cobj">{skill.objeto || skill.campo || 'Habilidade curricular'}</h2>
                        <p className="chab">{skill.habilidade}</p>
                        <div className="cmeta">
                          {skill.campo ? skill.campo : skill.pratica ? skill.pratica : 'Referencial Curricular de Atalaia'}
                        </div>

                        {isOpen && (
                          <div className="ai-card-detail">
                            {(skill.campo || skill.pratica) && (
                              <p className="ai-card-meta">
                                {skill.campo && <><strong>Campo:</strong> {skill.campo}</>}
                                {skill.campo && skill.pratica && ' · '}
                                {skill.pratica && <><strong>Prática:</strong> {skill.pratica}</>}
                              </p>
                            )}
                            <p className="ai-card-desdobr-label">Desdobramento territorializado</p>
                            <p className="ai-card-desdobr">{skill.desdobramento}</p>
                          </div>
                        )}

                        <div className="cacts">
                          <button className="bsm bdet" onClick={() => setExpanded(isOpen ? null : key)}>
                            {isOpen ? 'Fechar' : 'Detalhes'}
                          </button>
                          <button
                            className="bsm bsug"
                            onClick={() => {
                              if (!isSel) toggleSkill(skill)
                              setForm(current => ({
                                ...current,
                                title: current.title || skill.objeto || skill.campo,
                                subject: skill.discipline,
                                grade_level: skill.year,
                              }))
                              setView('plan')
                              if (!isSel) showToast(`${skill.code} adicionada ao plano.`)
                            }}
                          >
                            Usar
                          </button>
                          <button
                            className={`bsm badd${isSel ? ' added' : ''}`}
                            onClick={() => {
                              toggleSkill(skill)
                              if (!isSel) showToast(`${skill.code} adicionada ao plano.`)
                            }}
                          >
                            {isSel ? 'Remover' : '+ Plano'}
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
                {totalPages > 1 && (
                  <nav className="pg-nav" aria-label="Paginação">
                    <button className="pg-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} aria-label="Página anterior">
                      ‹
                    </button>
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
                        item === 'ellipsis' ? (
                          <span key={`e${idx}`} className="pg-ellipsis">…</span>
                        ) : (
                          <button
                            key={item}
                            className={`pg-btn${page === item ? ' active' : ''}`}
                            onClick={() => setPage(item)}
                            aria-current={page === item ? 'page' : undefined}
                          >
                            {item}
                          </button>
                        ),
                      )
                    })()}
                    <button className="pg-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Próxima página">
                      ›
                    </button>
                  </nav>
                )}
                </>
              )}
            </>
          )}
        </section>
      )}

      {/* ── View: Plano ── */}
      {view === 'plan' && (
        <section className="pg play">
          {/* Left: form + output */}
          <div>
            <div className="stbar">
              <div className={`sti${selected.length ? ' done' : ' active'}`}>
                <span className="stn">1</span>
                <span className="stl">Habilidades ({selected.length})</span>
              </div>
              <div className={`sti${form.title ? ' done' : ''}`}>
                <span className="stn">2</span>
                <span className="stl">Dados do plano</span>
              </div>
              <div className={`sti${generated ? ' done' : ''}`}>
                <span className="stn">3</span>
                <span className="stl">Plano gerado</span>
              </div>
            </div>

            <div className="pc">
              <h1 className="pct">Criar plano de aula · Anos Iniciais</h1>
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
                <Field label="Professor(a)">
                  <input value={form.teacher} onChange={e => updateForm('teacher', e.target.value)} placeholder="Nome completo" />
                </Field>
                <Field label="Escola">
                  <input list="ai-schools" value={form.school} onChange={e => updateForm('school', e.target.value)} />
                  <datalist id="ai-schools">
                    {municipalSchools.map(s => <option key={s} value={s} />)}
                  </datalist>
                </Field>
                <Field label="Ano/Turma">
                  <select value={form.grade_level} onChange={e => updateForm('grade_level', e.target.value)}>
                    <option value="">Selecione…</option>
                    {['1º Ano','2º Ano','3º Ano','4º Ano','5º Ano'].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Componente">
                  <input value={form.subject} onChange={e => updateForm('subject', e.target.value)} />
                </Field>
                <Field label="Data">
                  <input type="date" value={form.date} onChange={e => updateForm('date', e.target.value)} />
                </Field>
                <Field label="Duração">
                  <input value={form.duration} onChange={e => updateForm('duration', e.target.value)} />
                </Field>
                <Field label="Tema da aula" wide>
                  <input value={form.title} onChange={e => updateForm('title', e.target.value)}
                    placeholder="Ex.: A fauna e flora do Rio Paraíba do Meio" />
                </Field>
                <Field label="Objetivos do professor" wide>
                  <textarea value={form.objectives} onChange={e => updateForm('objectives', e.target.value)}
                    placeholder="Descreva seus objetivos específicos para esta aula..." rows={3} />
                </Field>
                <Field label="Metodologia" wide>
                  <textarea value={form.methodology} onChange={e => updateForm('methodology', e.target.value)} rows={2} />
                </Field>
                <Field label="Recursos disponíveis" wide>
                  <textarea value={form.materials} onChange={e => updateForm('materials', e.target.value)} rows={2} />
                </Field>
              </div>

              <div className="brow">
                <button className="btn btn-out" onClick={() => setView('skills')}>
                  {selected.length ? `${selected.length} habilidade${selected.length > 1 ? 's' : ''} selecionada${selected.length > 1 ? 's' : ''}` : '+ Selecionar habilidades'}
                </button>
                <button className="btn btn-pri" disabled={generating} onClick={generatePlan}>
                  {generating ? 'Gerando...' : '✦ Gerar plano com IA'}
                </button>
              </div>
            </div>

            {/* Output area */}
            <div className="oa">
              <div className="oa-toolbar">
                <span className="oa-label">Plano editável</span>
                <button className="btn btn-gh" onClick={downloadPdf}>Baixar PDF</button>
                {planKind === 'pei' ? (
                  <>
                    <button className="btn btn-suc" disabled={!generated || savingPei} onClick={() => void savePei(false)}>
                      {savingPei ? 'Salvando...' : 'Salvar rascunho'}
                    </button>
                    <button className="btn btn-pri" disabled={!generated || savingPei} onClick={() => void savePei(true)}>
                      Publicar vigente
                    </button>
                  </>
                ) : (
                  <button className="btn btn-suc" disabled={!generated} onClick={savePlanLocally}>Salvar</button>
                )}
              </div>

              {generating && (
                <div className="gbanner" style={{ borderRadius: 0, border: '2px solid var(--ink)', background: 'var(--paper-soft)', padding: '14px 16px', margin: '12px 0', boxShadow: '4px 4px 0 var(--ink)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div className="ai-spin" style={{ width: 16, height: 16 }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>{phrase}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, marginLeft: 'auto' }}>{Math.round(progress)}%</span>
                  </div>
                  <div style={{ height: 8, background: 'white', border: '2px solid var(--ink)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--blue-soft)', width: `${progress}%`, transition: 'width .3s' }} />
                  </div>
                </div>
              )}

              <textarea
                id="ai-plan-ta"
                value={generated}
                onChange={e => setGenerated(e.target.value)}
                placeholder="O plano gerado aparecerá aqui. Você pode editar antes de salvar ou baixar."
              />

              {planKind === 'pei' && (
                <div className="pei-flow">
                  <section className="pei-block">
                    <div className="bnac-form-section">Passo 4 - Revisao colaborativa (AEE)</div>
                    <label className="pei-check">
                      <input type="checkbox" checked={revisaoRegente} onChange={e => setRevisaoRegente(e.target.checked)} />
                      Professor regente revisou as secoes do PEI
                    </label>
                    <div className="fg">
                      <Field label="Professor AEE">
                        <input value={aee.nome} onChange={e => updateAee('nome', e.target.value)} placeholder="Nome do profissional" />
                      </Field>
                      <Field label="Data da colaboracao">
                        <input type="date" value={aee.data} onChange={e => updateAee('data', e.target.value)} />
                      </Field>
                      <Field label="Funcao">
                        <input value={aee.funcao} onChange={e => updateAee('funcao', e.target.value)} />
                      </Field>
                      <Field label="Contribuicoes do AEE" wide>
                        <textarea value={aee.contribuicoes} onChange={e => updateAee('contribuicoes', e.target.value)} placeholder="Barreiras, estrategias, apoio na avaliacao." />
                      </Field>
                      <Field label="Recursos indicados" wide>
                        <textarea value={joinList(aee.recursos_indicados)} onChange={e => updateAee('recursos_indicados', splitList(e.target.value))} placeholder="Um recurso por linha" />
                      </Field>
                      <Field label="Adaptacoes sugeridas" wide>
                        <textarea value={joinList(aee.adaptacoes_sugeridas)} onChange={e => updateAee('adaptacoes_sugeridas', splitList(e.target.value))} placeholder="Uma adaptacao por linha" />
                      </Field>
                      <Field label="Parecer do AEE" wide>
                        <textarea value={aee.parecer} onChange={e => updateAee('parecer', e.target.value)} />
                      </Field>
                    </div>
                  </section>
                  <section className="pei-block">
                    <div className="bnac-form-section">Passo 5 - Consulta da familia</div>
                    <p className="pei-note" style={{ marginBottom: 12 }}>
                      A participacao da familia e prevista na Lei Brasileira de Inclusao. Registre a consulta mesmo que seja informal.
                    </p>
                    <div className="fg">
                      <Field label="Responsavel consultado">
                        <input value={family.responsavel_nome} onChange={e => updateFamily('responsavel_nome', e.target.value)} />
                      </Field>
                      <Field label="Parentesco">
                        <input value={family.parentesco} onChange={e => updateFamily('parentesco', e.target.value)} />
                      </Field>
                      <Field label="Data da consulta">
                        <input type="date" value={family.data_consulta} onChange={e => updateFamily('data_consulta', e.target.value)} />
                      </Field>
                      <Field label="Formato">
                        <select value={family.formato} onChange={e => updateFamily('formato', e.target.value as FamilyConsultation['formato'])}>
                          <option value="presencial">Presencial</option>
                          <option value="telefone">Telefone</option>
                          <option value="whatsapp">WhatsApp</option>
                          <option value="reuniao_online">Reuniao online</option>
                          <option value="outro">Outro</option>
                        </select>
                      </Field>
                      <Field label="Status da familia" wide>
                        <select value={family.concordancia} onChange={e => updateFamily('concordancia', e.target.value as FamilyConsultation['concordancia'])}>
                          <option value="pendente">Pendente</option>
                          <option value="aprovado">Aprovado pela familia</option>
                          <option value="ciencia_sem_aprovacao">Ciencia sem aprovacao formal</option>
                        </select>
                      </Field>
                      <Field label="Observacoes" wide>
                        <textarea value={family.observacoes} onChange={e => updateFamily('observacoes', e.target.value)} />
                      </Field>
                    </div>
                  </section>
                  <section className="pei-block">
                    <div className="bnac-form-section">Passo 6 - Salvar/Publicar</div>
                    <p className="pei-note">
                      Use os botoes acima para salvar como rascunho ou publicar como vigente.
                      Publicar exige revisao do regente, colaboracao do AEE, consulta familiar e validacao da coordenacao.
                    </p>
                  </section>
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar: selected skills */}
          <aside className="sb">
            <div className="sbt">
              Habilidades selecionadas <span className="sbc">{selected.length}</span>
            </div>
            {selected.length ? (
              selected.map(skill => (
                <div className="ssi" key={skillKey(skill)}>
                  <button className="ssrm" onClick={() => toggleSkill(skill)} aria-label={`Remover ${skill.code}`}>×</button>
                  <div className="ssic">{skill.code}</div>
                  <div className="ssio">{skill.habilidade.slice(0, 100)}{skill.habilidade.length > 100 ? '…' : ''}</div>
                  <div className="ssims">{skill.discipline} · {skill.year}</div>
                </div>
              ))
            ) : (
              <div className="esel">
                Nenhuma habilidade selecionada.<br />
                <button className="btn btn-out" style={{ marginTop: 10, fontSize: 12 }} onClick={() => setView('skills')}>
                  Ir para habilidades →
                </button>
              </div>
            )}
          </aside>
        </section>
      )}

      {/* ── View: Salvos ── */}
      {view === 'saved' && (
        <section className="pg">
          <div className="saved-head">
            <div>
              <h1>Planos salvos</h1>
              <p>Planos de Anos Iniciais salvos localmente neste dispositivo.</p>
            </div>
            <button className="btn btn-pri" onClick={() => setView('plan')}>+ Criar novo plano</button>
          </div>

          {saved.length === 0 ? (
            <div className="est">Nenhum plano salvo ainda. Crie e salve o seu primeiro plano.</div>
          ) : (
            <div className="plans-grid">
              {saved.map(plan => (
                <article className="plan-item" key={plan.id}>
                  <div className="pi-header">
                    <h2 className="pi-title">{plan.name}</h2>
                    <div className="pi-date">{new Date(plan.createdAt).toLocaleString('pt-BR')}</div>
                  </div>
                  <p className="plan-preview">{plan.content.slice(0, 200)}…</p>
                  <div className="pi-actions">
                    <button className="btn btn-pri" onClick={() => loadSaved(plan)}>Editar</button>
                    <button className="btn btn-gh" onClick={() => deleteSaved(plan.id)}>Excluir</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <div id="toast" className={toast ? 'show' : ''}>{toast}</div>

      <style>{`
        .ai-ic::before { content: "AI" !important; font-size: 14px !important; letter-spacing: -.05em; }
        .ai-ic { background: var(--teal) !important; }

        .ai-loading {
          display: flex; align-items: center; gap: 12px;
          padding: 80px 0; justify-content: center;
          font-family: var(--font-mono); font-size: 13px; color: var(--ink-muted);
        }
        .ai-spin {
          width: 20px; height: 20px; border-radius: 50%;
          border: 2px solid var(--ink); border-top-color: transparent;
          animation: ai-spin .7s linear infinite; flex-shrink: 0;
        }
        @keyframes ai-spin { to { transform: rotate(360deg); } }

        .ai-scard .cmeta {
          min-height: 45px;
        }
        .ai-scard .ai-card-detail {
          margin: 0 0 12px;
        }
        .ai-scard .ai-card-desdobr {
          margin-bottom: 0;
        }

        /* list */
        .ai-list { display: flex; flex-direction: column; gap: 10px; }

        /* card */
        .ai-card {
          background: var(--paper-soft);
          border: 2.5px solid var(--ink);
          box-shadow: 3px 3px 0 var(--ink);
          transition: transform .12s, box-shadow .12s;
        }
        .ai-card:hover { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 var(--ink); }
        .ai-card-open { box-shadow: 5px 5px 0 var(--ink); }
        .ai-card-sel { border-color: var(--teal) !important; box-shadow: 3px 3px 0 var(--teal) !important; }

        .ai-card-top {
          padding: 14px 42px 0 16px; cursor: pointer; position: relative;
        }
        .ai-card-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
        .ai-chip {
          font-family: var(--font-mono); font-size: 10px; font-weight: 600;
          text-transform: uppercase; letter-spacing: .1em;
          padding: 3px 8px; border: 1.5px solid var(--ink);
          background: var(--paper); color: var(--ink);
        }
        .ai-chip-disc { border-width: 1.5px; }
        .ai-chip-code { background: var(--ink); color: var(--paper-soft); font-weight: 700; }
        .ai-chip-sel { background: var(--teal); color: white; border-color: var(--teal-deep); }

        .ai-card-obj {
          font-family: var(--font-mono); font-size: 10px; text-transform: uppercase;
          letter-spacing: .08em; color: var(--ink-muted); margin-bottom: 6px; font-weight: 500;
        }
        .ai-card-hab { font-size: 14px; line-height: 1.55; color: var(--ink); font-weight: 500; }
        .ai-card-toggle { position: absolute; top: 14px; right: 14px; font-size: 10px; color: var(--ink-muted); font-family: var(--font-mono); }

        .ai-card-actions {
          display: flex; gap: 8px; padding: 10px 16px 14px;
        }
        .ai-add-btn { padding: 6px 14px !important; font-size: 12px !important; }

        .ai-card-detail {
          border-top: 2px solid var(--ink); background: var(--paper); padding: 14px 16px;
        }
        .ai-card-meta { font-family: var(--font-mono); font-size: 11px; color: var(--ink-muted); margin-bottom: 10px; }
        .ai-card-meta strong { color: var(--ink); }
        .ai-card-desdobr-label {
          font-family: var(--font-mono); font-size: 10px; font-weight: 700;
          text-transform: uppercase; letter-spacing: .12em; color: var(--ink); margin-bottom: 6px;
        }
        .ai-card-desdobr { font-size: 13px; line-height: 1.7; color: var(--ink-soft); white-space: pre-wrap; }

        @media (max-width: 600px) {
          .ai-card-top { padding: 12px 36px 0 12px; }
          .ai-card-actions { padding: 8px 12px 12px; }
        }
      `}</style>
    </main>
  )
}
