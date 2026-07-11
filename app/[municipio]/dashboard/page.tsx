'use client'

import { useEffect, useState } from 'react'
import { useRouter } from '@/lib/m-link'
import Link from '@/lib/m-link'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase-client'

type Stats = { points: number | null; plans: number | null; rank: number | null }

export default function Dashboard() {
  const router = useRouter()
  const { user, loading, isAuthenticated } = useAuth()
  const [stats, setStats] = useState<Stats>({ points: null, plans: null, rank: null })

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [loading, isAuthenticated, router])

  useEffect(() => {
    if (!isAuthenticated) return
    let active = true
    ;(async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const token = data.session?.access_token
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined
        const [rankRes, plansRes] = await Promise.all([
          fetch('/api/ranking', { headers }),
          fetch('/api/plans', { headers }),
        ])
        const rankPayload = rankRes.ok ? await rankRes.json() : null
        const plansPayload = plansRes.ok ? await plansRes.json() : null
        if (!active) return
        setStats({
          points: rankPayload?.userPosition?.total_points ?? 0,
          rank: rankPayload?.userPosition?.rank ?? null,
          plans: typeof plansPayload?.total === 'number' ? plansPayload.total : (plansPayload?.data?.length ?? 0),
        })
      } catch {
        if (active) setStats({ points: 0, plans: 0, rank: null })
      }
    })()
    return () => {
      active = false
    }
  }, [isAuthenticated])

  if (loading) {
    return (
      <main className="pg">
        <div className="pc" aria-live="polite">Carregando…</div>
      </main>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const fmt = (v: number | null) => (v === null ? '—' : String(v))

  return (
    <main className="pg">
      {/* Welcome Card */}
      <div className="pc" style={{ marginBottom: '24px' }}>
        <h2 className="pct" style={{ fontSize: '24px', marginBottom: '8px' }}>
          Bem-vindo, {user?.user_metadata?.name || user?.email}! 👋
        </h2>
        <p style={{ color: 'var(--ink-soft)' }}>
          Você está conectado e pronto para criar planos, PEIs e acompanhar suas turmas.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="stats" style={{ marginBottom: '24px' }}>
        <div className="sc">
          <span className="sc-ic">🏆</span>
          <div>
            <div className="sc-n">{fmt(stats.points)}</div>
            <div className="sc-l">Pontos</div>
          </div>
        </div>
        <div className="sc">
          <span className="sc-ic">📋</span>
          <div>
            <div className="sc-n">{fmt(stats.plans)}</div>
            <div className="sc-l">Planos salvos</div>
          </div>
        </div>
        <div className="sc">
          <span className="sc-ic">🥇</span>
          <div>
            <div className="sc-n">{stats.rank === null ? '—' : `#${stats.rank}`}</div>
            <div className="sc-l">Posição no ranking</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
        <div className="pc">
          <h3 className="pct">Ações rápidas</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link href="/" className="btn btn-pri" style={{ width: '100%', justifyContent: 'center' }}>
              Explorar habilidades
            </Link>
            <Link href="/plans" className="btn btn-out" style={{ width: '100%', justifyContent: 'center' }}>
              Meus planos
            </Link>
            <Link href="/experiences" className="btn btn-suc" style={{ width: '100%', justifyContent: 'center' }}>
              Ver experiências
            </Link>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Link href="/badges" className="btn btn-gh" style={{ flex: 1, justifyContent: 'center' }}>
                🏅 Conquistas
              </Link>
              <Link href="/gallery" className="btn btn-gh" style={{ flex: 1, justifyContent: 'center' }}>
                🖼 Galeria
              </Link>
            </div>
          </div>
        </div>

        <div className="pc">
          <h3 className="pct">Informações da conta</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>Email</p>
              <p style={{ fontWeight: 600, color: 'var(--ink)' }}>{user?.email}</p>
            </div>
            <div style={{ borderTop: '1px dashed var(--ink-faint)', paddingTop: '10px' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>Nome</p>
              <p style={{ fontWeight: 600, color: 'var(--ink)' }}>
                {user?.user_metadata?.name || 'Não informado'}
              </p>
            </div>
            <Link href="/profile" className="btn btn-gh" style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}>
              Editar perfil
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
