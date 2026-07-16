'use client'

import { supabase } from '@/lib/supabase-client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from '@/lib/m-link'
import { useAuth } from '@/hooks/useAuth'
import PeiReviewQueue from '@/components/PeiReviewQueue'


type Plan = {
  id: string
  title: string
  teacher: string
  school: string
  grade_level: string
  subject: string
  date: string
  duration: string
  objectives: string
  notes: string
  content: string
  created_at: string
  coordinator_viewed_at?: string
  coordinator_name?: string
  coordinator_note?: string
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token
}

export default function CoordinatorDashboard() {
  const router = useRouter()
  const { profile, loading: authLoading, isAuthenticated } = useAuth()
  const [plans, setPlans] = useState<Plan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const isCoordinator = profile?.role === 'coordinator'

  const stats = useMemo(() => {
    const reviewed = plans.filter((plan) => plan.coordinator_viewed_at).length
    return {
      total: plans.length,
      reviewed,
      pending: plans.length - reviewed,
      teachers: new Set(plans.map((plan) => plan.teacher).filter(Boolean)).size,
    }
  }, [plans])

  useEffect(() => {
    if (authLoading) return

    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    if (!isCoordinator) {
      setError('Este painel e restrito ao acesso de coordenador.')
      setLoading(false)
      return
    }

    void fetchPlans()
  }, [authLoading, isAuthenticated, isCoordinator, router])

  async function fetchPlans() {
    try {
      setLoading(true)
      setError('')
      const token = await getAccessToken()
      const response = await fetch('/api/coordinator/plans', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Erro ao carregar planos')
      }

      setPlans(payload.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar planos')
    } finally {
      setLoading(false)
    }
  }

  function openPlan(plan: Plan) {
    setSelectedPlan(plan)
    setNote(plan.coordinator_note || '')
    setMessage('')
  }

  async function saveReview() {
    if (!selectedPlan) return

    try {
      setSaving(true)
      setError('')
      const token = await getAccessToken()
      const response = await fetch(`/api/coordinator/plans/${selectedPlan.id}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ note }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Erro ao registrar revisao')
      }

      const updated = payload.data as Plan
      setPlans((current) => current.map((plan) => (plan.id === updated.id ? updated : plan)))
      setSelectedPlan(updated)
      setMessage('Revisao registrada para o professor.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar revisao')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <main className="auth-state">
        <div className="spin" />
        <p>Carregando dashboard da coordenação...</p>
      </main>
    )
  }

  return (
    <main>

      <section className="pg">
        <div className="saved-head">
          <div>
            <h1>Planos da escola</h1>
            <p>Veja professor, data de criação, status de validação e registre ressalvas.</p>
          </div>
        </div>

        {error && <div className="al-error">{error}</div>}
        {message && <div className="al-ok">{message}</div>}

        {isCoordinator && (
          <>
            <div className="coord-stats">
              <div>
                <strong>{stats.total}</strong>
                <span>planos</span>
              </div>
              <div>
                <strong>{stats.reviewed}</strong>
                <span>validados</span>
              </div>
              <div>
                <strong>{stats.pending}</strong>
                <span>pendentes</span>
              </div>
              <div>
                <strong>{stats.teachers}</strong>
                <span>professores</span>
              </div>
            </div>

            <div className="coord-layout">
              <div className="coord-table">
                <div className="coord-row coord-head">
                  <span>Plano</span>
                  <span>Professor</span>
                  <span>Data</span>
                  <span>Status</span>
                </div>
                {plans.length ? (
                  plans.map((plan) => (
                    <button
                      className={`coord-row ${selectedPlan?.id === plan.id ? 'active' : ''}`}
                      key={plan.id}
                      onClick={() => openPlan(plan)}
                      type="button"
                    >
                      <span>
                        <strong>{plan.title}</strong>
                        <small>{plan.grade_level} - {plan.subject}</small>
                      </span>
                      <span>{plan.teacher || 'Professor(a)'}</span>
                      <span>{new Date(plan.created_at).toLocaleDateString('pt-BR')}</span>
                      <span>{plan.coordinator_viewed_at ? 'Validado' : 'Pendente'}</span>
                    </button>
                  ))
                ) : (
                  <div className="est">Nenhum plano criado para esta escola ainda.</div>
                )}
              </div>

              <aside className="coord-detail">
                {selectedPlan ? (
                  <>
                    <div>
                      <span className="tag tcd">{selectedPlan.subject}</span>
                      <h2>{selectedPlan.title}</h2>
                      <p>{selectedPlan.teacher} - {selectedPlan.school}</p>
                      <p>{new Date(selectedPlan.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                    <textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Digite ressalvas, orientações ou deixe em branco para validar o documento."
                    />
                    <button className="btn btn-pri" disabled={saving} onClick={saveReview} type="button">
                      {saving ? 'Salvando...' : 'Salvar validação e ressalva'}
                    </button>
                    <div className="coord-preview">{selectedPlan.content}</div>
                  </>
                ) : (
                  <div className="est">Selecione um plano para validar e registrar ressalvas.</div>
                )}
              </aside>
            </div>
          </>
        )}
      </section>

      {isCoordinator && (
        <section className="pg">
          <div className="saved-head">
            <div>
              <h1>Pipeline de PEIs</h1>
              <p>Acompanhe os PEIs da escola: gerado → validação do AEE → família → vigente. Você pode registrar a ciência da família em nome dela quando o PEI estiver aguardando.</p>
            </div>
          </div>
          <PeiReviewQueue mode="coordination" />
        </section>
      )}

      {isCoordinator && (
        <section className="pg">
          <div className="saved-head">
            <div>
              <h1>Pipeline de PAEEs</h1>
              <p>Acompanhe os planos do AEE da escola: elaborado → família → vigente. Você pode registrar a ciência da família em nome dela quando o PAEE estiver aguardando.</p>
            </div>
          </div>
          <PeiReviewQueue mode="coordination" kind="paee" />
        </section>
      )}
    </main>
  )
}
