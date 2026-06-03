import { supabase } from '@/lib/supabase-client'

export interface PointTransaction {
  id: string
  user_id: string
  points_amount: number
  reason: string
  created_at: string
}

export interface UserRanking {
  id: string
  name: string
  points: number
  rank: number
  email: string
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token
}

export function usePoints() {
  const addPoints = async (_userId: string, points: number, reason: string) => {
    const token = await getAccessToken()
    const response = await fetch('/api/points', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        points_amount: points,
        reason,
      }),
    })
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao adicionar pontos')
    }

    return data
  }

  const getRanking = async (limit: number = 100) => {
    const token = await getAccessToken()
    const response = await fetch(`/api/ranking?limit=${limit}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao obter ranking')
    }

    return (data.ranking || []).map((entry: any) => ({
      id: entry.id,
      name: entry.full_name || entry.name || 'Professor(a)',
      email: entry.email || '',
      points: Number(entry.total_points || entry.points || 0),
      rank: Number(entry.rank || entry.ranking_position || 0),
    })) as UserRanking[]
  }

  const getPointsHistory = async (_userId: string, limit: number = 50) => {
    const token = await getAccessToken()
    const response = await fetch(`/api/points?limit=${limit}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao obter historico')
    }

    return data.transactions || []
  }

  const getUserBadges = async (_userId: string) => []

  const checkAndAwardBadges = async (_userId: string, points: number) => {
    const badges = [
      { name: 'Iniciante', requirement: 10 },
      { name: 'Aprendiz', requirement: 50 },
      { name: 'Competente', requirement: 100 },
      { name: 'Especialista', requirement: 500 },
      { name: 'Mestre', requirement: 1000 },
    ]

    return badges.filter((badge) => points >= badge.requirement)
  }

  return {
    addPoints,
    getRanking,
    getPointsHistory,
    getUserBadges,
    checkAndAwardBadges,
  }
}
