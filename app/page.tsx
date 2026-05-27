'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { municipalSchools } from '@/lib/education-options'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
)

type Skill = {
  id: string
  code: string
  name: string
  description: string
  grade_level: string
  competency: string
  subject: string
  axis: string
}

type Plan = {
  id: string
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
  skill_ids: string[]
  content: string
  created_at: string
  coordinator_viewed_at?: string
  coordinator_name?: string
  coordinator_note?: string
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
  school: 'Escola Municipal',
  grade_level: '5',
  subject: 'Computação',
  date: new Date().toISOString().slice(0, 10),
  duration: '50 minutos',
  methodology: 'Aprendizagem baseada em projeto',
  objectives: '',
  materials: 'Quadro, caderno, celular ou computador compartilhado',
  notes: '',
}

const tagClass: Record<string, string> = {
  Portugues: 'tp',
  'Português': 'tp',
  Matematica: 'tm',
  'Matemática': 'tm',
  Ciencias: 'tc',
  'Ciências': 'tc',
  'Cultura Digital': 'tcd',
  Computacao: 'tcd',
  'Computação': 'tcd',
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function normalizePdfText(value: string) {
  return value
    .replace(/Ã¡/g, 'á')
    .replace(/Ã /g, 'à')
    .replace(/Ã¢/g, 'â')
    .replace(/Ã£/g, 'ã')
    .replace(/Ã©/g, 'é')
    .replace(/Ãª/g, 'ê')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ã´/g, 'ô')
    .replace(/Ãµ/g, 'õ')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã§/g, 'ç')
    .replace(/Ã/g, 'Á')
    .replace(/Ã‰/g, 'É')
    .replace(/ÃŠ/g, 'Ê')
    .replace(/Ã/g, 'Í')
    .replace(/Ã“/g, 'Ó')
    .replace(/Ã”/g, 'Ô')
    .replace(/Ãš/g, 'Ú')
    .replace(/Ã‡/g, 'Ç')
    .replace(/Â/g, '')
    .replace(/â€“|â€”/g, '-')
    .replace(/â€œ|â€/g, '"')
    .replace(/â€˜|â€™/g, "'")
    .replace(/â€¢/g, '-')
    .replace(/\uFFFD/g, '')
}

