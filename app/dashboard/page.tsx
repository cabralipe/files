'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

export default function Dashboard() {
  const router = useRouter()
  const { user, loading, signOut, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [loading, isAuthenticated, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div>
      {/* Header */}
      <header id="hdr">
        <div className="hdr-in">
          <Link href="/" className="logo" aria-label="Voltar ao portal">
            <div className="logo-ic">BN</div>
            <div>
              <div className="logo-t">Portal BNCC Computação</div>
              <div className="logo-s">Dashboard do Professor</div>
            </div>
          </Link>
          <nav className="hdr-nav" aria-label="Acessos">
            <Link className="nb" href="/">
              Habilidades e planos
            </Link>
            <Link className="nb" href="/experiences">
              Experiências
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

      {/* Main Content */}
      <main className="pg">
        {/* Welcome Card */}
        <div className="pc" style={{ marginBottom: '24px' }}>
          <h2 className="pct" style={{ fontSize: '24px', marginBottom: '8px' }}>
            Bem-vindo, {user?.user_metadata?.name || user?.email}! 👋
          </h2>
          <p style={{ color: 'var(--ink-soft)' }}>
            Você está conectado e pronto para começar a usar a plataforma.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="stats" style={{ marginBottom: '24px' }}>
          <div className="sc">
            <span className="sc-ic">🏆</span>
            <div>
              <div className="sc-n">0</div>
              <div className="sc-l">Pontos</div>
            </div>
          </div>
          <div className="sc">
            <span className="sc-ic">⭐</span>
            <div>
              <div className="sc-n">0</div>
              <div className="sc-l">Experiências</div>
            </div>
          </div>
          <div className="sc">
            <span className="sc-ic">📋</span>
            <div>
              <div className="sc-n">0</div>
              <div className="sc-l">Planos</div>
            </div>
          </div>
          <div className="sc">
            <span className="sc-ic">🥇</span>
            <div>
              <div className="sc-n">-</div>
              <div className="sc-l">Rank</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
          <div className="pc">
            <h3 className="pct">Ações Rápidas</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link
                href="/"
                className="btn btn-pri"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Explorar Habilidades
              </Link>
              <Link
                href="/experiences"
                className="btn btn-suc"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Ver Experiências
              </Link>
              <Link
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  // Simulate switching to plans view by loading it via state/params if needed, 
                  // or just route back to page.tsx with tab state
                  window.location.href = '/?view=saved';
                }}
                className="btn btn-out"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Meus Planos
              </Link>
            </div>
          </div>

          <div className="pc">
            <h3 className="pct">Informações da Conta</h3>
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
              <Link
                href="/profile"
                className="btn btn-gh"
                style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
              >
                Editar Perfil
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
