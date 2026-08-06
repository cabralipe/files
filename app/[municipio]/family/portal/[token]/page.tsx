'use client'

import { useCallback, useEffect, useState } from 'react'
import PlanContentModal, { type PlanContentModalData } from '@/components/PlanContentModal'

type FamilyDoc = {
  id: string
  title: string
  content: string
  is_paee: boolean
  plan_status?: string
  is_published: boolean
  consulta_familia?: { concordancia?: string }
  created_at: string
}

type ClassPlan = {
  id: string
  title: string
  content: string
  subject: string
  teacher: string
  coordinator_viewed_at?: string
  created_at: string
}

type PortalState =
  | { status: 'loading' }
  | { status: 'not_found' | 'revoked' | 'error'; message: string }
  | { status: 'pending_approval'; responsible_name: string }
  | {
      status: 'approved'
      responsible_name: string
      relationship?: string
      student: { id: string; full_name: string; school_name: string; grade_level: string; class_name?: string }
      documents: FamilyDoc[]
      class_plans: ClassPlan[]
    }

function concordanciaLabel(value?: string) {
  if (value === 'aprovado') return 'Aprovado'
  if (value === 'ciencia_sem_aprovacao') return 'Ciência sem aprovação'
  return 'Pendente'
}

export default function FamilyPortalPage({ params }: { params: { token: string } }) {
  const { token } = params
  const [state, setState] = useState<PortalState>({ status: 'loading' })
  const [reading, setReading] = useState<PlanContentModalData | null>(null)
  const [consentFor, setConsentFor] = useState('')
  const [consentForm, setConsentForm] = useState({
    responsavel_nome: '',
    parentesco: '',
    concordancia: 'aprovado' as 'aprovado' | 'ciencia_sem_aprovacao',
    observacoes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/family/portal/${encodeURIComponent(token)}`)
      const payload = await res.json()
      if (res.status === 404) {
        setState({ status: 'not_found', message: payload.error || 'Link inválido.' })
        return
      }
      if (res.status === 403) {
        setState({ status: 'revoked', message: payload.error || 'Este link foi revogado.' })
        return
      }
      if (!res.ok) {
        setState({ status: 'error', message: payload.error || 'Não foi possível carregar os dados.' })
        return
      }
      if (payload.status === 'pending_approval') {
        setState({ status: 'pending_approval', responsible_name: payload.responsible_name })
        return
      }
      setState({
        status: 'approved',
        responsible_name: payload.responsible_name,
        relationship: payload.relationship,
        student: payload.student,
        documents: payload.documents || [],
        class_plans: payload.class_plans || [],
      })
    } catch {
      setState({ status: 'error', message: 'Não foi possível carregar os dados. Verifique sua conexão.' })
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  function openConsent(doc: FamilyDoc) {
    const responsibleName = state.status === 'approved' ? state.responsible_name : ''
    const relationship = state.status === 'approved' ? state.relationship || '' : ''
    setConsentForm({
      responsavel_nome: responsibleName,
      parentesco: relationship,
      concordancia: 'aprovado',
      observacoes: '',
    })
    setError('')
    setMessage('')
    setConsentFor(doc.id)
  }

  async function submitConsent(docId: string) {
    if (!consentForm.responsavel_nome.trim()) {
      setError('Informe o nome do responsável que está dando ciência.')
      return
    }
    try {
      setSubmitting(true)
      setError('')
      setMessage('')
      const res = await fetch(`/api/family/portal/${encodeURIComponent(token)}/consent`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: docId, ...consentForm }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Erro ao registrar ciência')
      setConsentFor('')
      setMessage('Ciência registrada. O documento passou a vigente.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar ciência')
    } finally {
      setSubmitting(false)
    }
  }

  if (state.status === 'loading') {
    return (
      <main className="auth-state">
        <div className="spin" />
        <p>Carregando...</p>
      </main>
    )
  }

  if (state.status === 'not_found' || state.status === 'revoked' || state.status === 'error') {
    return (
      <main>
        <section className="pg">
          <div className="al-error">{state.message}</div>
        </section>
      </main>
    )
  }

  if (state.status === 'pending_approval') {
    return (
      <main>
        <section className="pg">
          <div className="saved-head">
            <div>
              <h1>Acesso aguardando aprovação</h1>
              <p>Olá, {state.responsible_name}. A coordenação da escola ainda precisa aprovar este acesso.</p>
            </div>
          </div>
          <div className="al-info">
            Assim que a coordenação aprovar, este mesmo link passa a mostrar o PEI/PAEE do aluno e os planos de aula
            da turma. Você pode fechar esta página e voltar mais tarde no mesmo link.
          </div>
        </section>
      </main>
    )
  }

  return (
    <main>
      <section className="pg">
        <div className="saved-head">
          <div>
            <h1>{state.student.full_name}</h1>
            <p>
              {state.student.grade_level}
              {state.student.class_name ? ` / ${state.student.class_name}` : ''} · {state.student.school_name}
            </p>
          </div>
        </div>

        <div className="pei-block pei-tutorial" style={{ marginBottom: 20 }}>
          <div className="pei-tutorial-title">Sobre o que você vê aqui</div>
          <ol className="pei-tutorial-steps">
            <li><strong>PEI</strong> — plano da sala regular para apoiar o aprendizado do seu filho(a).</li>
            <li><strong>PAEE</strong> — plano do Atendimento Educacional Especializado (AEE), quando houver.</li>
            <li><strong>Planos de aula</strong> — planos da turma já validados pela coordenação da escola.</li>
          </ol>
        </div>

        {error && <div className="al-error">{error}</div>}
        {message && <div className="al-ok">{message}</div>}

        <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
          PEI e PAEE
        </h2>
        <div className="plans-grid" style={{ marginBottom: 28 }}>
          {state.documents.length ? state.documents.map((doc) => (
            <article className="plan-item" key={doc.id}>
              <div className="pi-header">
                <h2 className="pi-title">{doc.title}</h2>
                <div className="pi-date">{new Date(doc.created_at).toLocaleString('pt-BR')}</div>
              </div>
              <div className="pi-meta">
                <span className="tag">{doc.is_paee ? 'PAEE' : 'PEI'}</span>
                <span className="tag tcd">
                  {doc.plan_status === 'vigente' || doc.is_published
                    ? 'Vigente'
                    : doc.plan_status === 'aguardando_familia'
                      ? 'Aguardando sua ciência'
                      : 'Em elaboração'}
                </span>
                <span className="tag ta">{concordanciaLabel(doc.consulta_familia?.concordancia)}</span>
              </div>
              <p className="plan-preview">{doc.content?.slice(0, 220) || 'Documento sem conteúdo disponível.'}</p>
              <div className="pi-actions">
                <button className="btn btn-gh" onClick={() => setReading({ title: doc.title, content: doc.content })}>
                  Ler completo
                </button>
              </div>

              {doc.plan_status === 'aguardando_familia' && (
                consentFor === doc.id ? (
                  <div className="pei-source" style={{ marginTop: 10, padding: '12px 14px', border: '2px solid var(--ink)', background: 'var(--paper-soft)' }}>
                    <div className="pei-tutorial-title" style={{ marginBottom: 8 }}>Registrar ciência do {doc.is_paee ? 'PAEE' : 'PEI'}</div>
                    <label className="fgr" style={{ display: 'block', marginBottom: 8 }}>
                      <span className="fl">Nome do responsável</span>
                      <input
                        value={consentForm.responsavel_nome}
                        onChange={(e) => setConsentForm((c) => ({ ...c, responsavel_nome: e.target.value }))}
                        placeholder="Seu nome completo"
                      />
                    </label>
                    <label className="fgr" style={{ display: 'block', marginBottom: 8 }}>
                      <span className="fl">Parentesco / relação</span>
                      <input
                        value={consentForm.parentesco}
                        onChange={(e) => setConsentForm((c) => ({ ...c, parentesco: e.target.value }))}
                        placeholder="Ex.: mãe, pai, responsável legal"
                      />
                    </label>
                    <label className="fgr" style={{ display: 'block', marginBottom: 8 }}>
                      <span className="fl">Manifestação</span>
                      <select
                        value={consentForm.concordancia}
                        onChange={(e) => setConsentForm((c) => ({ ...c, concordancia: e.target.value as 'aprovado' | 'ciencia_sem_aprovacao' }))}
                      >
                        <option value="aprovado">Concordo com o plano</option>
                        <option value="ciencia_sem_aprovacao">Dou ciência, mas tenho ressalvas</option>
                      </select>
                    </label>
                    <label className="fgr" style={{ display: 'block', marginBottom: 10 }}>
                      <span className="fl">Observações (opcional)</span>
                      <textarea
                        value={consentForm.observacoes}
                        onChange={(e) => setConsentForm((c) => ({ ...c, observacoes: e.target.value }))}
                        placeholder="Comentários ou expectativas que queira registrar"
                      />
                    </label>
                    <div className="brow" style={{ margin: 0, gap: 8 }}>
                      <button className="btn btn-suc" type="button" disabled={submitting} onClick={() => void submitConsent(doc.id)}>
                        {submitting ? 'Registrando...' : 'Confirmar ciência'}
                      </button>
                      <button className="btn btn-out" type="button" disabled={submitting} onClick={() => setConsentFor('')}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pi-actions" style={{ marginTop: 10 }}>
                    <button className="btn btn-pri" type="button" onClick={() => openConsent(doc)}>
                      Dar ciência / concordar
                    </button>
                  </div>
                )
              )}
            </article>
          )) : (
            <div className="est">Nenhum PEI ou PAEE registrado ainda para este aluno.</div>
          )}
        </div>

        <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
          Planos de aula da turma
        </h2>
        <div className="plans-grid">
          {state.class_plans.length ? state.class_plans.map((plan) => (
            <article className="plan-item" key={plan.id}>
              <div className="pi-header">
                <h2 className="pi-title">{plan.title}</h2>
                <div className="pi-date">{new Date(plan.created_at).toLocaleString('pt-BR')}</div>
              </div>
              <div className="pi-meta">
                <span className="tag tcd">{plan.subject}</span>
                <span className="coord-badge">Validado pela coordenação</span>
              </div>
              <p className="plan-preview">{plan.content?.slice(0, 220) || 'Plano sem conteúdo disponível.'}</p>
              <div className="pi-actions">
                <button className="btn btn-gh" onClick={() => setReading({ title: plan.title, meta: plan.teacher, content: plan.content })}>
                  Ler completo
                </button>
              </div>
            </article>
          )) : (
            <div className="est">Nenhum plano de aula validado pela coordenação ainda para esta turma.</div>
          )}
        </div>
      </section>

      <PlanContentModal data={reading} onClose={() => setReading(null)} />
    </main>
  )
}