export default function Home() {
  const { user, signOut } = useAuth()
  const isLoggedIn = Boolean(user)
  const [view, setView] = useState<'skills' | 'plan' | 'saved'>('skills')
  const [skills, setSkills] = useState<Skill[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [grade, setGrade] = useState('')
  const [subject, setSubject] = useState('')
  const [axis, setAxis] = useState('')
  const [form, setForm] = useState<PlanForm>(emptyForm)
  const [generated, setGenerated] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [activeSkill, setActiveSkill] = useState<Skill | null>(null)

  useEffect(() => {
    void loadSkills()
  }, [])

  useEffect(() => {
    if (user) {
      void loadPlans()
    } else {
      setPlans([])
      if (view === 'saved') setView('skills')
    }
  }, [user, view])

  async function getAccessToken() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token
  }

  useEffect(() => {
    if (!user) return

    setForm((current) => ({
      ...current,
      teacher: current.teacher || String(user.user_metadata?.name || user.user_metadata?.full_name || ''),
      school:
        current.school === emptyForm.school
          ? String(user.user_metadata?.school || current.school)
          : current.school,
      subject:
        current.subject === emptyForm.subject
          ? String(user.user_metadata?.subject || current.subject).replace(/^.*: /, '')
          : current.subject,
    }))
  }, [user])

  async function loadSkills() {
    const response = await fetch('/api/skills')
    const payload = await response.json()
    setSkills(payload.data || [])
  }

  async function loadPlans() {
    const token = await getAccessToken()
    if (!token) {
      setPlans([])
      return
    }

    const response = await fetch('/api/plans', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (response.status === 401) {
      setPlans([])
      return
    }
    const payload = await response.json()
    setPlans(payload.data || [])
  }

  const filteredSkills = useMemo(() => {
    const text = normalizeText(query)

    return skills.filter((skill) => {
      const matchesText = text
        ? normalizeText(`${skill.code} ${skill.name} ${skill.description} ${skill.subject} ${skill.axis}`).includes(text)
        : true
      const matchesGrade = grade ? skill.grade_level === grade : true
      const matchesSubject = subject ? skill.subject === subject : true
      const matchesAxis = axis ? skill.axis === axis : true

      return matchesText && matchesGrade && matchesSubject && matchesAxis
    })
  }, [axis, grade, query, skills, subject])

  const selectedSkills = useMemo(
    () => skills.filter((skill) => selected.includes(skill.id)),
    [selected, skills],
  )
  const grades = useMemo(() => [...new Set(skills.map((skill) => skill.grade_level))].sort(), [skills])
  const subjects = useMemo(() => [...new Set(skills.map((skill) => skill.subject))].sort(), [skills])
  const axes = useMemo(() => [...new Set(skills.map((skill) => skill.axis))].sort(), [skills])

  function showToast(text: string) {
    setMessage(text)
    window.setTimeout(() => setMessage(''), 2800)
  }

  function toggleSkill(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  function updateForm(field: keyof PlanForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function planPayload(content = generated) {
    return {
      ...form,
      skill_ids: selected,
      content,
    }
  }

  async function generatePlan() {
    if (!form.title.trim()) {
      showToast('Informe o tema do plano.')
      return
    }

    if (!selected.length) {
      showToast('Selecione ao menos uma habilidade.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/plans/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planPayload('')),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Erro ao gerar')
      }

      setGenerated(payload.data.content)
      setView('plan')
      showToast('Plano gerado. Edite antes de salvar, se quiser.')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao gerar plano')
    } finally {
      setLoading(false)
    }
  }

  async function savePlan() {
    if (!user) {
      showToast('Faça login para salvar planos. Visitantes podem apenas gerar e baixar PDF.')
      return
    }

    if (!generated.trim()) {
      await generatePlan()
      return
    }

    setLoading(true)
    try {
      const token = await getAccessToken()
      const response = await fetch('/api/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(planPayload(generated)),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Erro ao salvar')
      }

      await loadPlans()
      setView('saved')
      showToast('Plano salvo em Meus Planos.')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao salvar plano')
    } finally {
      setLoading(false)
    }
  }

  async function deleteSavedPlan(id: string) {
    const token = await getAccessToken()
    const response = await fetch(`/api/plans/${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (response.ok) {
      await loadPlans()
      showToast('Plano excluído.')
    }
  }

  function loadSavedPlan(plan: Plan) {
    setForm({
      title: plan.title,
      teacher: plan.teacher,
      school: plan.school,
      grade_level: plan.grade_level,
      subject: plan.subject,
      date: plan.date,
      duration: plan.duration,
      methodology: plan.methodology,
      objectives: plan.objectives,
      materials: plan.materials,
      notes: plan.notes,
    })
    setSelected(plan.skill_ids)
    setGenerated(plan.content)
    setView('plan')
    showToast('Plano carregado para edição.')
  }

  async function downloadPlanPdf(plan?: Plan) {
    const title = normalizePdfText(plan?.title || form.title || 'plano')
    const text = normalizePdfText(plan?.content || generated)
    if (!text.trim()) {
      showToast('Gere o plano antes de baixar em PDF.')
      return
    }

    const safeTitle = normalizeText(title).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const marginX = 18
    const contentWidth = pageWidth - marginX * 2
    let y = 18

    const meta = plan || {
      title: form.title,
      teacher: form.teacher,
      school: form.school,
      grade_level: form.grade_level,
      subject: form.subject,
      date: form.date,
      duration: form.duration,
      skill_ids: selected,
    }

    function line(x1: number, y1: number, x2: number, y2: number, width = 0.2) {
      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(width)
      doc.line(x1, y1, x2, y2)
    }

    function addPageIfNeeded(height = 10) {
      if (y + height <= pageHeight - 20) return
      doc.addPage()
      y = 18
      drawHeader(false)
    }

    function drawHeader(firstPage: boolean) {
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(firstPage ? 14 : 9)
      doc.text(firstPage ? 'PLANO DE AULA' : 'Plano de aula', marginX, y)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text('Portal BNCC Computação | Secretaria Municipal de Educação de Atalaia/AL', marginX, y + 5)
      line(marginX, y + 8, pageWidth - marginX, y + 8, 0.35)
      y += firstPage ? 16 : 13
    }

    function addWrapped(textValue: string, options?: { size?: number; bold?: boolean; indent?: number }) {
      const size = options?.size || 9
      const indent = options?.indent || 0
      const lineHeight = size * 0.43
      const lines = doc.splitTextToSize(textValue, contentWidth - indent)
      addPageIfNeeded(lines.length * lineHeight + 4)
      doc.setFont('helvetica', options?.bold ? 'bold' : 'normal')
      doc.setFontSize(size)
      doc.setTextColor(0, 0, 0)
      doc.text(lines, marginX + indent, y)
      y += lines.length * lineHeight + 2.2
    }

    function addSection(titleValue: string) {
      addPageIfNeeded(12)
      y += 2
      line(marginX, y - 3, pageWidth - marginX, y - 3, 0.2)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(0, 0, 0)
      doc.text(titleValue.toUpperCase(), marginX, y + 2)
      line(marginX, y + 5, pageWidth - marginX, y + 5, 0.2)
      y += 11
    }

    drawHeader(true)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(String(title).toUpperCase(), marginX, y, { maxWidth: contentWidth })
    y += 10

    addSection('Identificação')
    addWrapped(`Professor(a): ${normalizePdfText(meta.teacher || 'Professor(a)')}`)
    addWrapped(`Escola: ${normalizePdfText(meta.school || 'Escola Municipal')} | Município: Atalaia - AL`)
    addWrapped(`Ano/Turma: ${normalizePdfText(meta.grade_level || '-')} | Componente: ${normalizePdfText(meta.subject || '-')}`)
    addWrapped(`Data: ${meta.date || new Date().toLocaleDateString('pt-BR')} | Duração: ${normalizePdfText(meta.duration || '-')}`)

    const skipHeadings = new Set(['PLANO DE AULA', title.toUpperCase(), 'IDENTIFICAÇÃO', 'IDENTIFICACAO'])
    const sectionNames = new Set([
      'OBJETIVOS',
      'HABILIDADES DA BNCC COMPUTAÇÃO',
      'HABILIDADES DA BNCC COMPUTACAO',
      'CONTEÚDOS',
      'CONTEUDOS',
      'METODOLOGIA',
      'DESENVOLVIMENTO DA AULA',
      'RECURSOS DIDÁTICOS',
      'RECURSOS DIDATICOS',
      'AVALIAÇÃO',
      'AVALIACAO',
      'OBSERVAÇÕES',
      'OBSERVACOES',
      'REFERÊNCIAS',
      'REFERENCIAS',
    ])

    text.split('\n').forEach((rawLine) => {
      const lineText = rawLine.trim()
      if (!lineText) {
        y += 1.8
        return
      }

      const upper = lineText.toUpperCase()
      if (skipHeadings.has(upper) || lineText.includes('Secretaria Municipal de Educação de Atalaia/AL')) return

      if (sectionNames.has(upper)) {
        addSection(lineText)
        return
      }

      if (lineText.endsWith(':') || /^(Objetivo geral|Objetivos específicos|Objetivos especificos|Momento inicial|Desenvolvimento|Encerramento)/i.test(lineText)) {
        addWrapped(lineText, { bold: true })
        return
      }

      if (lineText.startsWith('- ')) {
        addWrapped(`- ${lineText.slice(2)}`, { indent: 3 })
        return
      }

      addWrapped(lineText)
    })

    const totalPages = doc.getNumberOfPages()
    for (let page = 1; page <= totalPages; page += 1) {
      doc.setPage(page)
      line(marginX, pageHeight - 14, pageWidth - marginX, pageHeight - 14, 0.2)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(0, 0, 0)
      doc.text(`Portal BNCC Computação - Página ${page} de ${totalPages}`, marginX, pageHeight - 8)
      doc.text(new Date().toLocaleDateString('pt-BR'), pageWidth - marginX, pageHeight - 8, { align: 'right' })
    }

    doc.save(`plano-${safeTitle || 'aula'}.pdf`)
  }

  return (
    <main>
      <header id="hdr">
        <div className="hdr-in">
          <div className="logo">
            <div className="logo-ic">BN</div>
            <div>
              <div className="logo-t">Portal BNCC Computação</div>
              <div className="logo-s">Secretaria Municipal de Educação · Atalaia/AL</div>
            </div>
          </div>
          <nav className="hdr-nav" aria-label="Navegação principal">
            <button className={`nb ${view === 'skills' ? 'on' : ''}`} onClick={() => setView('skills')}>
              Pesquisar
            </button>
            <button className={`nb ${view === 'plan' ? 'on' : ''}`} onClick={() => setView('plan')}>
              Plano <span className="nbadge">{selected.length}</span>
            </button>
            {isLoggedIn && (
              <button className={`nb ${view === 'saved' ? 'on' : ''}`} onClick={() => setView('saved')}>
                Meus Planos <span className="nbadge">{plans.length}</span>
              </button>
            )}
            <Link className="nb" href="/experiences">
              Experiências
            </Link>
            {user?.user_metadata?.role === 'coordinator' && (
              <Link className="nb" href="/coordinator">
                Coordenação
              </Link>
            )}
            {user ? (
              <>
                <span className="nb user-pill">Logado: {user.user_metadata?.name || user.email}</span>
                <button className="nb" onClick={() => void signOut()}>
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link className="nb" href="/auth/login">
                  Login
                </Link>
                <Link className="nb nb-cta" href="/auth/signup">
                  Cadastrar professor
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {view === 'skills' && (
        <section className="pg">
          <div className="stats">
            <Stat value={skills.length} label="habilidades" />
            <Stat value={grades.length} label="anos/etapas" />
            <Stat value={subjects.length} label="componentes" />
            <Stat value={axes.length} label="eixos BNCC" />
          </div>

          <div className="fbar">
            <div className="sw">
              <span className="sw-icon">⌕</span>
              <input
                type="search"
                placeholder="Pesquisar por código, habilidade, eixo ou componente"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <select value={grade} onChange={(event) => setGrade(event.target.value)} aria-label="Filtrar por ano">
              <option value="">Todos os anos</option>
              {grades.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select value={subject} onChange={(event) => setSubject(event.target.value)} aria-label="Filtrar por componente">
              <option value="">Componentes</option>
              {subjects.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select value={axis} onChange={(event) => setAxis(event.target.value)} aria-label="Filtrar por eixo">
              <option value="">Eixos</option>
              {axes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <span className="fcount">{filteredSkills.length} resultados</span>
          </div>

          <div className="grid">
            {filteredSkills.map((skill) => {
              const isSelected = selected.includes(skill.id)
              return (
                <article className={`scard ${isSelected ? 'in-plan' : ''}`} key={skill.id}>
                  <div className="ctags">
                    <span className="tag ta">{skill.grade_level}</span>
                    <span className={`tag ${tagClass[skill.subject] || 'tm'}`}>{skill.subject}</span>
                    <span className="tag tcd">{skill.axis}</span>
                  </div>
                  <div className="ceixo">{skill.code}</div>
                  <h2 className="cobj">{skill.name}</h2>
                  <p className="chab">{skill.description}</p>
                  <div className="cmeta">{skill.competency}</div>
                  <div className="cacts">
                    <button className="bsm bdet" onClick={() => setActiveSkill(skill)}>
                      Detalhes
                    </button>
                    <button className="bsm bsug" onClick={() => {
                      setForm((current) => ({ ...current, title: skill.name, subject: skill.subject, grade_level: skill.grade_level }))
                      if (!selected.includes(skill.id)) toggleSkill(skill.id)
                      setView('plan')
                    }}>
                      Usar
                    </button>
                    <button className={`bsm badd ${isSelected ? 'added' : ''}`} onClick={() => toggleSkill(skill.id)}>
                      {isSelected ? 'Remover' : '+ Plano'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

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
              <div className="fg">
                <Field label="Professor(a)">
                  <input value={form.teacher} onChange={(event) => updateForm('teacher', event.target.value)} placeholder="Nome do professor" />
                </Field>
                <Field label="Escola">
                  <input
                    list="municipal-schools"
                    value={form.school}
                    onChange={(event) => updateForm('school', event.target.value)}
                  />
                  <datalist id="municipal-schools">
                    {municipalSchools.map((school) => (
                      <option key={school} value={school} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Ano/Turma">
                  <input value={form.grade_level} onChange={(event) => updateForm('grade_level', event.target.value)} />
                </Field>
                <Field label="Componente">
                  <input value={form.subject} onChange={(event) => updateForm('subject', event.target.value)} />
                </Field>
                <Field label="Data">
                  <input type="date" value={form.date} onChange={(event) => updateForm('date', event.target.value)} />
                </Field>
                <Field label="Duração">
                  <input value={form.duration} onChange={(event) => updateForm('duration', event.target.value)} />
                </Field>
                <Field label="Tema da aula" wide required>
                  <input value={form.title} onChange={(event) => updateForm('title', event.target.value)} placeholder="Ex.: Fake news e cidadania digital" />
                </Field>
                <Field label="Objetivos do professor" wide>
                  <textarea value={form.objectives} onChange={(event) => updateForm('objectives', event.target.value)} />
                </Field>
                <Field label="Metodologia" wide>
                  <textarea value={form.methodology} onChange={(event) => updateForm('methodology', event.target.value)} />
                </Field>
                <Field label="Recursos disponíveis" wide>
                  <textarea value={form.materials} onChange={(event) => updateForm('materials', event.target.value)} />
                </Field>
              </div>

              <div className="brow">
                <button className="btn btn-out" onClick={() => setView('skills')}>Adicionar habilidades</button>
                <button className="btn btn-pri" disabled={loading} onClick={generatePlan}>
                  {loading ? 'Gerando...' : 'Gerar plano'}
                </button>
              </div>
            </div>

            <div className="oa">
              <div className="oa-toolbar">
                <span className="oa-label">Plano editável</span>
                <button className="btn btn-gh" onClick={() => void downloadPlanPdf()}>Baixar PDF</button>
                {isLoggedIn ? (
                  <button className="btn btn-suc" disabled={loading || !generated} onClick={savePlan}>Salvar</button>
                ) : (
                  <Link className="btn btn-suc" href="/auth/login">Login para salvar</Link>
                )}
              </div>
              {loading && <div className="gbanner"><span className="spin" /> Gerando um plano estruturado...</div>}
              <textarea
                id="po"
                value={generated}
                onChange={(event) => setGenerated(event.target.value)}
                placeholder="O plano gerado aparecerá aqui. Você pode editar o texto antes de salvar."
              />
            </div>
          </div>

          <aside className="sb">
            <div className="sbt">
              Habilidades selecionadas <span className="sbc">{selected.length}</span>
            </div>
            {selectedSkills.length ? (
              selectedSkills.map((skill) => (
                <div className="ssi" key={skill.id}>
                  <button className="ssrm" onClick={() => toggleSkill(skill.id)} aria-label={`Remover ${skill.code}`}>
                    ×
                  </button>
                  <div className="ssic">{skill.code}</div>
                  <div className="ssio">{skill.name}</div>
                  <div className="ssims">{skill.subject} · {skill.axis}</div>
                </div>
              ))
            ) : (
              <div className="esel">Nenhuma habilidade selecionada. Use a aba Pesquisar para adicionar.</div>
            )}
          </aside>
        </section>
      )}

      {view === 'saved' && isLoggedIn && (
        <section className="pg">
          <div className="saved-head">
            <div>
              <h1>Meus Planos</h1>
              <p>Planos salvos na sua conta.</p>
            </div>
            <button className="btn btn-pri" onClick={() => setView('plan')}>+ Criar Novo Plano</button>
          </div>
          <div className="plans-grid">
            {plans.length ? (
              plans.map((plan) => (
                <article className="plan-item" key={plan.id}>
                  <div className="pi-header">
                    <div>
                      <h2 className="pi-title">{plan.title}</h2>
                      <div className="pi-date">Salvo em {new Date(plan.created_at).toLocaleString('pt-BR')}</div>
                    </div>
                  </div>
                  <div className="pi-meta">
                    <span className="tag ta">{plan.grade_level}</span>
                    <span className={`tag ${tagClass[plan.subject] || 'tm'}`}>{plan.subject}</span>
                    <span className="tag ta">{plan.duration}</span>
                    <span className="tag ta">{plan.skill_ids.length} habilidades</span>
                  </div>
                  <p className="plan-preview">{plan.content.slice(0, 180)}...</p>
                  <div className="review-status">
                    {plan.coordinator_viewed_at ? (
                      <>
                        <strong>Visualizado pela coordenação</strong>
                        <span>
                          {plan.coordinator_name || 'Coordenador(a)'} em{' '}
                          {new Date(plan.coordinator_viewed_at).toLocaleString('pt-BR')}
                        </span>
                        {plan.coordinator_note && <p>{plan.coordinator_note}</p>}
                      </>
                    ) : (
                      <span>Aguardando visualização da coordenação</span>
                    )}
                  </div>
                  <div className="pi-actions">
                    <button className="btn btn-suc" onClick={() => void downloadPlanPdf(plan)}>PDF</button>
                    <button className="btn btn-pri" onClick={() => loadSavedPlan(plan)}>Editar</button>
                    <button className="btn btn-gh" onClick={() => deleteSavedPlan(plan.id)}>Excluir</button>
                  </div>
                </article>
              ))
            ) : (
              <div className="est">Nenhum plano salvo ainda. Crie e salve seu primeiro plano.</div>
            )}
          </div>
        </section>
      )}

      {activeSkill && (
        <div className="mbk" onClick={() => setActiveSkill(null)}>
          <div className="mdl" onClick={(event) => event.stopPropagation()}>
            <div className="mdl-hdr">
              <div>
                <div className="ceixo">{activeSkill.code}</div>
                <h2 className="mdl-title">{activeSkill.name}</h2>
              </div>
              <button className="mdl-close" onClick={() => setActiveSkill(null)}>×</button>
            </div>
            <div className="ms">
              <div className="mst">Descrição</div>
              <p className="mstx">{activeSkill.description}</p>
            </div>
            <div className="codes">
              <span className="chip">{activeSkill.grade_level}</span>
              <span className="chip">{activeSkill.subject}</span>
              <span className="chip chip-g">{activeSkill.axis}</span>
              <span className="chip">{activeSkill.competency}</span>
            </div>
            <div className="brow">
              <button className="btn btn-pri" onClick={() => {
                toggleSkill(activeSkill.id)
                setActiveSkill(null)
              }}>
                {selected.includes(activeSkill.id) ? 'Remover do plano' : 'Adicionar ao plano'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div id="toast" className={message ? 'show' : ''}>{message}</div>
    </main>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="sc">
      <div className="sc-ic">•</div>
      <div>
        <div className="sc-n">{value}</div>
        <div className="sc-l">{label}</div>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
  wide,
  required,
}: {
  label: string
  children: React.ReactNode
  wide?: boolean
  required?: boolean
}) {
  return (
    <label className={`fgr ${wide ? 's2' : ''}`}>
      <span className="fl">{label}{required && <span className="req">*</span>}</span>
      {children}
    </label>
  )
}
