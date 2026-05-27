'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Carregando badges...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const unlockedCount = badges.filter((b) => b.unlocked).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">🏅 Suas Conquistas</h1>
          <button
            onClick={async () => {
              await signOut()
              router.push('/')
            }}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500 text-sm mb-2">Pontos Totais</p>
            <p className="text-4xl font-bold text-indigo-600">{userPoints}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500 text-sm mb-2">Badges Desbloqueados</p>
            <p className="text-4xl font-bold text-green-600">
              {unlockedCount}/{badges.length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500 text-sm mb-2">Progresso Geral</p>
            <p className="text-4xl font-bold text-purple-600">
              {Math.round((unlockedCount / badges.length) * 100)}%
            </p>
          </div>
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={`rounded-lg shadow-lg p-6 text-center transition transform hover:scale-105 ${
                badge.unlocked
                  ? 'bg-gradient-to-br from-yellow-100 to-yellow-50 border-2 border-yellow-400'
                  : 'bg-white opacity-60'
              }`}
            >
              {/* Icon */}
              <div className="text-6xl mb-4">{badge.icon}</div>

              {/* Badge Name */}
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {badge.name}
              </h3>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-4">{badge.description}</p>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      badge.unlocked ? 'bg-green-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${badge.progress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {Math.round(badge.progress)}%
                </p>
              </div>

              {/* Status */}
              {badge.unlocked ? (
                <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold inline-block">
                  ✓ Desbloqueado
                </div>
              ) : (
                <div className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm font-semibold inline-block">
                  Bloqueado
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Info Section */}
        <div className="mt-12 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Como ganhar pontos?
          </h2>
          <ul className="space-y-3 text-gray-700">
            <li>⭐ Criar experiência: +10 pontos</li>
            <li>❤️ Receber like: +5 pontos</li>
            <li>💬 Comentário recebido: +2 pontos</li>
            <li>📚 Completar plano: +20 pontos</li>
            <li>🎯 Dominar skill: +50 pontos</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
