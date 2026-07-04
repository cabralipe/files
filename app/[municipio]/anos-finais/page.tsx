'use client'

import { supabase } from '@/lib/supabase-client'

import { useState, useMemo, useEffect } from 'react'
import Link from '@/lib/m-link'
import { useAuth } from '@/hooks/useAuth'
import { municipalSchools, schoolsFor } from '@/lib/education-options'
import { useMunicipality } from '@/lib/municipality-context'
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
  school: 'Escola Municipal',
  grade_level: '',
  subject: 'Anos Finais',
  date: '',
  duration: '50 minutos',
  objectives: '',
  methodology: '',
  materials: '',
  notes: '',
}

// ── Design helpers ─────────────────────────────────────────────────────────────

const DISC_COLORS: Record<string, { bg: string; fg: string }> = {
  'Língua Portuguesa': { bg: 'var(--red-wash)',     fg: 'var(--red-deep)' },
  'Língua Inglesa':    { bg: 'var(--blue-wash)',     fg: 'var(--blue-deep)' },
  'Arte':              { bg: 'var(--plum-wash)',     fg: 'var(--plum)' },
  'Educação Física':   { bg: 'var(--blue-wash)',     fg: 'var(--blue)' },
  'Geografia':         { bg: 'var(--teal-wash)',     fg: 'var(--teal)' },
  'História':          { bg: 'var(--mustard-wash)',  fg: 'var(--mustard-deep)' },
  'Ensino Religioso':  { bg: 'var(--blue-wash)',     fg: 'var(--blue-deep)' },
  'Ciências':          { bg: 'var(--teal-wash)',     fg: 'var(--teal-deep)' },
  'Matemática':        { bg: 'var(--red-wash)',      fg: 'var(--red-deep)' },
}

const YEAR_ORDER = [
  '6º Ano','7º Ano','8º Ano','9º Ano',
  '6º e 7º Ano','8º e 9º Ano','6º ao 9º Ano',
]

