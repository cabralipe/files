'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { usePoints } from '@/hooks/usePoints'

interface RankingUser {
  id: string
  name: string
  email: string
  points: number
  rank: number
}

export default function Ranking() {
  const router = useRouter()
  const { isAuthenticated, loading: authLoading, signOut } = useAuth()
  const { getRanking } = usePoints()

  const [ranking, setRanking] = useState<RankingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
      return
    }

    fetchRanking()
  }, [authLoading, isAuthenticated, router])

  const fetchRanking = async () => {
    try {
      setLoading(true)
      const data = await getRanking(100)
      setRanking(data)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar ranking')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Carregando ranking...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">🏆 Ranking Global</h1>
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
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-800 rounded">
            {error}
          </div>
        )}

        {/* Top 3 Podium */}
        {ranking.length >= 3 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
              Top 3
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {/* 2nd Place */}
              <div className="md:order-1 bg-white rounded-lg shadow-lg p-6 border-t-4 border-gray-400">
                <div className="text-center">
                  <div className="text-5xl mb-2">🥈</div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {ranking[1]?.name || '-'}
                  </h3>
                  <p className="text-gray-600">{ranking[1]?.email || '-'}</p>
                  <p className="text-3xl font-bold text-gray-600 mt-4">
                    {ranking[1]?.points || 0} pts
                  </p>
                </div>
              </div>

              {/* 1st Place */}
              <div className="md:order-2 bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-lg shadow-xl p-8 border-t-4 border-yellow-400 transform md:scale-105">
                <div className="text-center">
                  <div className="text-6xl mb-2">🥇</div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {ranking[0]?.name || '-'}
                  </h3>
                  <p className="text-gray-600">{ranking[0]?.email || '-'}</p>
                  <p className="text-4xl font-bold text-yellow-600 mt-4">
                    {ranking[0]?.points || 0} pts
                  </p>
                </div>
              </div>

              {/* 3rd Place */}
              <div className="md:order-3 bg-white rounded-lg shadow-lg p-6 border-t-4 border-orange-400">
                <div className="text-center">
                  <div className="text-5xl mb-2">🥉</div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {ranking[2]?.name || '-'}
                  </h3>
                  <p className="text-gray-600">{ranking[2]?.email || '-'}</p>
                  <p className="text-3xl font-bold text-orange-600 mt-4">
                    {ranking[2]?.points || 0} pts
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Full Ranking Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              Todos os Participantes
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Posição
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Email
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                    Pontos
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ranking.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      Nenhum participante ainda
                    </td>
                  </tr>
                ) : (
                  ranking.map((user, index) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <span className="text-lg font-bold text-indigo-600">
                          #{user.rank}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{user.email}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-block bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full font-semibold">
                          {user.points} pts
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
