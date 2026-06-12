'use client'

import { supabase } from '@/lib/supabase-client'

import { useState, useMemo, useEffect } from 'react'
import Link from '@/lib/m-link'
import { useAuth } from '@/hooks/useAuth'
import { municipalSchools } from '@/lib/education-options'
import { useMunicipality } from '@/lib/municipality-context'
import PeiControls, { type PeiStudent, type PlanKind, type PeiSource, type ExistingPei } from '@/components/PeiControls'
import { PortalTutorial, SkillsHowTo, usePortalTutorial, type TutorialStep } from '@/components/PortalTutorial'
import { downloadRisoPdf, sanitizePdfText, pdfSlug } from '@/lib/pdf-riso'


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
  school: '',
  grade_level: '',
  subject: 'Anos Iniciais',
  date: '',
  duration: '50 minutos',
  objectives: '',
  methodology: '',
  materials: '',
  notes: '',
}

// Revisao colaborativa (AEE), consulta da familia e publicacao do PEI
// acontecem em seus fluxos proprios (paineis AEE, Familia e Coordenacao).
// Esta tela cuida apenas de gerar o documento e salvar como rascunho.

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

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    icon: 'AI',
    iconStyle: { background: 'var(--teal)', color: 'var(--paper-soft)' },
    title: 'Bem-vindo aos Anos Iniciais!',
    body: 'Este portal reúne as habilidades do Referencial Curricular de Atalaia/AL para o 1º ao 5º Ano, com desdobramentos contextualizados para a realidade do município. Veja como usar em poucos passos.',
    tip: null,
  },
  {
    icon: '∑',
    iconStyle: { background: 'var(--paper)', color: 'var(--ink)' },
    title: 'Visão geral do referencial',
    body: 'Estes números mostram o tamanho do referencial: total de habilidades, disciplinas e anos. O contador de "resultados" muda conforme você filtra.',
    selector: '.stats',
  },
  {
    icon: '⌕',
    iconStyle: { background: 'var(--teal-wash)', color: 'var(--ink)' },
    title: 'Busque e filtre',
    body: 'Pesquise por código (ex.: EF01LP01), palavra-chave ou objeto de conhecimento. Combine com os filtros de disciplina e ano para chegar rápido ao que precisa.',
    selector: '.fbar',
  },
  {
    icon: '▤',
    iconStyle: { background: 'var(--paper)', color: 'var(--ink)' },
    title: 'Conheça o card de habilidade',
    body: 'Cada card traz o código oficial, a habilidade e o objeto de conhecimento. Clique em "Detalhes" para ver o desdobramento territorializado de Atalaia, e em "+ Plano" para usar a habilidade no seu plano de aula.',
    selector: '.grid .scard',
  },
  {
    icon: '✎',
    iconStyle: { background: 'var(--mustard-wash)', color: 'var(--ink)' },
    title: 'Gere o plano com IA',
    body: 'Com as habilidades selecionadas, vá para a aba "Plano", preencha tema, turma e objetivos e clique em "Gerar plano com IA". O plano sai completo e você pode editar tudo antes de salvar.',
    tip: 'Plano',
  },
  {
    icon: '↓',
    iconStyle: { background: 'var(--blue-wash)', color: 'var(--ink)' },
    title: 'Salve e baixe em PDF',
    body: 'Salve seus planos para reutilizar depois na aba "Salvos", ou baixe em PDF com identidade visual da Secretaria — pronto para imprimir e levar à sala de aula.',
    tip: 'Salvos',
  },
]

