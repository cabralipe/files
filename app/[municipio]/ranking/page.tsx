'use client'

import { useEffect, useState } from 'react'
import { useRouter } from '@/lib/m-link'
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
  const { isAuthenticated, loading: authLoading } = useAuth()
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
    <div>

      {/* Main Content */}
      <main className="pg">
        {error && (
          <div className="al-error" style={{ marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {/* Top 3 Podium */}
        {ranking.length >= 3 && (
          <div style={{ marginBottom: '32px' }}>
            <h2 className="pct" style={{ fontSize: '24px', textAlign: 'center', marginBottom: '24px' }}>
              🏆 Pódio - Professores Destaques
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '18px', alignItems: 'end' }}>
              {/* 2nd Place */}
              <div className="pc" style={{ textAlign: 'center', transform: 'rotate(-1deg)', borderTop: '6px solid var(--ink-muted)' }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>🥈</div>
                <h3 className="pi-title" style={{ fontSize: '18px' }}>
                  {ranking[1]?.name || '-'}
                </h3>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--ink-muted)' }}>{ranking[1]?.email || '-'}</p>
                <p className="sc-n" style={{ fontSize: '32px', color: 'var(--ink-soft)', marginTop: '12px' }}>
                  {ranking[1]?.points || 0} pts
                </p>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>2º Lugar</span>
              </div>

              {/* 1st Place */}
              <div className="pc" style={{ textAlign: 'center', backgroundColor: 'var(--mustard-wash)', transform: 'scale(1.05) rotate(1deg)', boxShadow: 'var(--stamp-lg)', borderTop: '6px solid var(--mustard)' }}>
                <div style={{ fontSize: '56px', marginBottom: '10px' }}>👑</div>
                <h3 className="pi-title" style={{ fontSize: '20px', fontWeight: 900 }}>
                  {ranking[0]?.name || '-'}
                </h3>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--ink-muted)' }}>{ranking[0]?.email || '-'}</p>
                <p className="sc-n" style={{ fontSize: '38px', color: 'var(--red-deep)', marginTop: '12px' }}>
                  {ranking[0]?.points || 0} pts
                </p>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>1º Lugar - Campeão</span>
              </div>

              {/* 3rd Place */}
              <div className="pc" style={{ textAlign: 'center', transform: 'rotate(-0.5deg)', borderTop: '6px solid var(--mustard-deep)' }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>🥉</div>
                <h3 className="pi-title" style={{ fontSize: '18px' }}>
                  {ranking[2]?.name || '-'}
                </h3>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--ink-muted)' }}>{ranking[2]?.email || '-'}</p>
                <p className="sc-n" style={{ fontSize: '32px', color: 'var(--ink-soft)', marginTop: '12px' }}>
                  {ranking[2]?.points || 0} pts
                </p>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>3º Lugar</span>
              </div>
            </div>
          </div>
        )}

        {/* Full Ranking Table */}
        <div className="pc" style={{ padding: '0px', overflow: 'hidden' }}>
          <div style={{ padding: '16px', borderBottom: '2.5px solid var(--ink)', backgroundColor: 'var(--paper-deep)' }}>
            <h2 className="pct" style={{ marginBottom: '0px' }}>
              📊 Quadro Geral de Professores
            </h2>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr className="coord-head">
                  <th style={{ padding: '12px 16px' }}>Posição</th>
                  <th style={{ padding: '12px 16px' }}>Nome</th>
                  <th style={{ padding: '12px 16px' }}>Email</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Pontos</th>
                </tr>
              </thead>
              <tbody style={{ color: 'var(--ink)' }}>
                {ranking.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--ink-muted)' }}>
                      Nenhum participante pontuou ainda.
                    </td>
                  </tr>
                ) : (
                  ranking.map((user) => (
                    <tr key={user.id} className="coord-row" style={{ display: 'table-row' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                        #{user.rank}º
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                        {user.name}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {user.email}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <span className="tag tcd" style={{ fontSize: '12px', padding: '4px 10px', fontWeight: 'bold' }}>
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