const PAGE_SIZE = 24

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    icon: 'AF',
    iconStyle: { background: 'var(--blue)', color: 'var(--paper-soft)' },
    title: 'Bem-vindo aos Anos Finais!',
    body: 'Este portal reúne as habilidades do Referencial Curricular do município para o 6º ao 9º Ano, com desdobramentos contextualizados para a realidade local. Veja como usar em poucos passos.',
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
    iconStyle: { background: 'var(--blue-wash)', color: 'var(--ink)' },
    title: 'Busque e filtre',
    body: 'Pesquise por código (ex.: EF67LP01), palavra-chave ou objeto de conhecimento. Combine com os filtros de disciplina e ano para chegar rápido ao que precisa.',
    selector: '.fbar',
  },
  {
    icon: '▤',
    iconStyle: { background: 'var(--paper)', color: 'var(--ink)' },
    title: 'Conheça o card de habilidade',
    body: 'Cada card traz o código oficial, a habilidade e o objeto de conhecimento. Clique em "Detalhes" para ver o desdobramento territorializado do município, e em "+ Plano" para usar a habilidade no seu plano de aula.',
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
    iconStyle: { background: 'var(--teal-wash)', color: 'var(--ink)' },
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

export default function AnosFinaisPage() {
  const { user, signOut } = useAuth()
  const { slug, municipality } = useMunicipality()
  const muniName = municipality?.name || 'Município'
  const muniUf = municipality?.state || ''
  const muniLabel = `${muniName}${muniUf ? '/' + muniUf : ''}`
  const schools = schoolsFor(municipality)
  const muniLabelDash = `${muniName}${muniUf ? '-' + muniUf : ''}`
  const { open: tutorialOpen, openTutorial, closeTutorial } = usePortalTutorial('af_tutorial_seen')

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
  const [generated, setGenerated] = useState('')
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [phrase, setPhrase] = useState('')
  const [toast, setToast] = useState('')

  // saved plans
  const [saved, setSaved] = useState<Array<{ id: string; name: string; content: string; createdAt: string }>>([])

  // Set today's date after mount
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    setForm((f) => f.date ? f : { ...f, date: today })
  }, [])

  // Load skills JSON
  useEffect(() => {
    void import('../../../public/anos-finais-skills.json').then(mod => {
      setSkills(mod.default as Skill[])
      setLoading(false)
    })
  }, [])

  // Load saved plans
  useEffect(() => {
    try {
      const raw = localStorage.getItem('af-plans')
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
    const all = [...new Set(skills.map(s => s.year))]
    return all.sort((a, b) => {
      const ia = YEAR_ORDER.indexOf(a), ib = YEAR_ORDER.indexOf(b)
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
    `📚 Consultando o Referencial Curricular de ${muniLabelDash}...`,
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
    if (!form.title.trim()) { showToast('Informe o tema do plano.'); return }
    if (!form.grade_level.trim()) { showToast('Informe o ano/turma.'); return }
    if (!selected.length) { showToast('Selecione ao menos uma habilidade.'); return }

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
      const res = await fetch('/api/plans/generate-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ...form, skills_context }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar')
      const text: string = data.data?.content || ''
      const warning: string = data.data?.warning || ''
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
          showToast(warning || 'Plano gerado! Edite antes de salvar.')
        } else {
          setGenerated(text.slice(0, cur) + ' ▌')
          const ta = document.getElementById('af-plan-ta') as HTMLTextAreaElement | null
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
    if (!text.trim()) { showToast('Gere o plano antes de baixar em PDF.'); return }
    const title = sanitizePdfText(form.title || 'plano')

    await downloadRisoPdf({
      docType: 'PLANO DE AULA',
      docSubtitle: 'Referencial Curricular · Anos Finais',
      masthead: `Referencial Curricular Anos Finais · Secretaria Municipal de Educação · ${muniLabel}`,
      title,
      ink: [45, 64, 160],
      meta: [
        { label: 'Professor(a)', value: form.teacher || 'Professor(a)' },
        { label: 'Escola', value: `${form.school} · ${muniLabel}` },
        { label: 'Ano/Turma', value: form.grade_level },
        { label: 'Componente', value: form.subject },
        { label: 'Data', value: form.date || new Date().toLocaleDateString('pt-BR') },
        { label: 'Duração', value: form.duration || '—' },
      ],
      body: text,
      sectionNames: ['HABILIDADES DO REFERENCIAL CURRICULAR', 'OBJETIVOS DO PROFESSOR'],
      skipLines: ['PLANO DE AULA', title, 'Secretaria Municipal de Educação'],
      footerLeft: `REFERENCIAL CURRICULAR ANOS FINAIS · ${muniLabel.toUpperCase()}`,
      fileName: `plano-af-${pdfSlug(title) || 'aula'}.pdf`,
    })
  }

  // ── Save/load plans ────────────────────────────────────────────────────────

  function savePlanLocally() {
    if (!generated.trim()) { showToast('Gere o plano antes de salvar.'); return }
    const plan = { id: Date.now().toString(), name: form.title || 'Plano sem título', content: generated, createdAt: new Date().toISOString() }
    const next = [plan, ...saved]
    setSaved(next)
    localStorage.setItem('af-plans', JSON.stringify(next))
    showToast('Plano salvo localmente.')
  }

  function deleteSaved(id: string) {
    const next = saved.filter(p => p.id !== id)
    setSaved(next)
    localStorage.setItem('af-plans', JSON.stringify(next))
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
            <div className="logo-ic af-ic" />
            <div>
              <div className="logo-t">Referencial Curricular · Anos Finais</div>
              <div className="logo-s">Secretaria Municipal de Educação · {muniLabel}</div>
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
            <Link className="nb" href="/anos-iniciais">Anos Iniciais</Link>
            <Link className="nb" href="/computacao">BNCC Comp.</Link>
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
        masthead="ANOS FINAIS · TUTORIAL"
      />

      {/* ── View: Habilidades ── */}
      {view === 'skills' && (
        <section className="pg">
          {loading ? (
            <div className="af-loading">
              <div className="af-spin" />
              <span>Carregando referencial...</span>
            </div>
          ) : (
            <>
              <SkillsHowTo
                storageKey="af_howto_seen"
                accentVar="var(--blue)"
                washVar="var(--blue-wash)"
                referencialLabel={`Referencial Curricular de ${muniName} — Anos Finais (6º ao 9º Ano)`}
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
                        className={`scard af-scard${isSel ? ' in-plan' : ''}`}
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
                          {skill.campo ? skill.campo : `Referencial Curricular de ${muniName}`}
                        </div>

                        {isOpen && (
                          <div className="af-card-detail">
                            {skill.pratica && (
                              <p className="af-card-meta">
                                <strong>Prática:</strong> {skill.pratica}
                              </p>
                            )}
                            <p className="af-card-desdobr-label">Desdobramento territorializado</p>
                            <p className="af-card-desdobr">{skill.desdobramento || '—'}</p>
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
                    <button className="pg-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
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
                          >
                            {item}
                          </button>
                        ),
                      )
                    })()}
                    <button className="pg-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
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
              <h1 className="pct">Criar plano de aula · Anos Finais</h1>
              <div className="fg">
                <Field label="Professor(a)">
                  <input value={form.teacher} onChange={e => updateForm('teacher', e.target.value)} placeholder="Nome completo" />
                </Field>
                <Field label="Escola">
                  <input list="af-schools" value={form.school} onChange={e => updateForm('school', e.target.value)} />
                  <datalist id="af-schools">
                    {schools.map(s => <option key={s} value={s} />)}
                  </datalist>
                </Field>
                <Field label="Ano/Turma">
                  <select value={form.grade_level} onChange={e => updateForm('grade_level', e.target.value)}>
                    <option value="">Selecione…</option>
                    {['6º Ano','7º Ano','8º Ano','9º Ano'].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Componente">
                  <select value={form.subject} onChange={e => updateForm('subject', e.target.value)}>
                    <option value="">Selecione…</option>
                    {disciplines.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label="Data">
                  <input type="date" value={form.date} onChange={e => updateForm('date', e.target.value)} />
                </Field>
                <Field label="Duração">
                  <input value={form.duration} onChange={e => updateForm('duration', e.target.value)} />
                </Field>
                <Field label="Tema da aula" wide>
                  <input value={form.title} onChange={e => updateForm('title', e.target.value)}
                    placeholder={`Ex.: A formação territorial de ${muniLabel}`} />
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

            <div className="oa">
              <div className="oa-toolbar">
                <span className="oa-label">Plano editável</span>
                <button className="btn btn-gh" onClick={downloadPdf}>Baixar PDF</button>
                <button className="btn btn-suc" disabled={!generated} onClick={savePlanLocally}>Salvar</button>
              </div>

              {generating && (
                <div className="gbanner" style={{ borderRadius: 0, border: '2px solid var(--ink)', background: 'var(--paper-soft)', padding: '14px 16px', margin: '12px 0', boxShadow: '4px 4px 0 var(--ink)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div className="af-spin" style={{ width: 16, height: 16 }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>{phrase}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, marginLeft: 'auto' }}>{Math.round(progress)}%</span>
                  </div>
                  <div style={{ height: 8, background: 'white', border: '2px solid var(--ink)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--blue-soft)', width: `${progress}%`, transition: 'width .3s' }} />
                  </div>
                </div>
              )}

              <textarea
                id="af-plan-ta"
                value={generated}
                onChange={e => setGenerated(e.target.value)}
                placeholder="O plano gerado aparecerá aqui. Você pode editar antes de salvar ou baixar."
              />
            </div>
          </div>

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
              <p>Organizados por data de criação.</p>
            </div>
            <button className="btn btn-pri" onClick={() => { setGenerated(''); setView('plan') }}>+ Criar novo plano</button>
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
        .af-ic::before { content: "AF" !important; font-size: 14px !important; letter-spacing: -.05em; }
        .af-ic { background: var(--blue) !important; }

        .af-loading {
          display: flex; align-items: center; gap: 12px;
          padding: 80px 0; justify-content: center;
          font-family: var(--font-mono); font-size: 13px; color: var(--ink-muted);
        }
        .af-spin {
          width: 20px; height: 20px; border-radius: 50%;
          border: 2px solid var(--ink); border-top-color: transparent;
          animation: af-spin .7s linear infinite; flex-shrink: 0;
        }
        @keyframes af-spin { to { transform: rotate(360deg); } }

        .af-scard .cmeta { min-height: 45px; }
        .af-card-detail {
          border-top: 2px solid var(--ink); background: var(--paper); padding: 14px 16px; margin: 0 0 12px;
        }
        .af-card-meta { font-family: var(--font-mono); font-size: 11px; color: var(--ink-muted); margin-bottom: 10px; }
        .af-card-meta strong { color: var(--ink); }
        .af-card-desdobr-label {
          font-family: var(--font-mono); font-size: 10px; font-weight: 700;
          text-transform: uppercase; letter-spacing: .12em; color: var(--ink); margin-bottom: 6px;
        }
        .af-card-desdobr { font-size: 13px; line-height: 1.7; color: var(--ink-soft); white-space: pre-wrap; }
      `}</style>
    </main>
  )
}
