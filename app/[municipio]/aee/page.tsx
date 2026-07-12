'use client'

import { supabase } from '@/lib/supabase-client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { municipalSchools } from '@/lib/education-options'
import PeiReviewQueue from '@/components/PeiReviewQueue'
import PaeeBuilder from '@/components/PaeeBuilder'


type StudentForm = {
  full_name: string
  birth_date: string
  school_name: string
  grade_level: string
  class_name: string
  shift: 'manha' | 'tarde' | 'noite' | 'integral'
  enrollment_number: string
}

type ProfileForm = {
  public_target: 'deficiencia' | 'tea' | 'altas_habilidades_superdotacao' | 'transtorno_global_desenvolvimento' | 'outro'
  educational_needs: string
  learning_barriers: string
  communication_profile: string
  autonomy_profile: string
  social_interaction: string
  sensory_aspects: string
  motor_aspects: string
  cognitive_aspects: string
  reading_writing_level: string
  math_level: string
  interests: string
  strengths: string
  difficulties: string
  accessibility_resources: string
  assistive_technology: string
  curricular_adaptations: string
  evaluation_adaptations: string
  family_notes: string
  external_supports: string
  medication_notes: string
  emergency_notes: string
}

const emptyStudent: StudentForm = {
  full_name: '',
  birth_date: '',
  school_name: '',
  grade_level: '',
  class_name: '',
  shift: 'manha',
  enrollment_number: '',
}

const emptyProfile: ProfileForm = {
  public_target: 'outro',
  educational_needs: '',
  learning_barriers: '',
  communication_profile: '',
  autonomy_profile: '',
  social_interaction: '',
  sensory_aspects: '',
  motor_aspects: '',
  cognitive_aspects: '',
  reading_writing_level: '',
  math_level: '',
  interests: '',
  strengths: '',
  difficulties: '',
  accessibility_resources: '',
  assistive_technology: '',
  curricular_adaptations: '',
  evaluation_adaptations: '',
  family_notes: '',
  external_supports: '',
  medication_notes: '',
  emergency_notes: '',
}

function splitList(value: string) {
  return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean)
}

