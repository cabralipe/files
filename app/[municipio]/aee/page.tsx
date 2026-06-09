'use client'

import { supabase } from '@/lib/supabase-client'

import { useState } from 'react'
import Link from '@/lib/m-link'
import { useAuth } from '@/hooks/useAuth'
import { municipalSchools } from '@/lib/education-options'
import PeiReviewQueue from '@/components/PeiReviewQueue'


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
  school_name: 'Escola Municipal',
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

export default function AeePage() {
  const { user, loading: authLoading } = useAuth()
  const [student, setStudent] = useState<StudentForm>(emptyStudent)
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

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
      return
    }
    if (!student.school_name.trim() || student.school_name.trim().length < 2) {
      setError('Informe o nome da escola.')
      return
    }
    if (!student.grade_level.trim()) {
      setError('Informe o ano/turma do aluno.')
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
      <header id="hdr">
        <div className="hdr-in">
          <Link href="/" className="logo">
            <div className="logo-ic logo-ic--aee" />
            <div>
              <div className="logo-t">Sala especial / AEE</div>
              <div className="logo-s">Cadastro de alunos e ficha para PEI</div>
            </div>
          </Link>
          <nav className="hdr-nav" aria-label="Acessos">
            <Link className="nb" href="/computacao">BNCC Computacao</Link>
            <Link className="nb" href="/anos-iniciais">Anos Iniciais</Link>
          </nav>
        </div>
      </header>

      <section className="pg">
        <div className="saved-head">
          <div>
            <h1>Cadastro AEE do estudante</h1>
            <p>Ficha restrita usada pela IA para gerar PEI individualizado.</p>
          </div>
        </div>

        <div className="pei-block pei-tutorial" style={{ marginBottom: 20 }}>
          <div className="pei-tutorial-title">Como funciona o cadastro AEE</div>
          <ol className="pei-tutorial-steps">
            <li><strong>Cadastre o aluno</strong> — Preencha nome, escola, ano e turno. O cadastro e vinculado ao municipio automaticamente.</li>
            <li><strong>Preencha a ficha AEE</strong> — Descreva necessidades educacionais, barreiras, potencialidades e recursos. Quanto mais completa, melhor sera o PEI gerado pela IA.</li>
            <li><strong>Salve</strong> — Apos salvar, o aluno aparece no seletor PEI dos portais BNCC Computacao e Anos Iniciais.</li>
            <li><strong>Gere o PEI</strong> — Nos portais, selecione &quot;PEI&quot;, escolha o aluno e clique em &quot;Gerar plano&quot;. A IA usara a ficha AEE para criar um plano individualizado.</li>
          </ol>
          <p className="pei-note" style={{ marginTop: 8 }}>
            A ficha AEE e de acesso restrito (professor AEE, coordenacao, administracao). Dados de saude informados
            espontaneamente sao tratados apenas como contexto pedagogico.
          </p>
        </div>

        {!user && <div className="al-error">Faca login para acessar o cadastro AEE.</div>}
        {user && !canManage && <div className="al-error">Acesso restrito ao professor AEE, coordenacao ou administracao.</div>}
        {message && <div className="al-ok">{message}</div>}
        {error && <div className="al-error">{error}</div>}

        {user && canManage && (
          <div className="pc">
            <div className="bnac-form-section">Identificacao do aluno</div>
            <div className="fg">
              <Field label="Nome completo" wide>
                <input value={student.full_name} onChange={(event) => updateStudent('full_name', event.target.value)} />
              </Field>
              <Field label="Data de nascimento">
                <input type="date" value={student.birth_date} onChange={(event) => updateStudent('birth_date', event.target.value)} />
              </Field>
              <Field label="Escola">
                <input list="aee-schools" value={student.school_name} onChange={(event) => updateStudent('school_name', event.target.value)} />
                <datalist id="aee-schools">
                  {municipalSchools.map((school) => <option key={school} value={school} />)}
                </datalist>
              </Field>
              <Field label="Ano/Turma">
                <input value={student.grade_level} onChange={(event) => updateStudent('grade_level', event.target.value)} />
              </Field>
              <Field label="Turma">
                <input value={student.class_name} onChange={(event) => updateStudent('class_name', event.target.value)} />
              </Field>
              <Field label="Turno">
                <select value={student.shift} onChange={(event) => updateStudent('shift', event.target.value as StudentForm['shift'])}>
                  <option value="manha">Manha</option>
                  <option value="tarde">Tarde</option>
                  <option value="noite">Noite</option>
                  <option value="integral">Integral</option>
                </select>
              </Field>
              <Field label="Matricula">
                <input value={student.enrollment_number} onChange={(event) => updateStudent('enrollment_number', event.target.value)} />
              </Field>
            </div>

            <div className="bnac-form-section">Ficha AEE</div>
            <div className="fg">
              <Field label="Publico-alvo" wide>
                <select value={profile.public_target} onChange={(event) => updateProfile('public_target', event.target.value as ProfileForm['public_target'])}>
                  <option value="deficiencia">Deficiencia</option>
                  <option value="tea">TEA</option>
                  <option value="altas_habilidades_superdotacao">Altas habilidades/superdotacao</option>
                  <option value="transtorno_global_desenvolvimento">Transtorno global do desenvolvimento</option>
                  <option value="outro">Outro</option>
                </select>
              </Field>
              <Field label="Necessidades educacionais" wide><textarea value={profile.educational_needs} onChange={(event) => updateProfile('educational_needs', event.target.value)} /></Field>
              <Field label="Barreiras de aprendizagem" wide><textarea value={profile.learning_barriers} onChange={(event) => updateProfile('learning_barriers', event.target.value)} placeholder="Uma por linha" /></Field>
              <Field label="Comunicacao" wide><textarea value={profile.communication_profile} onChange={(event) => updateProfile('communication_profile', event.target.value)} /></Field>
              <Field label="Autonomia" wide><textarea value={profile.autonomy_profile} onChange={(event) => updateProfile('autonomy_profile', event.target.value)} /></Field>
              <Field label="Interacao social" wide><textarea value={profile.social_interaction} onChange={(event) => updateProfile('social_interaction', event.target.value)} /></Field>
              <Field label="Aspectos sensoriais" wide><textarea value={profile.sensory_aspects} onChange={(event) => updateProfile('sensory_aspects', event.target.value)} /></Field>
              <Field label="Aspectos motores" wide><textarea value={profile.motor_aspects} onChange={(event) => updateProfile('motor_aspects', event.target.value)} /></Field>
              <Field label="Aspectos cognitivos" wide><textarea value={profile.cognitive_aspects} onChange={(event) => updateProfile('cognitive_aspects', event.target.value)} /></Field>
              <Field label="Leitura e escrita"><input value={profile.reading_writing_level} onChange={(event) => updateProfile('reading_writing_level', event.target.value)} /></Field>
              <Field label="Matematica"><input value={profile.math_level} onChange={(event) => updateProfile('math_level', event.target.value)} /></Field>
              <Field label="Interesses" wide><textarea value={profile.interests} onChange={(event) => updateProfile('interests', event.target.value)} placeholder="Um por linha" /></Field>
              <Field label="Potencialidades" wide><textarea value={profile.strengths} onChange={(event) => updateProfile('strengths', event.target.value)} placeholder="Uma por linha" /></Field>
              <Field label="Dificuldades" wide><textarea value={profile.difficulties} onChange={(event) => updateProfile('difficulties', event.target.value)} placeholder="Uma por linha" /></Field>
              <Field label="Recursos de acessibilidade" wide><textarea value={profile.accessibility_resources} onChange={(event) => updateProfile('accessibility_resources', event.target.value)} placeholder="Um por linha" /></Field>
              <Field label="Tecnologia assistiva" wide><textarea value={profile.assistive_technology} onChange={(event) => updateProfile('assistive_technology', event.target.value)} placeholder="Uma por linha" /></Field>
              <Field label="Adaptacoes curriculares" wide><textarea value={profile.curricular_adaptations} onChange={(event) => updateProfile('curricular_adaptations', event.target.value)} /></Field>
              <Field label="Adaptacoes avaliativas" wide><textarea value={profile.evaluation_adaptations} onChange={(event) => updateProfile('evaluation_adaptations', event.target.value)} /></Field>
              <Field label="Observacoes da familia" wide><textarea value={profile.family_notes} onChange={(event) => updateProfile('family_notes', event.target.value)} /></Field>
              <Field label="Acompanhamentos externos" wide><textarea value={profile.external_supports} onChange={(event) => updateProfile('external_supports', event.target.value)} /></Field>
              <Field label="Medicacao informada espontaneamente" wide><textarea value={profile.medication_notes} onChange={(event) => updateProfile('medication_notes', event.target.value)} /></Field>
              <Field label="Observacoes emergenciais" wide><textarea value={profile.emergency_notes} onChange={(event) => updateProfile('emergency_notes', event.target.value)} /></Field>
            </div>
            <div className="brow">
              <button className="btn btn-pri" disabled={saving} onClick={saveStudent} type="button">
                {saving ? 'Salvando...' : 'Salvar aluno e ficha AEE'}
              </button>
            </div>
          </div>
        )}
      </section>

      {user && canManage && (
        <section className="pg">
          <div className="saved-head">
            <div>
              <h1>Validação de PEIs</h1>
              <p>PEIs enviados pelos professores aguardando sua aprovação. Ao aprovar, seguem para a família.</p>
            </div>
          </div>
          <PeiReviewQueue mode="aee" />
        </section>
      )}
    </main>
  )
}
