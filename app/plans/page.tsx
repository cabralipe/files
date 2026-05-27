'use client'

import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePlans } from '@/hooks/usePlans'

type Plan = {
  id: string
  title: string
  teacher: string
  school: string
  grade_level: string
  subject: string
  duration: string
  objectives: string
  notes: string
  created_at: string
  coordinator_viewed_at?: string
  coordinator_name?: string
  coordinator_note?: string
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
)

export default function PlansPage() {
  const router = useRouter()
  const { user, isAuthenticated, loading: authLoading, signOut } = useAuth()
  const { enrollPlan, loading: planLoading } = usePlans()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
      return
    }

    if (isAuthenticated) {
      void fetchPlans()
    }
  }, [authLoading, isAuthenticated, router])

  async function fetchPlans() {
    try {
      setLoading(true)
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      const response = await fetch('/api/plans?limit=50', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Erro ao carregar planos')
      }

      setPlans(payload.data || payload.plans || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar planos')
    } finally {
      setLoading(false)
    }
  }

  async function handleEnrollPlan(planId: string) {
    if (!user) {
      return
    }

    try {
      await enrollPlan(user.id, planId)
      setMessage('Plano registrado no seu historico.')
      window.setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar plano')
    }
  }

  if (authLoading || loading) {
    return (
      <main className="auth-state">
        <div className="spin" />
        <p>Carregando planos...</p>
      </main>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <main>
      <header id="hdr">
        <div className="hdr-in">
          <Link href="/" className="logo">
            <div className="logo-ic">BN</div>
            <div>
              <div className="logo-t">Planos de aula</div>
              <div className="logo-s">Planos publicados no portal</div>
            </div>
          </Link>
          <nav className="hdr-nav" aria-label="Acessos">
            <Link className="nb nb-cta" href="/">
              Criar plano
            </Link>
            <button
              className="nb"
              onClick={async () => {
                await signOut()
                router.push('/')
              }}
            >
              Sair
            </button>
          </nav>
        </div>
      </header>

      <section className="pg">
        <div className="saved-head">
          <div>
            <h1>Planos publicados</h1>
            <p>Planos criados no fluxo publico e salvos no Supabase.</p>
          </div>
        </div>

        {message && <div className="al-ok">{message}</div>}
        {error && <div className="al-error">{error}</div>}

        <div className="plans-grid">
          {plans.length ? (
            plans.map((plan) => (
              <article className="plan-item" key={plan.id}>
                <div className="pi-header">
                  <div>
                    <h2 className="pi-title">{plan.title}</h2>
                    <div className="pi-date">{new Date(plan.created_at).toLocaleString('pt-BR')}</div>
                  </div>
                </div>
                <div className="pi-meta">
                  <span className="tag ta">{plan.grade_level}</span>
                  <span className="tag tcd">{plan.subject}</span>
                  <span className="tag ta">{plan.duration}</span>
                </div>
                <p className="plan-preview">{plan.objectives || plan.notes || 'Plano de aula BNCC.'}</p>
                <p className="exp-author">{plan.teacher || 'Professor(a)'} - {plan.school || 'Escola Municipal'}</p>
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
                <div className="brow">
                  <button
                    className="btn btn-out"
                    disabled={planLoading}
                    onClick={() => handleEnrollPlan(plan.id)}
                    type="button"
                  >
                    Registrar acesso
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="est">Nenhum plano publicado ainda.</div>
          )}
        </div>
      </section>
    </main>
  )
}