function Field({
  label,
  children,
  wide,
  hint,
  example,
}: {
  label: string
  children: React.ReactNode
  wide?: boolean
  hint?: string
  example?: React.ReactNode
}) {
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

// ── Acesso da família: cria a conta do responsável e o vínculo com o aluno ───

type StudentOption = { id: string; full_name: string; school_name?: string; grade_level?: string }
type FamilyLink = { id: string; name: string; email: string; relationship: string; created_at: string }

function FamilyLinksPanel() {
  const [students, setStudents] = useState<StudentOption[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [studentId, setStudentId] = useState('')
  const [links, setLinks] = useState<FamilyLink[]>([])
  const [loadingLinks, setLoadingLinks] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', relationship: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ email: string; temp_password: string | null; already_linked: boolean } | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const token = await getAccessToken()
        const res = await fetch('/api/students', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        const payload = await res.json()
        if (active && res.ok) setStudents(payload.data || [])
      } catch { /* lista vazia */ } finally {
        if (active) setLoadingStudents(false)
      }
    })()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!studentId) { setLinks([]); return }
    let active = true
    ;(async () => {
      setLoadingLinks(true)
      try {
        const token = await getAccessToken()
        const res = await fetch(`/api/family/links?student_id=${encodeURIComponent(studentId)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const payload = await res.json()
        if (active && res.ok) setLinks(payload.data || [])
      } catch { /* mantém lista */ } finally {
        if (active) setLoadingLinks(false)
      }
    })()
    return () => { active = false }
  }, [studentId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setResult(null)
    if (!studentId) { setError('Selecione o aluno.'); return }
    if (!form.name.trim() || !form.email.trim() || !form.relationship.trim()) {
      setError('Preencha nome, email e parentesco do responsável.')
      return
    }
    setSaving(true)
    try {
      const token = await getAccessToken()
      const res = await fetch('/api/family/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ student_id: studentId, ...form, email: form.email.trim().toLowerCase() }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Erro ao vincular responsável')
      setResult(payload.data)
      setForm({ name: '', email: '', relationship: '' })
      // Recarrega vínculos do aluno.
      const linksRes = await fetch(`/api/family/links?student_id=${encodeURIComponent(studentId)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const linksPayload = await linksRes.json()
      if (linksRes.ok) setLinks(linksPayload.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao vincular responsável')
    } finally {
      setSaving(false)
    }
  }

  async function removeLink(linkId: string) {
    try {
      const token = await getAccessToken()
      const res = await fetch('/api/family/links', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ link_id: linkId }),
      })
      if (res.ok) setLinks((prev) => prev.filter((l) => l.id !== linkId))
    } catch { /* mantém */ }
  }

  return (
    <div className="pc">
      {error && <div className="al-error" style={{ marginBottom: 14 }}>{error}</div>}
      {result && (
        <div className="al-ok" style={{ marginBottom: 14 }}>
          {result.already_linked ? (
            <>Este responsável já estava vinculado ao aluno.</>
          ) : result.temp_password ? (
            <>
              Acesso criado para <strong>{result.email}</strong>.<br />
              Senha provisória: <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 15 }}>{result.temp_password}</strong><br />
              Anote e entregue em mãos — ela não será exibida novamente. O responsável pode trocá-la
              em &quot;Esqueceu a senha?&quot; na tela de login.
            </>
          ) : (
            <>Responsável <strong>{result.email}</strong> vinculado ao aluno (a conta já existia).</>
          )}
        </div>
      )}

      <div className="fg">
        <Field label="Aluno" wide hint="O responsável só enxerga os documentos dos alunos vinculados a ele.">
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={loadingStudents}>
            <option value="">{loadingStudents ? 'Carregando alunos…' : 'Selecione o aluno'}</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}{s.grade_level ? ` — ${s.grade_level}` : ''}{s.school_name ? ` (${s.school_name})` : ''}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {studentId && (
        <>
          <div style={{ margin: '14px 0 8px', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-muted)' }}>
            Responsáveis vinculados
          </div>
          {loadingLinks ? (
            <div className="est">Carregando…</div>
          ) : links.length === 0 ? (
            <div className="est">Nenhum responsável vinculado ainda.</div>
          ) : (
            <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
              {links.map((l) => (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, border: '2px solid var(--ink)', background: 'var(--paper-soft)', padding: '10px 12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong>{l.name || l.email}</strong>
                    <span style={{ color: 'var(--ink-muted)', fontSize: 12 }}> · {l.relationship || 'responsável'} · {l.email}</span>
                  </div>
                  <button type="button" className="btn btn-gh" onClick={() => void removeLink(l.id)}>Remover</button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={submit}>
            <div className="fg">
              <Field label="Nome do responsável" hint="Como aparece no documento de ciência." example="Ex.: Maria José da Silva">
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nome completo" />
              </Field>
              <Field label="Email do responsável" hint="Será o login da família. Use um email pessoal do responsável.">
                <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="responsavel@email.com" />
              </Field>
              <Field label="Parentesco" hint="Relação com o aluno." example="Ex.: mãe · pai · avó · tutor legal">
                <input value={form.relationship} onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))} placeholder="mãe" />
              </Field>
            </div>
            <button type="submit" className="btn btn-pri" disabled={saving} style={{ marginTop: 12 }}>
              {saving ? 'Vinculando…' : '+ Criar acesso e vincular'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}

const AEE_STEPS = [
  { n: 1, label: 'Identificação' },
  { n: 2, label: 'Perfil e necessidades' },
  { n: 3, label: 'Potencialidades e recursos' },
  { n: 4, label: 'Família e saúde' },
]

type AeeView = 'cadastro' | 'paee' | 'paees' | 'peis' | 'familia'

const AEE_TABS: Array<{ key: AeeView; kicker: string; title: string; desc: string }> = [
  { key: 'cadastro', kicker: '01 · Base', title: 'Cadastro do aluno', desc: 'Identificação e ficha AEE do estudante' },
  { key: 'paee', kicker: '02 · Sala de recursos', title: 'Elaborar PAEE', desc: 'Plano de atendimento especializado, articulado ao PEI' },
  { key: 'paees', kicker: '03 · Acompanhar', title: 'PAEEs da escola', desc: 'Em elaboração, com a família e vigentes' },
  { key: 'peis', kicker: '04 · Validar', title: 'PEIs dos professores', desc: 'Aprovação dos PEIs enviados pelos regentes' },
  { key: 'familia', kicker: '05 · Família', title: 'Acesso da família', desc: 'Crie o acesso do responsável e vincule ao aluno' },
]

const AEE_TUTORIAL = [
  {
    icon: '✦',
    iconStyle: { background: 'var(--red)', color: 'var(--paper-soft)' },
    title: 'Bem-vindo(a) ao painel AEE',
    body: 'Aqui você registra o estudante e a ficha que a IA usa para gerar um PEI individualizado. O cadastro é dividido em 4 etapas curtas — preencha com calma.',
  },
  {
    icon: '1',
    iconStyle: { background: 'var(--mustard-wash)', color: 'var(--ink)' },
    title: 'Etapa 1 · Identificação',
    body: 'Dados básicos do aluno: nome, escola, ano e turno. Só o nome, a escola e o ano são obrigatórios — o resto ajuda a organizar.',
  },
  {
    icon: '2',
    iconStyle: { background: 'var(--blue-wash)', color: 'var(--ink)' },
    title: 'Etapas 2 a 4 · A ficha',
    body: 'Descreva necessidades, barreiras, potencialidades e recursos. Cada campo tem um exemplo embaixo e um balão de ajuda (?) ao lado do título. Quanto mais completo, melhor o PEI.',
  },
  {
    icon: '✓',
    iconStyle: { background: 'var(--teal-wash)', color: 'var(--ink)' },
    title: 'Salvar a ficha',
    body: 'Ao concluir, o aluno passa a aparecer no seletor de PEI dos portais. Quem gera o PEI ali é o professor regente, a partir desta ficha. Você não precisa gerar o PEI aqui.',
  },
  {
    icon: '4',
    iconStyle: { background: 'var(--teal-wash)', color: 'var(--ink)' },
    title: 'Validar os PEIs dos regentes',
    body: 'Quando o regente envia o PEI, ele chega na aba "Validar PEIs" para sua aprovação. Ao aprovar, o PEI segue para a ciência da família e depois passa a vigente.',
  },
  {
    icon: '✦',
    iconStyle: { background: 'var(--blue-wash)', color: 'var(--ink)' },
    title: 'Elaborar o PAEE',
    body: 'Na aba "Elaborar PAEE", a IA gera o Plano de Atendimento Educacional Especializado: organização do atendimento na Sala de Recursos, recursos de acessibilidade e articulação com o PEI da sala regular.',
  },
]

export default function AeePage() {
  const { user, loading: authLoading } = useAuth()
  const [student, setStudent] = useState<StudentForm>(emptyStudent)
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)
  const [view, setView] = useState<AeeView>('cadastro')
  const [showTutorial, setShowTutorial] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(0)

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('bncc_aee_tutorial_seen')) {
      setShowTutorial(true)
    }
  }, [])

  function closeTutorial() {
    setShowTutorial(false)
    setTutorialStep(0)
    if (typeof window !== 'undefined') {
      localStorage.setItem('bncc_aee_tutorial_seen', '1')
    }
  }

  const role = String(user?.user_metadata?.role || '')
  const isAdminByEmail = user?.email === 'admin@bncc.local'
  const canManage = isAdminByEmail || ['aee_teacher', 'coordinator', 'admin', 'municipality_admin', 'super_admin'].includes(role)

  function updateStudent<K extends keyof StudentForm>(field: K, value: StudentForm[K]) {
    setStudent((current) => ({ ...current, [field]: value }))
  }

  function updateProfile<K extends keyof ProfileForm>(field: K, value: ProfileForm[K]) {
    setProfile((current) => ({ ...current, [field]: value }))
  }

  async function saveStudent() {
    if (!student.full_name.trim() || student.full_name.trim().length < 2) {
      setError('Informe o nome completo do aluno (minimo 2 caracteres).')
      setStep(1)
      return
    }
    if (!student.school_name.trim() || student.school_name.trim().length < 2) {
      setError('Informe o nome da escola.')
      setStep(1)
      return
    }
    if (!student.grade_level.trim()) {
      setError('Informe o ano/turma do aluno.')
      setStep(1)
      return
    }

    try {
      setSaving(true)
      setError('')
      setMessage('')
      const token = await getAccessToken()
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          student,
          profile: {
            ...profile,
            learning_barriers: splitList(profile.learning_barriers),
            interests: splitList(profile.interests),
            strengths: splitList(profile.strengths),
            difficulties: splitList(profile.difficulties),
            accessibility_resources: splitList(profile.accessibility_resources),
            assistive_technology: splitList(profile.assistive_technology),
            curricular_adaptations: splitList(profile.curricular_adaptations),
            evaluation_adaptations: splitList(profile.evaluation_adaptations),
          },
        }),
      })
      const payload = await response.json()
      if (response.status === 401) throw new Error('Sessao expirada. Faca login novamente.')
      if (response.status === 403) throw new Error('Acesso restrito: apenas professor AEE, coordenacao ou administracao podem cadastrar alunos.')
      if (response.status === 400 && payload.error === 'Municipio nao identificado') throw new Error('Municipio nao identificado. Recarregue a pagina e tente novamente.')
      if (!response.ok) throw new Error(payload.error || 'Erro ao salvar aluno')
      setMessage('Aluno e ficha AEE salvos com sucesso.')
      setStudent(emptyStudent)
      setProfile(emptyProfile)
      setStep(1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar aluno')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading) {
    return <main className="auth-state"><div className="spin" /><p>Carregando...</p></main>
  }

  return (
    <main>

      <section className="pg">
        <div className="hero hero--panel">
          <div className="hero-text">
            <span className="hero-eyebrow">Educação Especial · AEE</span>
            <h1 className="hero-title">Painel da <span>Sala de Recursos</span></h1>
            <p className="hero-sub">
              Cadastre o estudante e a ficha AEE, elabore o PAEE e valide os PEIs da escola.
              O <strong>PEI</strong> organiza o ensino na sala regular; o <strong>PAEE</strong> organiza o
              atendimento especializado — e os dois conversam entre si.
            </p>
            <div className="hero-meta">
              <span className="tag tp">Ficha AEE</span>
              <span className="tag tm">PEI · sala regular</span>
              <span className="tag tc">PAEE · sala de recursos</span>
              <span className="tag ta">Ciência da família</span>
            </div>
          </div>
        </div>

        {!user && <div className="al-error">Faça login para acessar o painel AEE.</div>}
        {user && !canManage && <div className="al-error">Acesso restrito ao professor AEE, coordenação ou administração.</div>}

        {user && canManage && (
          <>
            <div className="aee-tabs" role="tablist" aria-label="Seções do painel AEE">
              {AEE_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={view === tab.key}
                  className={`aee-tab${view === tab.key ? ' on' : ''}`}
                  onClick={() => setView(tab.key)}
                >
                  <span className="aee-tab-k">{tab.kicker}</span>
                  <span className="aee-tab-t">{tab.title}</span>
                  <span className="aee-tab-d">{tab.desc}</span>
                </button>
              ))}
            </div>

            {view === 'cadastro' && (
              <>
                <div className="saved-head">
                  <div>
                    <h1>Cadastro AEE do estudante</h1>
                    <p>Ficha restrita usada pela IA para gerar o PEI e o PAEE individualizados.</p>
                  </div>
                </div>

                <div className="pei-block pei-tutorial" style={{ marginBottom: 20 }}>
                  <div className="pei-tutorial-title">Como funciona o cadastro AEE</div>
                  <ol className="pei-tutorial-steps">
                    <li><strong>Cadastre o aluno</strong> — Preencha nome, escola, ano e turno. O cadastro e vinculado ao municipio automaticamente.</li>
                    <li><strong>Preencha a ficha AEE</strong> — Descreva necessidades educacionais, barreiras, potencialidades e recursos. Quanto mais completa, melhor sera o PEI gerado pela IA.</li>
                    <li><strong>Salve</strong> — Apos salvar, o aluno aparece no seletor PEI dos portais BNCC Computacao e Anos Iniciais.</li>
                    <li><strong>O regente gera o PEI</strong> — Nos portais, o professor regente seleciona &quot;PEI&quot;, escolhe o aluno e clica em &quot;Gerar plano&quot;. A IA usa esta ficha AEE para criar o plano. Depois ele envia o PEI para sua validacao (aba &quot;Validar PEIs&quot;).</li>
                    <li><strong>Elabore o PAEE</strong> — Na aba &quot;Elaborar PAEE&quot;, defina a organizacao do atendimento e gere o plano do AEE (este sim e de sua autoria), articulado com o PEI da sala regular.</li>
                  </ol>
                  <p className="pei-note" style={{ marginTop: 8 }}>
                    A ficha AEE e de acesso restrito (professor AEE, coordenacao, administracao). Dados de saude informados
                    espontaneamente sao tratados apenas como contexto pedagogico.
                  </p>
                </div>

                {message && <div className="al-ok">{message}</div>}
                {error && <div className="al-error">{error}</div>}

                <div className="stbar" style={{ marginBottom: 16 }}>
                  {AEE_STEPS.map((s) => (
                    <div
                      key={s.n}
                      className={`sti clk ${step === s.n ? 'active' : step > s.n ? 'done' : ''}`}
                      onClick={() => setStep(s.n)}
                    >
                      <span className="stn">{s.n}</span>
                      <span className="stl">{s.label}</span>
                    </div>
                  ))}
                </div>

                <div className="pc">
                  {step === 1 && (
                    <>
                      <div className="bnac-form-section">Etapa 1 · Identificação do aluno</div>
                      <div className="fg">
                        <Field
                          label="Nome completo"
                          wide
                          hint="Nome do estudante igual ao da matrícula. Aparece no PEI e no seletor de alunos dos portais."
                          example={<>Ex.: <strong>Maria Eduarda Santos da Silva</strong></>}
                        >
                          <input value={student.full_name} onChange={(event) => updateStudent('full_name', event.target.value)} placeholder="Nome e sobrenome do aluno" />
                        </Field>
                        <Field label="Data de nascimento" hint="Ajuda a IA a adequar o PEI à faixa etária do aluno." example="Ex.: 14/03/2015">
                          <input type="date" value={student.birth_date} onChange={(event) => updateStudent('birth_date', event.target.value)} />
                        </Field>
                        <Field label="Escola" hint="Escola onde o aluno está matriculado. Selecione na lista.">
                          <select value={student.school_name} onChange={(event) => updateStudent('school_name', event.target.value)}>
                            <option value="">Selecione a escola</option>
                            {municipalSchools.map((school) => <option key={school} value={school}>{school}</option>)}
                          </select>
                        </Field>
                        <Field label="Ano/Turma" hint="Ano escolar que o aluno cursa atualmente." example="Ex.: 3º Ano">
                          <input value={student.grade_level} onChange={(event) => updateStudent('grade_level', event.target.value)} placeholder="3º Ano" />
                        </Field>
                        <Field label="Turma" hint="Identificação da turma/sala, se houver." example="Ex.: Turma B / 3º A">
                          <input value={student.class_name} onChange={(event) => updateStudent('class_name', event.target.value)} placeholder="B" />
                        </Field>
                        <Field label="Turno" hint="Período em que o aluno frequenta a escola.">
                          <select value={student.shift} onChange={(event) => updateStudent('shift', event.target.value as StudentForm['shift'])}>
                            <option value="manha">Manhã</option>
                            <option value="tarde">Tarde</option>
                            <option value="noite">Noite</option>
                            <option value="integral">Integral</option>
                          </select>
                        </Field>
                        <Field label="Matrícula" hint="Número de matrícula do aluno no sistema da escola (opcional)." example="Ex.: 2024001234">
                          <input value={student.enrollment_number} onChange={(event) => updateStudent('enrollment_number', event.target.value)} placeholder="Número de matrícula" />
                        </Field>
                      </div>
                      <p className="pei-note" style={{ marginTop: 4 }}>
                        Campos obrigatórios: <strong>nome</strong>, <strong>escola</strong> e <strong>ano/turma</strong>. Os demais são opcionais.
                      </p>
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <div className="bnac-form-section">Etapa 2 · Perfil e necessidades</div>
                      <div className="fg">
                        <Field label="Público-alvo" wide hint="Categoria da Educação Especial (Política Nacional). Escolha a que melhor descreve o estudante.">
                          <select value={profile.public_target} onChange={(event) => updateProfile('public_target', event.target.value as ProfileForm['public_target'])}>
                            <option value="deficiencia">Deficiência</option>
                            <option value="tea">TEA</option>
                            <option value="altas_habilidades_superdotacao">Altas habilidades/superdotação</option>
                            <option value="transtorno_global_desenvolvimento">Transtorno global do desenvolvimento</option>
                            <option value="outro">Outro</option>
                          </select>
                        </Field>
                        <Field
                          label="Necessidades educacionais"
                          wide
                          hint="O que o aluno precisa para aprender melhor, em linguagem pedagógica (não clínica)."
                          example={<>Ex.: <strong>Precisa de instruções curtas e apoio visual; beneficia-se de tempo extra nas atividades escritas.</strong></>}
                        >
                          <textarea value={profile.educational_needs} onChange={(event) => updateProfile('educational_needs', event.target.value)} placeholder="Descreva o que o aluno precisa para aprender melhor" />
                        </Field>
                        <Field
                          label="Barreiras de aprendizagem"
                          wide
                          hint="Obstáculos que dificultam a participação e a aprendizagem. Escreva uma por linha."
                          example={<>Uma por linha. Ex.:<br/><strong>Dificuldade de manter atenção em tarefas longas<br/>Sensibilidade a ruído na sala</strong></>}
                        >
                          <textarea value={profile.learning_barriers} onChange={(event) => updateProfile('learning_barriers', event.target.value)} placeholder="Uma por linha" />
                        </Field>
                        <Field label="Comunicação" wide hint="Como o aluno se comunica e compreende mensagens." example={<>Ex.: <strong>Comunica-se oralmente com frases curtas; entende melhor com apoio de gestos e imagens.</strong></>}>
                          <textarea value={profile.communication_profile} onChange={(event) => updateProfile('communication_profile', event.target.value)} placeholder="Como o aluno se comunica e entende" />
                        </Field>
                        <Field label="Autonomia" wide hint="Grau de independência nas rotinas e atividades escolares." example={<>Ex.: <strong>Organiza o material com lembretes; precisa de ajuda para iniciar tarefas novas.</strong></>}>
                          <textarea value={profile.autonomy_profile} onChange={(event) => updateProfile('autonomy_profile', event.target.value)} placeholder="O quanto faz sozinho / onde precisa de apoio" />
                        </Field>
                        <Field label="Interação social" wide hint="Como o aluno se relaciona com colegas e adultos." example={<>Ex.: <strong>Brinca melhor em duplas; evita grupos grandes; tem vínculo forte com a professora.</strong></>}>
                          <textarea value={profile.social_interaction} onChange={(event) => updateProfile('social_interaction', event.target.value)} placeholder="Como se relaciona com colegas e adultos" />
                        </Field>
                        <Field label="Aspectos sensoriais" wide hint="Reações a estímulos: som, luz, toque, texturas, etc." example={<>Ex.: <strong>Incomoda-se com luz forte e sons altos; gosta de objetos com textura macia.</strong></>}>
                          <textarea value={profile.sensory_aspects} onChange={(event) => updateProfile('sensory_aspects', event.target.value)} placeholder="Sensibilidades a som, luz, toque, texturas" />
                        </Field>
                        <Field label="Aspectos motores" wide hint="Coordenação motora ampla (correr, pular) e fina (escrever, recortar)." example={<>Ex.: <strong>Boa coordenação ampla; dificuldade no traçado da escrita e no uso da tesoura.</strong></>}>
                          <textarea value={profile.motor_aspects} onChange={(event) => updateProfile('motor_aspects', event.target.value)} placeholder="Coordenação motora ampla e fina" />
                        </Field>
                        <Field label="Aspectos cognitivos" wide hint="Atenção, memória, raciocínio e resolução de problemas." example={<>Ex.: <strong>Boa memória visual; precisa de tempo extra para resolver problemas em etapas.</strong></>}>
                          <textarea value={profile.cognitive_aspects} onChange={(event) => updateProfile('cognitive_aspects', event.target.value)} placeholder="Atenção, memória, raciocínio" />
                        </Field>
                        <Field label="Leitura e escrita" hint="Nível atual de leitura e escrita." example="Ex.: Lê palavras simples; escreve o próprio nome">
                          <input value={profile.reading_writing_level} onChange={(event) => updateProfile('reading_writing_level', event.target.value)} placeholder="Nível de leitura/escrita" />
                        </Field>
                        <Field label="Matemática" hint="Nível atual em matemática." example="Ex.: Conta até 20; soma com apoio de material concreto">
                          <input value={profile.math_level} onChange={(event) => updateProfile('math_level', event.target.value)} placeholder="Nível em matemática" />
                        </Field>
                      </div>
                    </>
                  )}

                  {step === 3 && (
                    <>
                      <div className="bnac-form-section">Etapa 3 · Potencialidades e recursos</div>
                      <div className="fg">
                        <Field label="Interesses" wide hint="Temas, atividades e objetos que motivam o aluno. Use-os como ponte para o aprendizado. Um por linha." example={<>Um por linha. Ex.:<br/><strong>Dinossauros<br/>Música<br/>Jogos de montar</strong></>}>
                          <textarea value={profile.interests} onChange={(event) => updateProfile('interests', event.target.value)} placeholder="Um por linha" />
                        </Field>
                        <Field label="Potencialidades" wide hint="Forças e habilidades em que o aluno se destaca. Um por linha." example={<>Um por linha. Ex.:<br/><strong>Ótima memória visual<br/>Criativo em desenho<br/>Atencioso com colegas</strong></>}>
                          <textarea value={profile.strengths} onChange={(event) => updateProfile('strengths', event.target.value)} placeholder="Uma por linha" />
                        </Field>
                        <Field label="Dificuldades" wide hint="Áreas que exigem mais apoio. Um por linha." example={<>Um por linha. Ex.:<br/><strong>Manter o foco em tarefas longas<br/>Escrita à mão</strong></>}>
                          <textarea value={profile.difficulties} onChange={(event) => updateProfile('difficulties', event.target.value)} placeholder="Uma por linha" />
                        </Field>
                        <Field label="Recursos de acessibilidade" wide hint="Materiais e adequações que facilitam o acesso ao conteúdo. Um por linha." example={<>Um por linha. Ex.:<br/><strong>Material ampliado<br/>Apoio visual (pictogramas)<br/>Lugar à frente na sala</strong></>}>
                          <textarea value={profile.accessibility_resources} onChange={(event) => updateProfile('accessibility_resources', event.target.value)} placeholder="Um por linha" />
                        </Field>
                        <Field label="Tecnologia assistiva" wide hint="Equipamentos/softwares de apoio, se houver. Um por linha." example={<>Um por linha. Ex.:<br/><strong>Tablet com leitor de tela<br/>Engrossador de lápis</strong></>}>
                          <textarea value={profile.assistive_technology} onChange={(event) => updateProfile('assistive_technology', event.target.value)} placeholder="Uma por linha" />
                        </Field>
                        <Field label="Adaptações curriculares" wide hint="Como o conteúdo/atividade é ajustado para o aluno." example={<>Ex.: <strong>Reduzir quantidade de exercícios; permitir resposta oral em vez de escrita.</strong></>}>
                          <textarea value={profile.curricular_adaptations} onChange={(event) => updateProfile('curricular_adaptations', event.target.value)} placeholder="Ajustes no conteúdo e nas atividades" />
                        </Field>
                        <Field label="Adaptações avaliativas" wide hint="Como a avaliação é ajustada (tempo, formato, apoios)." example={<>Ex.: <strong>Tempo estendido; prova com enunciados curtos e leitura em voz alta.</strong></>}>
                          <textarea value={profile.evaluation_adaptations} onChange={(event) => updateProfile('evaluation_adaptations', event.target.value)} placeholder="Ajustes na forma de avaliar" />
                        </Field>
                      </div>
                    </>
                  )}

                  {step === 4 && (
                    <>
                      <div className="bnac-form-section">Etapa 4 · Família e saúde</div>
                      <div className="fg">
                        <Field label="Observações da família" wide hint="O que a família relata sobre o aluno e suas expectativas." example={<>Ex.: <strong>A família relata que ele se concentra melhor pela manhã e gosta de rotina previsível.</strong></>}>
                          <textarea value={profile.family_notes} onChange={(event) => updateProfile('family_notes', event.target.value)} placeholder="Relatos e expectativas da família" />
                        </Field>
                        <Field label="Acompanhamentos externos" wide hint="Profissionais que acompanham o aluno fora da escola." example={<>Ex.: <strong>Fonoaudióloga semanal; acompanhamento com psicóloga.</strong></>}>
                          <textarea value={profile.external_supports} onChange={(event) => updateProfile('external_supports', event.target.value)} placeholder="Terapias e acompanhamentos externos" />
                        </Field>
                        <Field label="Medicação (informada espontaneamente)" wide hint="Registre apenas se a família informar e for relevante para a rotina escolar. Tratado como contexto pedagógico, não como dado clínico." example={<>Ex.: <strong>Faz uso de medicação pela manhã, conforme a família.</strong></>}>
                          <textarea value={profile.medication_notes} onChange={(event) => updateProfile('medication_notes', event.target.value)} placeholder="Somente se informado pela família" />
                        </Field>
                        <Field label="Observações emergenciais" wide hint="Cuidados e contatos importantes em caso de emergência." example={<>Ex.: <strong>Alergia a amendoim; contato da mãe: (82) 9xxxx-xxxx.</strong></>}>
                          <textarea value={profile.emergency_notes} onChange={(event) => updateProfile('emergency_notes', event.target.value)} placeholder="Cuidados e contatos de emergência" />
                        </Field>
                      </div>
                      <p className="pei-note" style={{ marginTop: 4 }}>
                        Ao salvar, o aluno fica disponível no seletor de PEI dos portais e na aba &quot;Elaborar PAEE&quot;.
                      </p>
                    </>
                  )}

                  <div className="wiz-nav">
                    <span className="wiz-count">Etapa {step} de {AEE_STEPS.length}</span>
                    <div className="brow" style={{ margin: 0 }}>
                      {step > 1 && (
                        <button className="btn btn-out" type="button" onClick={() => setStep(step - 1)}>← Voltar</button>
                      )}
                      {step < AEE_STEPS.length ? (
                        <button className="btn btn-pri" type="button" onClick={() => setStep(step + 1)}>Próxima etapa →</button>
                      ) : (
                        <button className="btn btn-pri" disabled={saving} onClick={saveStudent} type="button">
                          {saving ? 'Salvando...' : 'Salvar aluno e ficha AEE'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {view === 'paee' && (
              <>
                <div className="saved-head">
                  <div>
                    <h1>PAEE — Plano de Atendimento Educacional Especializado</h1>
                    <p>
                      Plano do AEE: organiza atendimentos, recursos de acessibilidade e estratégias para eliminar
                      barreiras. Articulado com o PEI da sala regular — os dois conversam entre si.
                    </p>
                  </div>
                </div>
                <div className="pei-block pei-tutorial" style={{ marginBottom: 20 }}>
                  <div className="pei-tutorial-title">Como elaborar o PAEE</div>
                  <ol className="pei-tutorial-steps">
                    <li><strong>Selecione o aluno</strong> — A IA parte da ficha AEE (avaliação funcional/pedagógica), não apenas do laudo.</li>
                    <li><strong>Defina a organização do atendimento</strong> — Frequência, duração, tipo (individual/grupo), local, horário e metas por período.</li>
                    <li><strong>Gere e revise</strong> — A IA propõe caracterização, barreiras, objetivos funcionais do AEE, recursos e articulação com a sala regular. Revise e ajuste antes de salvar.</li>
                    <li><strong>Envie para a família</strong> — Após salvar, encaminhe para ciência da família. Com a concordância registrada, o PAEE passa a vigente.</li>
                    <li><strong>Reavalie periodicamente</strong> — Registre avanços mensalmente e revise com o professor regente a cada bimestre/trimestre.</li>
                  </ol>
                  <p className="pei-note" style={{ marginTop: 8 }}>
                    Se o aluno já tiver PEI, o PAEE é gerado articulado a ele; se ainda não tiver, o PEI gerado depois nos
                    portais também considerará este PAEE automaticamente.
                  </p>
                </div>
                <PaeeBuilder user={user} />
              </>
            )}

            {view === 'paees' && (
              <>
                <div className="saved-head">
                  <div>
                    <h1>Acompanhamento de PAEEs</h1>
                    <p>PAEEs elaborados pelo AEE: em elaboração, com a família ou vigentes. Envie os rascunhos prontos para ciência da família.</p>
                  </div>
                </div>
                <PeiReviewQueue mode="aee" kind="paee" />
              </>
            )}

            {view === 'peis' && (
              <>
                <div className="saved-head">
                  <div>
                    <h1>Validação de PEIs</h1>
                    <p>PEIs enviados pelos professores aguardando sua aprovação. Ao aprovar, seguem para a família.</p>
                  </div>
                </div>
                <PeiReviewQueue mode="aee" />
              </>
            )}

            {view === 'familia' && (
              <>
                <div className="saved-head">
                  <div>
                    <h1>Acesso da família</h1>
                    <p>
                      Cadastre o responsável e vincule ao aluno. Ele acessa o painel da família para
                      ler o PEI/PAEE e registrar a ciência — sem depender da coordenação.
                    </p>
                  </div>
                </div>
                <FamilyLinksPanel />
              </>
            )}
          </>
        )}
      </section>

      {user && canManage && (
        <button className="tut-open" type="button" onClick={() => { setTutorialStep(0); setShowTutorial(true) }}>
          ? Como preencher
        </button>
      )}

      {showTutorial && (
        <div className="mbk tut-bk" onClick={closeTutorial}>
          <div className="mdl tut-mdl" onClick={(e) => e.stopPropagation()}>
            <button className="mdl-close" onClick={closeTutorial}>×</button>
            <div className="tut-dots">
              {AEE_TUTORIAL.map((_, i) => (
                <button
                  key={i}
                  className={`tut-dot ${i === tutorialStep ? 'on' : i < tutorialStep ? 'done' : ''}`}
                  onClick={() => setTutorialStep(i)}
                  aria-label={`Ir para passo ${i + 1}`}
                />
              ))}
            </div>
            <div className="tut-icon" style={AEE_TUTORIAL[tutorialStep].iconStyle}>
              {AEE_TUTORIAL[tutorialStep].icon}
            </div>
            <div className="tut-step">Passo {tutorialStep + 1} de {AEE_TUTORIAL.length}</div>
            <h2 className="tut-title">{AEE_TUTORIAL[tutorialStep].title}</h2>
            <p className="tut-body">{AEE_TUTORIAL[tutorialStep].body}</p>
            <div className="tut-actions">
              {tutorialStep > 0 && (
                <button className="btn btn-out" onClick={() => setTutorialStep(tutorialStep - 1)}>← Anterior</button>
              )}
              {tutorialStep < AEE_TUTORIAL.length - 1 ? (
                <button className="btn btn-pri" onClick={() => setTutorialStep(tutorialStep + 1)}>Próximo →</button>
              ) : (
                <button className="btn btn-pri" onClick={closeTutorial}>Entendido! ✓</button>
              )}
            </div>
            <button className="tut-skip" onClick={closeTutorial}>Pular tutorial</button>
          </div>
        </div>
      )}
    </main>
  )
}
