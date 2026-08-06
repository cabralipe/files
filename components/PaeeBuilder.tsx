'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase-client'
import { downloadRisoPdf, sanitizePdfText, pdfSlug } from '@/lib/pdf-riso'
import { useAuth } from '@/hooks/useAuth'
import SchoolSelector from '@/components/SchoolSelector'

// Construtor do PAEE — Plano de Atendimento Educacional Especializado.
// Elaborado pelo professor AEE a partir da ficha AEE do aluno, articulado com
// o PEI da sala regular: rascunho -> ciencia da familia -> vigente.

type PaeeStudent = {
  id: string
  full_name: string
  school_name: string
  school_id?: string
  grade_level: string
  class_name?: string
  shift?: string
  student_aee_profiles?: Array<Record<string, unknown>>
}

type ExistingDoc = {
  id: string
  content: string
  plan_status: string
}

type OrganizacaoForm = {
  frequencia_semanal: string
  duracao_atendimento: string
  tipo_atendimento: 'individual' | 'grupo' | 'misto'
  local: string
  horario: string
  turno_aee: 'manha' | 'tarde' | 'noite' | 'contraturno'
  periodo_validade: string
  metas_periodo: string
}

const emptyOrganizacao: OrganizacaoForm = {
  frequencia_semanal: '2 vezes por semana',
  duracao_atendimento: '50 minutos',
  tipo_atendimento: 'individual',
  local: 'Sala de Recursos Multifuncionais',
  horario: '',
  turno_aee: 'contraturno',
  periodo_validade: '',
  metas_periodo: '',
}

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'rascunho',
  aguardando_aee: 'aguardando validação do AEE',
  aguardando_familia: 'aguardando ciência da família',
  vigente: 'vigente',
  arquivado: 'arquivado',
  substituido: 'substituído',
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token
}

function Field({ label, children, wide, hint }: { label: string; children: React.ReactNode; wide?: boolean; hint?: string }) {
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
    </label>
  )
}