function normalizeText(v: string) {
  return v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function skillKey(skill: Skill) {
  return `${skill.discipline}|${skill.year}|${skill.code}`
}


function peiStatusLabel(status?: string) {
  switch (status) {
    case 'aguardando_aee': return 'aguardando validação do AEE'
    case 'aguardando_familia': return 'aguardando a família'
    case 'vigente': return 'vigente'
    case 'arquivado': return 'arquivado'
    case 'substituido': return 'substituído'
    default: return 'rascunho'
  }
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

function Field({ label, children, wide, hint, example }: { label: string; children: React.ReactNode; wide?: boolean; hint?: string; example?: React.ReactNode }) {
  return (
    <label className={`fgr${wide ? ' s2' : ''}`}>
      <span className="fl fl-row">
        {label}
        {hint && (
          <span className="fhint" tabIndex={0} role="note" aria-label={hint}>
            ?<span className="fbubble">{hint}</span>
          </span>
        )}
      </span>
      {children}
      {example && <span className="fex">{example}</span>}
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
  const { open: tutorialOpen, openTutorial, closeTutorial } = usePortalTutorial('ai_tutorial_seen')

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
  const [peiSource, setPeiSource] = useState<PeiSource>('create')
  const [existingPei, setExistingPei] = useState<ExistingPei | null>(null)
  const [generated, setGenerated] = useState('')
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [phrase, setPhrase] = useState('')
  const [toast, setToast] = useState('')

  // PEI collaboration state
  const [savingPei, setSavingPei] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)

  // saved plans (localStorage for normal plans, server for PEI)
  const [saved, setSaved] = useState<Array<{ id: string; name: string; content: string; createdAt: string }>>([])
  const [serverPlans, setServerPlans] = useState<Array<{ id: string; title: string; content: string; created_at: string; is_pei: boolean; plan_status?: string }>>([])
  const [loadingServerPlans, setLoadingServerPlans] = useState(false)

  // Set today's date after mount to avoid SSR/client timezone mismatch
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    setForm((f) => f.date ? f : { ...f, date: today })
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

  // Load server-side plans (PEI) when user is logged in
  useEffect(() => {
    if (!user) { setServerPlans([]); return }
    async function loadServerPlans() {
      setLoadingServerPlans(true)
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token
        const res = await fetch('/api/plans', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) return
        const data = await res.json()
        setServerPlans(data.data || [])
      } catch { /* silently ignore */ } finally {
        setLoadingServerPlans(false)
      }
    }
    void loadServerPlans()
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
    if (!user) { showToast('Faça login para gerar.'); return }

    // Modo "usar o PEI do AEE": carrega o documento existente, sem IA e sem exigir tema/habilidades.
    if (planKind === 'pei' && peiSource === 'use' && existingPei?.content) {
      setGenerated(existingPei.content)
      setEditingPlanId(existingPei.id || null)
      setView('plan')
      showToast('PEI do AEE carregado. Edite e salve se quiser.')
      return
    }

    if (!form.title.trim()) { showToast('Informe o tema do plano.'); return }
    if (!form.grade_level.trim()) { showToast('Informe o ano/turma.'); return }
    if (!selected.length) { showToast('Selecione ao menos uma habilidade.'); return }
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
      const token = await getAccessToken()
      const res = await fetch(planKind === 'pei' ? '/api/pei/generate' : '/api/plans/generate-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(
          planKind === 'pei'
            ? { student_id: selectedStudentId, portal: 'anos_iniciais', plan: form, skills_context, merge_existing: peiSource === 'create' && !!existingPei }
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
    const text = sanitizePdfText(generated)
    if (!text.trim()) { showToast(planKind === 'pei' ? 'Gere o PEI antes de baixar em PDF.' : 'Gere o plano antes de baixar em PDF.'); return }
    const isPei = planKind === 'pei'
    const title = sanitizePdfText(form.title || (isPei && selectedStudent ? selectedStudent.full_name : 'plano'))

    await downloadRisoPdf({
      docType: isPei ? 'PEI' : 'PLANO DE AULA',
      docSubtitle: isPei ? 'Plano Educacional Individualizado' : 'Referencial Curricular · Anos Iniciais',
      masthead: 'Referencial Curricular Anos Iniciais · Secretaria Municipal de Educação · Atalaia/AL',
      title,
      meta: [
        ...(isPei && selectedStudent ? [
          { label: 'Estudante', value: selectedStudent.full_name },
          { label: 'Escola', value: selectedStudent.school_name || form.school },
          { label: 'Ano/Turma', value: `${selectedStudent.grade_level}${selectedStudent.class_name ? ` / ${selectedStudent.class_name}` : ''}` },
          { label: 'Professor(a)', value: form.teacher || 'Professor(a)' },
        ] : [
          { label: 'Professor(a)', value: form.teacher || 'Professor(a)' },
          { label: 'Escola', value: `${form.school} · Atalaia/AL` },
          { label: 'Ano/Turma', value: form.grade_level },
          { label: 'Componente', value: form.subject },
        ]),
        { label: 'Data', value: form.date || new Date().toLocaleDateString('pt-BR') },
        { label: 'Duração', value: form.duration || '—' },
      ],
      body: text,
      sectionNames: ['HABILIDADES DO REFERENCIAL CURRICULAR', 'OBJETIVOS DO PROFESSOR'],
      skipLines: ['PLANO DE AULA', 'PEI', 'PLANO EDUCACIONAL INDIVIDUALIZADO', title, 'Secretaria Municipal de Educação'],
      extraSections: isPei ? [
        {
          title: 'Ciência e assinaturas',
          lines: [
            { text: 'Professor(a) regente', signature: true },
            { text: 'Professor(a) do AEE', signature: true },
            { text: 'Família / responsável', signature: true },
            { text: 'Coordenação pedagógica', signature: true },
          ],
        },
      ] : undefined,
      footerLeft: isPei ? 'PEI · ANOS INICIAIS · ATALAIA/AL' : 'REFERENCIAL CURRICULAR ANOS INICIAIS · ATALAIA/AL',
      fileName: `${isPei ? 'pei' : 'plano'}-ai-${pdfSlug(title) || 'documento'}.pdf`,
    })
  }

  // ── PEI helpers ────────────────────────────────────────────────────────────

  // Salva o PEI gerado como rascunho. A revisao do regente, a colaboracao do
  // AEE, a consulta a familia e a publicacao como vigente sao feitas nos
  // paineis proprios (AEE / Familia / Coordenacao).
  async function savePei() {
    if (!generated.trim()) { showToast('Gere o PEI antes de salvar.'); return }
    if (!user) { showToast('Faca login para salvar o PEI.'); return }
    setSavingPei(true)
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const url = editingPlanId ? `/api/plans/${editingPlanId}` : '/api/plans'
      const method = editingPlanId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
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
          is_published: false,
          plan_status: 'rascunho',
          skill_ids: selected.map(s => s.code),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar PEI')
      const savedId = data.data?.id || editingPlanId
      setEditingPlanId(savedId)
      setServerPlans(prev => {
        const updated = { id: savedId, title: form.title, content: generated, created_at: new Date().toISOString(), is_pei: true }
        const idx = prev.findIndex(p => p.id === savedId)
        return idx >= 0 ? prev.map((p, i) => i === idx ? updated : p) : [updated, ...prev]
      })
      showToast('PEI salvo como rascunho.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao salvar PEI')
    } finally {
      setSavingPei(false)
    }
  }

  // Envia o PEI (ja salvo como rascunho) para a fila de validacao do professor AEE.
  async function submitForAee() {
    if (!editingPlanId) { showToast('Salve o rascunho antes de enviar para o AEE.'); return }
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const res = await fetch(`/api/plans/${editingPlanId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: 'submit_aee' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar')
      showToast('PEI enviado para validação do professor AEE.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao enviar para o AEE')
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
            {(['aee_teacher', 'coordinator', 'admin', 'municipality_admin', 'super_admin'].includes(String(user?.user_metadata?.role || '')) || user?.email === 'admin@bncc.local') && (
              <Link className="nb" href="/aee">AEE</Link>
            )}
            <Link className="nb" href={slug ? `/${slug}` : '/'} style={{ opacity: .65, fontSize: 12 }}>Portais</Link>
            {user ? (
              <button className="nb" onClick={() => void signOut()}>Sair</button>
            ) : (
              <Link className="nb nb-cta" href="/auth/login">Login</Link>
            )}
            <button className="nb tut-open" onClick={openTutorial} aria-label="Abrir tutorial de uso" title="Como usar o portal">?</button>
          </nav>
        </div>
      </header>

      <PortalTutorial
        open={tutorialOpen}
        onClose={closeTutorial}
        steps={TUTORIAL_STEPS}
        masthead="ANOS INICIAIS · TUTORIAL"
      />

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
              <SkillsHowTo
                storageKey="ai_howto_seen"
                accentVar="var(--teal)"
                washVar="var(--teal-wash)"
                referencialLabel="Referencial Curricular de Atalaia — Anos Iniciais (1º ao 5º Ano)"
                onOpenTutorial={openTutorial}
              />

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
                <div className="est">
                  Nenhuma habilidade encontrada com os filtros aplicados.<br />
                  <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                    Dica: confira a grafia da busca ou experimente remover um dos filtros.
                  </span><br />
                  <button className="btn btn-out" style={{ marginTop: 12, fontSize: 12 }}
                    onClick={() => { setDiscipline(''); setYear(''); setQuery('') }}>
                    ✕ Limpar todos os filtros
                  </button>
                </div>
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
                peiSource={peiSource}
                onPlanKindChange={setPlanKind}
                onStudentChange={(studentId, student) => {
                  setSelectedStudentId(studentId)
                  setSelectedStudent(student || null)
                }}
                onPeiSourceChange={setPeiSource}
                onExistingPeiChange={setExistingPei}
              />
              <div className="fg">
                <Field label="Professor(a)" hint="Seu nome, como deve aparecer no cabeçalho do plano." example="Ex.: Ana Paula Ferreira">
                  <input value={form.teacher} onChange={e => updateForm('teacher', e.target.value)} placeholder="Nome completo" />
                </Field>
                <Field label="Escola" hint="Escola onde a aula será dada. Selecione na lista.">
                  <select value={form.school} onChange={e => updateForm('school', e.target.value)}>
                    <option value="">Selecione a escola</option>
                    {municipalSchools.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Ano/Turma" hint="Ano escolar da turma. A IA ajusta a linguagem e as atividades à faixa etária.">
                  <select value={form.grade_level} onChange={e => updateForm('grade_level', e.target.value)}>
                    <option value="">Selecione…</option>
                    {['1º Ano','2º Ano','3º Ano','4º Ano','5º Ano'].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Componente" hint="Disciplina/área da aula." example="Ex.: Ciências · Língua Portuguesa · Matemática">
                  <input value={form.subject} onChange={e => updateForm('subject', e.target.value)} placeholder="Ciências" />
                </Field>
                <Field label="Data" hint="Data prevista para a aula.">
                  <input type="date" value={form.date} onChange={e => updateForm('date', e.target.value)} />
                </Field>
                <Field label="Duração" hint="Tempo total da aula ou número de aulas." example="Ex.: 50 min · 2 aulas de 50 min">
                  <input value={form.duration} onChange={e => updateForm('duration', e.target.value)} placeholder="50 min" />
                </Field>
                <Field label="Tema da aula" wide hint="O assunto central da aula. Seja específico — quanto mais claro o tema, melhor o plano gerado." example={<>Ex.: <strong>A fauna e flora do Rio Paraíba do Meio</strong></>}>
                  <input value={form.title} onChange={e => updateForm('title', e.target.value)}
                    placeholder="Ex.: A fauna e flora do Rio Paraíba do Meio" />
                </Field>
                <Field label="Objetivos do professor" wide hint="O que você quer que os alunos aprendam ou consigam fazer ao fim da aula. Comece com verbos de ação." example={<>Ex.: <strong>Identificar animais e plantas da região; relacionar o rio à vida da comunidade.</strong></>}>
                  <textarea value={form.objectives} onChange={e => updateForm('objectives', e.target.value)}
                    placeholder="Descreva seus objetivos específicos para esta aula..." rows={3} />
                </Field>
                <Field label="Metodologia" wide hint="Como a aula será conduzida: estratégias, dinâmicas e organização da turma. Opcional — a IA sugere se ficar em branco." example={<>Ex.: <strong>Roda de conversa, observação de imagens e atividade em grupos.</strong></>}>
                  <textarea value={form.methodology} onChange={e => updateForm('methodology', e.target.value)} rows={2} placeholder="Como a aula será conduzida (opcional)" />
                </Field>
                <Field label="Recursos disponíveis" wide hint="Materiais e equipamentos que você tem para usar na aula." example={<>Ex.: <strong>Quadro, lápis de cor, imagens impressas, projetor.</strong></>}>
                  <textarea value={form.materials} onChange={e => updateForm('materials', e.target.value)} rows={2} placeholder="Materiais e equipamentos disponíveis" />
                </Field>
              </div>

              <div className="brow">
                <button className="btn btn-out" onClick={() => setView('skills')}>
                  {selected.length ? `${selected.length} habilidade${selected.length > 1 ? 's' : ''} selecionada${selected.length > 1 ? 's' : ''}` : '+ Selecionar habilidades'}
                </button>
                <button className="btn btn-pri" disabled={generating} onClick={generatePlan}>
                  {generating
                    ? 'Gerando...'
                    : planKind === 'pei' && peiSource === 'use'
                      ? 'Usar PEI do AEE'
                      : planKind === 'pei' && existingPei
                        ? '✦ Gerar PEI combinando com o do AEE'
                        : '✦ Gerar plano com IA'}
                </button>
              </div>
            </div>

            {/* Output area */}
            <div className="oa">
              <div className="oa-toolbar">
                <span className="oa-label">Plano editável</span>
                <button className="btn btn-gh" onClick={downloadPdf}>Baixar PDF</button>
                {planKind === 'pei' ? (
                  <button className="btn btn-suc" disabled={!generated || savingPei} onClick={() => void savePei()}>
                    {savingPei ? 'Salvando...' : 'Salvar rascunho'}
                  </button>
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

              {planKind === 'pei' && generated && (
                <div className="pei-next" style={{ marginTop: 12, padding: '14px 16px', border: '2px solid var(--blue)', background: 'var(--blue-wash)' }}>
                  <div className="bnac-form-section" style={{ marginBottom: 6 }}>Proximos passos do PEI</div>
                  <p className="pei-note">
                    Salve o rascunho e envie para validação do professor AEE. Depois ele segue para a família
                    e, ao final, fica vigente. A coordenação acompanha todo o fluxo.
                  </p>
                  <div className="brow" style={{ marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-pri"
                      disabled={!editingPlanId}
                      title={editingPlanId ? '' : 'Salve o rascunho primeiro'}
                      onClick={() => void submitForAee()}
                    >
                      Enviar para validação do AEE
                    </button>
                    <Link className="btn btn-out" href="/aee">Painel AEE</Link>
                    <Link className="btn btn-out" href="/coordinator">Coordenação</Link>
                  </div>
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
              <p>Organizados por categoria e por data de criação.</p>
            </div>
            <button className="btn btn-pri" onClick={() => { setEditingPlanId(null); setGenerated(''); setView('plan') }}>+ Criar novo plano</button>
          </div>

          {user && (
            <>
              <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.08em' }}>PEI</h2>
              {loadingServerPlans ? (
                <div className="est">Carregando...</div>
              ) : serverPlans.filter(p => p.is_pei).length === 0 ? (
                <div className="est" style={{ marginBottom: 24 }}>Nenhum PEI salvo ainda.</div>
              ) : (
                <div className="plans-grid" style={{ marginBottom: 24 }}>
                  {serverPlans.filter(p => p.is_pei).map(plan => (
                    <article className="plan-item" key={plan.id}>
                      <div className="pi-header">
                        <h2 className="pi-title">{plan.title || 'PEI sem título'}</h2>
                        <div className="pi-date">{new Date(plan.created_at).toLocaleString('pt-BR')}</div>
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', padding: '3px 8px', border: '1.5px solid var(--ink)', background: 'var(--paper)' }}>
                          {peiStatusLabel(plan.plan_status)}
                        </span>
                      </div>
                      <p className="plan-preview">{plan.content.slice(0, 200)}…</p>
                      <div className="pi-actions">
                        <button className="btn btn-pri" onClick={() => {
                          setEditingPlanId(plan.id)
                          setGenerated(plan.content)
                          setPlanKind('pei')
                          setView('plan')
                          showToast('PEI carregado para edicao.')
                        }}>Editar</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Plano de aula</h2>
            </>
          )}
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
