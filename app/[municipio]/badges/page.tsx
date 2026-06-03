'use client'

import { supabase } from '@/lib/supabase-client'

import { useEffect, useState } from 'react'
import { useRouter } from '@/lib/m-link'
import Link from '@/lib/m-link'
import { useAuth } from '@/hooks/useAuth'


interface Badge {
  id: string
  name: string
  description: string
  icon: string
  requirement: number
  unlocked: boolean
  progress: number
}

const AVAILABLE_BADGES: Badge[] = [
  {
    id: '1',
    name: 'Iniciante',
    description: 'Ganhe 10 pontos',
    icon: '⭐',
    requirement: 10,
    unlocked: false,
    progress: 0,
  },
  {
    id: '2',
    name: 'Aprendiz',
    description: 'Ganhe 50 pontos',
    icon: '📚',
    requirement: 50,
    unlocked: false,
    progress: 0,
  },
  {
    id: '3',
    name: 'Competente',
    description: 'Ganhe 100 pontos',
    icon: '🎯',
    requirement: 100,
    unlocked: false,
    progress: 0,
  },
  {
    id: '4',
    name: 'Especialista',
    description: 'Ganhe 500 pontos',
    icon: '🚀',
    requirement: 500,
    unlocked: false,
    progress: 0,
  },
  {
    id: '5',
    name: 'Mestre',
    description: 'Ganhe 1000 pontos',
    icon: '👑',
    requirement: 1000,
    unlocked: false,
    progress: 0,
  },
  {
    id: '6',
    name: 'Socialite',
    description: 'Receba 10 likes',
    icon: '💬',
    requirement: 10,
    unlocked: false,
    progress: 0,
  },
  {
    id: '7',
    name: 'Influenciador',
    description: 'Receba 50 likes',
    icon: '📱',
    requirement: 50,
    unlocked: false,
    progress: 0,
  },
  {
    id: '8',
    name: 'Criador',
    description: 'Publique 5 experiências',
    icon: '✨',
    requirement: 5,
    unlocked: false,
    progress: 0,
  },
]

export default function Badges() {
  const router = useRouter()
  const { user, isAuthenticated, loading: authLoading, signOut } = useAuth()

  const [badges, setBadges] = useState<Badge[]>(AVAILABLE_BADGES)
  const [userPoints, setUserPoints] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
      return
    }

    if (user) {
      fetchUserData()
    }
  }, [user, authLoading, isAuthenticated, router])

  const fetchUserData = async () => {
    try {
      setLoading(true)
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      const response = await fetch('/api/points', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar pontuacao')
      }

      const points = data?.total_points || 0
      setUserPoints(points)

      // Calcular progresso das badges
      const updatedBadges = AVAILABLE_BADGES.map((badge) => ({
        ...badge,
        unlocked: points >= badge.requirement,
        progress: Math.min((points / badge.requirement) * 100, 100),
      }))

      setBadges(updatedBadges)
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <main className="auth-state">
        <div className="spin" />
        <p>Carregando conquistas...</p>
      </main>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const unlockedCount = badges.filter((b) => b.unlocked).length

  return (
    <main>
      {/* Header */}
      <header id="hdr">
        <div className="hdr-in">
          <Link href="/" className="logo" aria-label="Voltar ao portal">
            <div className="logo-ic">BN</div>
            <div>
              <div className="logo-t">Portal BNCC Computação</div>
              <div className="logo-s">Minhas conquistas e insígnias</div>
            </div>
          </Link>
          <nav className="hdr-nav" aria-label="Acessos">
            <Link className="nb" href="/">
              Início
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
      <section className="pg">
        <div className="saved-head">
          <div>
            <h1>🏅 Suas Conquistas</h1>
            <p>Acompanhe sua pontuação de engajamento pedagógico na rede municipal.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="coord-stats mb-8">
          <div>
            <strong>{userPoints}</strong>
            <span>Pontos Totais</span>
          </div>
          <div>
            <strong>{unlockedCount}/{badges.length}</strong>
            <span>Insígnias Desbloqueadas</span>
          </div>
          <div>
            <strong>{Math.round((unlockedCount / badges.length) * 100)}%</strong>
            <span>Progresso Geral</span>
          </div>
        </div>

        {/* Badges Grid */}
        <div className="plans-grid">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={`pc text-center transition-all ${
                badge.unlocked
                  ? 'bg-[#FBEFCC]'
                  : 'opacity-50'
              }`}
              style={badge.unlocked ? { transform: `rotate(${(parseInt(badge.id) % 3) - 1.5}deg)` } : {}}
            >
              {/* Icon */}
              <div className="text-6xl mb-4 select-none transform hover:scale-110 transition-transform duration-100">{badge.icon}</div>

              {/* Badge Name */}
              <h3 className="pct justify-center">
                {badge.name}
              </h3>

              {/* Description */}
              <p className="text-xs text-gray-600 mb-4">{badge.description}</p>

              {/* Progress Bar (Risographic Custom) */}
              <div className="mb-4">
                <div className="w-full bg-[#E8DCB8] border-2 border-black h-4 overflow-hidden relative">
                  <div
                    className={`h-full transition-all border-r-2 border-black ${
                      badge.unlocked ? 'bg-[#1E8C7E]' : 'bg-[#E5394B]'
                    }`}
                    style={{ width: `${badge.progress}%` }}
                  ></div>
                </div>
                <p className="text-xs font-mono font-bold mt-1 text-gray-700">
                  {Math.round(badge.progress)}%
                </p>
              </div>

              {/* Status */}
              {badge.unlocked ? (
                <span className="tag tcd">✓ Desbloqueado</span>
              ) : (
                <span className="tag ta">Bloqueado</span>
              )}
            </div>
          ))}
        </div>

        {/* Info Section */}
        <div className="pc mt-12">
          <h2 className="pct">Como ganhar pontos e desbloquear insígnias?</h2>
          <ul className="space-y-3 font-body text-sm font-semibold">
            <li className="flex items-center gap-2">
              <span className="tag tc">⭐ Criar experiência</span>
              <span className="text-gray-700">+10 pontos</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="tag ta">❤️ Receber like</span>
              <span className="text-gray-700">+5 pontos</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="tag tcd">💬 Comentário recebido</span>
              <span className="text-gray-700">+2 pontos</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="tag tm">📚 Completar plano</span>
              <span className="text-gray-700">+20 pontos</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="tag tp">🎯 Dominar skill</span>
              <span className="text-gray-700">+50 pontos</span>
            </li>
          </ul>
        </div>
      </section>
    </main>
  )
}