export default function PaeeBuilder({ user }: { user: User | null }) {
  const { profile } = useAuth()
  const [students, setStudents] = useState<PaeeStudent[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [studentId, setStudentId] = useState('')
  const [organizacao, setOrganizacao] = useState<OrganizacaoForm>(emptyOrganizacao)
  const [observacoes, setObservacoes] = useState('')
  const [articularPei, setArticularPei] = useState(true)
  const [existingPei, setExistingPei] = useState<ExistingDoc | null>(null)
  const [existingPaee, setExistingPaee] = useState<ExistingDoc | null>(null)
  const [checkingDocs, setCheckingDocs] = useState(false)
  const [generated, setGenerated] = useState('')
  const [linkedPeiId, setLinkedPeiId] = useState('')
  const [savedPlanId, setSavedPlanId] = useState('')
  const [savedStatus, setSavedStatus] = useState('')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const isAdminRole = profile?.permissions.manageMunicipality === true
  const school = profile?.school?.name || ''
  const [schoolId, setSchoolId] = useState(profile?.school?.id || '')
  const student = students.find((item) => item.id === studentId) || null

  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function loadStudents() {
      try {
        setLoadingStudents(true)
        const token = await getAccessToken()
        const params = !isAdminRole && schoolId ? `?school_id=${encodeURIComponent(schoolId)}` : ''
        const response = await fetch(`/api/students${params}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'Erro ao carregar alunos')
        if (!cancelled) setStudents(payload.data || [])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro ao carregar alunos')
      } finally {
        if (!cancelled) setLoadingStudents(false)
      }
    }
    void loadStudents()
    return () => {
      cancelled = true
    }
  }, [user, school, schoolId, isAdminRole])

  // Ao escolher o aluno, verifica PEI (para articulação) e PAEE já existentes.
  useEffect(() => {
    setExistingPei(null)
    setExistingPaee(null)
    setGenerated('')
    setSavedPlanId('')
    setSavedStatus('')
    setLinkedPeiId('')
    if (!user || !studentId) return
    let cancelled = false
    async function loadDocs() {
      try {
        setCheckingDocs(true)
        const token = await getAccessToken()
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
        const [peiRes, paeeRes] = await Promise.all([
          fetch(`/api/peis/by-student?student_id=${encodeURIComponent(studentId)}`, { headers }),
          fetch(`/api/paees/by-student?student_id=${encodeURIComponent(studentId)}`, { headers }),
        ])
        const peiPayload = await peiRes.json()
        const paeePayload = await paeeRes.json()
        if (cancelled) return
        const pei = peiPayload?.data
        setExistingPei(pei && pei.content
          ? { id: String(pei.id || ''), content: String(pei.content || ''), plan_status: String(pei.plan_status || 'rascunho') }
          : null)
        const paee = paeePayload?.data
        setExistingPaee(paee && paee.content
          ? { id: String(paee.id || ''), content: String(paee.content || ''), plan_status: String(paee.plan_status || 'rascunho') }
          : null)
      } catch {
        if (!cancelled) {
          setExistingPei(null)
          setExistingPaee(null)
        }
      } finally {
        if (!cancelled) setCheckingDocs(false)
      }
    }
    void loadDocs()
    return () => {
      cancelled = true
    }
  }, [user, studentId])

  function updateOrganizacao<K extends keyof OrganizacaoForm>(field: K, value: OrganizacaoForm[K]) {
    setOrganizacao((current) => ({ ...current, [field]: value }))
  }

  async function generatePaee() {
    if (!studentId) {
      setError('Selecione o aluno para gerar o PAEE.')
      return
    }
    try {
      setGenerating(true)
      setError('')
      setMessage('')
      const token = await getAccessToken()
      const response = await fetch('/api/paee/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          student_id: studentId,
          organizacao,
          observacoes,
          articular_pei: articularPei,
        }),
      })
      const payload = await response.json()
      if (response.status === 401) throw new Error('Sessao expirada. Faca login novamente.')
      if (!response.ok) throw new Error(payload.error || 'Erro ao gerar PAEE')
      setGenerated(String(payload.data?.content || ''))
      setLinkedPeiId(String(payload.data?.linked_pei_id || ''))
      setSavedPlanId('')
      setSavedStatus('')
      setMessage('PAEE gerado. Revise o texto, ajuste o que for preciso e salve.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar PAEE')
    } finally {
      setGenerating(false)
    }
  }

  async function savePaee() {
    if (!student || !generated.trim()) {
      setError('Gere o PAEE antes de salvar.')
      return
    }
    try {
      setSaving(true)
      setError('')
      setMessage('')
      const token = await getAccessToken()
      const teacherName = String(user?.user_metadata?.name || user?.user_metadata?.full_name || 'Professor(a) do AEE')
      const response = await fetch('/api/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: `PAEE — ${student.full_name}`,
          teacher: teacherName,
          school: student.school_name,
          school_id: student.school_id || schoolId,
          grade_level: student.grade_level,
          subject: 'Atendimento Educacional Especializado',
          duration: organizacao.duracao_atendimento,
          notes: observacoes,
          skill_ids: [],
          content: generated,
          is_paee: true,
          student_id: student.id,
          linked_pei_id: linkedPeiId,
          paee_organizacao: organizacao,
          plan_status: 'rascunho',
        }),
      })
      const payload = await response.json()
      if (response.status === 401) throw new Error('Sessao expirada. Faca login novamente.')
      if (!response.ok) throw new Error(payload.error || 'Erro ao salvar PAEE')
      setSavedPlanId(String(payload.data?.id || ''))
      setSavedStatus('rascunho')
      setMessage('PAEE salvo como rascunho. Quando estiver pronto, envie para ciência da família.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar PAEE')
    } finally {
      setSaving(false)
    }
  }

  async function sendToFamily() {
    if (!savedPlanId) return
    try {
      setSending(true)
      setError('')
      const token = await getAccessToken()
      const response = await fetch(`/api/plans/${savedPlanId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: 'submit_familia' }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Erro ao enviar para a familia')
      setSavedStatus('aguardando_familia')
      setMessage('PAEE enviado para ciência da família. Ao registrar a concordância, ele passa a vigente.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar para a familia')
    } finally {
      setSending(false)
    }
  }

  async function downloadPdf() {
    const text = sanitizePdfText(generated)
    if (!text.trim() || !student) {
      setError('Gere o PAEE antes de baixar em PDF.')
      return
    }
    await downloadRisoPdf({
      docType: 'PAEE',
      docSubtitle: 'Plano de Atendimento Educacional Especializado',
      masthead: 'Atendimento Educacional Especializado · Sala de Recursos Multifuncionais',
      title: student.full_name,
      meta: [
        { label: 'Aluno(a)', value: student.full_name },
        { label: 'Escola', value: student.school_name },
        { label: 'Ano/Turma', value: `${student.grade_level}${student.class_name ? ` / ${student.class_name}` : ''}${student.shift ? ` · ${student.shift}` : ''}` },
        { label: 'Local do AEE', value: organizacao.local },
        { label: 'Atendimento', value: `${organizacao.frequencia_semanal} · ${organizacao.duracao_atendimento} · ${organizacao.tipo_atendimento}` },
        ...(organizacao.horario ? [{ label: 'Horário', value: organizacao.horario }] : []),
        ...(organizacao.periodo_validade ? [{ label: 'Vigência', value: organizacao.periodo_validade }] : []),
      ],
      body: text,
      skipLines: ['PAEE', 'PLANO DE ATENDIMENTO EDUCACIONAL ESPECIALIZADO', 'PAEE - PLANO DE ATENDIMENTO EDUCACIONAL ESPECIALIZADO'],
      extraSections: [
        {
          title: 'Ciência e assinaturas',
          lines: [
            { text: 'Professor(a) do AEE', signature: true },
            { text: 'Família / responsável', signature: true },
            { text: 'Coordenação pedagógica', signature: true },
          ],
        },
      ],
      footerLeft: 'PAEE · ATENDIMENTO EDUCACIONAL ESPECIALIZADO',
      fileName: `paee-${pdfSlug(student.full_name)}.pdf`,
    })
  }

  if (!user) {
    return <p className="pei-note">Faça login com uma conta autorizada (professor AEE, coordenação ou administração) para elaborar o PAEE.</p>
  }

  const currentStage = savedStatus || (savedPlanId ? 'rascunho' : '')
  const pipeline = [
    { key: 'rascunho', label: 'Elaborado' },
    { key: 'aguardando_familia', label: 'Família' },
    { key: 'vigente', label: 'Vigente' },
  ]
  const stageIdx = pipeline.findIndex((item) => item.key === currentStage)

  return (
    <div>
      {message && <div className="al-ok">{message}</div>}
      {error && <div className="al-error">{error}</div>}

      <div className="pc">
        <SchoolSelector schools={profile?.schools || []} value={schoolId} onChange={(id) => { setSchoolId(id); setStudentId('') }} />
        <div className="pct"><span className="step-chip">1</span> Estudante</div>
        <div className="fg">
          <Field label="Aluno vinculado ao PAEE" wide hint="O PAEE é elaborado a partir da ficha AEE do aluno. Cadastre o aluno na aba de cadastro se ele não aparecer aqui.">
            <select value={studentId} onChange={(event) => setStudentId(event.target.value)}>
              <option value="">{loadingStudents ? 'Carregando alunos...' : 'Selecione o aluno da escola'}</option>
              {students.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.full_name} - {item.grade_level}{item.class_name ? ` / ${item.class_name}` : ''}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {!loadingStudents && !students.length && (
          <p className="pei-note" style={{ marginTop: 8 }}>
            Nenhum aluno com ficha AEE encontrado. Cadastre o aluno na aba &quot;Cadastro do aluno&quot; para que ele apareça aqui.
          </p>
        )}

        {studentId && (
          checkingDocs ? (
            <div className="link-card">
              <div className="link-card-t">Articulação PEI ↔ PAEE</div>
              <p className="pei-note">Verificando PEI e PAEE do aluno...</p>
            </div>
          ) : (
            <>
              {existingPaee && (
                <div className="link-card link-card--warn">
                  <div className="link-card-t">PAEE existente</div>
                  <p className="pei-note">
                    Este aluno já possui um PAEE <strong>({STATUS_LABEL[existingPaee.plan_status] || existingPaee.plan_status})</strong>.
                    Gerar e salvar um novo cria um documento adicional — use isso nas revisões bimestrais/trimestrais.
                  </p>
                </div>
              )}
              {existingPei ? (
                <div className="link-card link-card--ok">
                  <div className="link-card-t">Articulação PEI ↔ PAEE</div>
                  <p className="pei-note">
                    PEI encontrado para este aluno <strong>({STATUS_LABEL[existingPei.plan_status] || existingPei.plan_status})</strong>.
                  </p>
                  <label className="pei-check" style={{ display: 'flex', marginTop: 8, marginBottom: 0 }}>
                    <input type="checkbox" checked={articularPei} onChange={(event) => setArticularPei(event.target.checked)} />
                    Articular o PAEE com o PEI da sala regular (recomendado)
                  </label>
                </div>
              ) : (
                <div className="link-card">
                  <div className="link-card-t">Articulação PEI ↔ PAEE</div>
                  <p className="pei-note">
                    Este aluno ainda não tem PEI. O PAEE pode ser elaborado mesmo assim; a articulação com a sala
                    regular será registrada como recomendação para a equipe elaborar o PEI.
                  </p>
                </div>
              )}
            </>
          )
        )}
      </div>

      <div className="pc">
        <div className="pct"><span className="step-chip">2</span> Organização do atendimento</div>
        <div className="fg">
        <Field label="Frequência semanal" hint="Quantas vezes por semana o aluno será atendido no AEE.">
          <input value={organizacao.frequencia_semanal} onChange={(event) => updateOrganizacao('frequencia_semanal', event.target.value)} placeholder="2 vezes por semana" />
        </Field>
        <Field label="Duração de cada atendimento" hint="Tempo de cada sessão de atendimento.">
          <input value={organizacao.duracao_atendimento} onChange={(event) => updateOrganizacao('duracao_atendimento', event.target.value)} placeholder="50 minutos" />
        </Field>
        <Field label="Tipo de atendimento" hint="Individual, em grupo ou misto, conforme o objetivo de cada atendimento.">
          <select value={organizacao.tipo_atendimento} onChange={(event) => updateOrganizacao('tipo_atendimento', event.target.value as OrganizacaoForm['tipo_atendimento'])}>
            <option value="individual">Individual</option>
            <option value="grupo">Em grupo</option>
            <option value="misto">Misto (individual e grupo)</option>
          </select>
        </Field>
        <Field label="Local" hint="O AEE é realizado prioritariamente na Sala de Recursos Multifuncionais, preferencialmente no contraturno.">
          <input value={organizacao.local} onChange={(event) => updateOrganizacao('local', event.target.value)} placeholder="Sala de Recursos Multifuncionais" />
        </Field>
        <Field label="Horário" hint="Horário combinado com a escola e a família.">
          <input value={organizacao.horario} onChange={(event) => updateOrganizacao('horario', event.target.value)} placeholder="Ex.: terças e quintas, 13h30" />
        </Field>
        <Field label="Turno do AEE" hint="Preferencialmente no contraturno da sala regular.">
          <select value={organizacao.turno_aee} onChange={(event) => updateOrganizacao('turno_aee', event.target.value as OrganizacaoForm['turno_aee'])}>
            <option value="contraturno">Contraturno</option>
            <option value="manha">Manhã</option>
            <option value="tarde">Tarde</option>
            <option value="noite">Noite</option>
          </select>
        </Field>
        <Field label="Período de validade" hint="Período coberto por este PAEE (bimestre, semestre ou ano letivo).">
          <input value={organizacao.periodo_validade} onChange={(event) => updateOrganizacao('periodo_validade', event.target.value)} placeholder="Ex.: 1º semestre de 2026" />
        </Field>
        <Field label="Metas por bimestre/trimestre" wide hint="Metas de acompanhamento que o AEE pretende alcançar em cada período.">
          <textarea value={organizacao.metas_periodo} onChange={(event) => updateOrganizacao('metas_periodo', event.target.value)} placeholder="Ex.: 1º bimestre: consolidar rotina visual; 2º bimestre: ampliar comunicação alternativa" />
        </Field>
          <Field label="Observações do professor AEE" wide hint="Avaliação funcional/pedagógica, prioridades do atendimento e o que mais a IA deve considerar.">
            <textarea value={observacoes} onChange={(event) => setObservacoes(event.target.value)} placeholder="Avaliação funcional, prioridades, combinados com a família e com o professor regente" />
          </Field>
        </div>

        <div className="brow" style={{ marginTop: 14 }}>
          <button className="btn btn-pri btn-lg" type="button" disabled={generating || !studentId} onClick={() => void generatePaee()}>
            {generating ? 'Gerando PAEE...' : '✦ Gerar PAEE com IA'}
          </button>
          {!studentId && <span className="pei-note">Selecione o aluno na etapa 1 para liberar a geração.</span>}
        </div>
      </div>

      {generated && (
        <div className="pc">
          <div className="pct"><span className="step-chip">3</span> Revisão e tramitação</div>

          <div className="pipe" aria-label="Tramitação do PAEE">
            {pipeline.map((item, i) => (
              <span key={item.key} className={`pipe-pill${i <= stageIdx && stageIdx >= 0 ? ' on' : ''}`}>
                {item.label}
              </span>
            ))}
            {currentStage && (
              <span className={`status-chip is-${currentStage}`} style={{ marginLeft: 'auto' }}>
                {STATUS_LABEL[currentStage] || currentStage}
              </span>
            )}
          </div>

          <p className="pei-note" style={{ marginBottom: 10 }}>
            Revise o texto gerado — a revisão humana do professor AEE é obrigatória antes do envio à família.
          </p>
          <textarea
            className="doc-editor"
            value={generated}
            onChange={(event) => setGenerated(event.target.value)}
            aria-label="Texto do PAEE para revisão"
          />
          <div className="doc-actions">
            <button className="btn btn-pri" type="button" disabled={saving || !!savedPlanId} onClick={() => void savePaee()}>
              {saving ? 'Salvando...' : savedPlanId ? 'PAEE salvo ✓' : 'Salvar PAEE'}
            </button>
            {savedPlanId && savedStatus === 'rascunho' && (
              <button className="btn btn-suc" type="button" disabled={sending} onClick={() => void sendToFamily()}>
                {sending ? 'Enviando...' : 'Enviar para ciência da família'}
              </button>
            )}
            <button className="btn btn-out" type="button" onClick={() => void downloadPdf()}>
              ↓ Baixar PDF
            </button>
            <p className="pei-note">
              {savedStatus === 'aguardando_familia'
                ? 'A família visualiza o PAEE no portal da família; a concordância pode ser registrada pela família ou pela coordenação em nome dela.'
                : savedPlanId
                ? 'Rascunho salvo. Envie para ciência da família quando o texto estiver pronto.'
                : 'Salve para vincular o PAEE ao aluno e iniciar a tramitação.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
