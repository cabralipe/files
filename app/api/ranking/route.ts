import { NextResponse } from 'next/server'
import { getAuthenticatedUser, getSupabaseAdmin } from '@/lib/supabase-server'
import { resolveMunicipality } from '@/lib/municipality'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit') || 100), 100)
    const currentUser = await getAuthenticatedUser(request)
    const municipality = await resolveMunicipality(request)
    const supabase = getSupabaseAdmin()
    let viewQuery = supabase
      .from('ranking_view')
      .select('*')
      .limit(limit)
    if (municipality) viewQuery = viewQuery.eq('municipality_id', municipality.id)
    const { data, error } = await viewQuery

    if (!error) {
      const ranking = (data || []).map((entry) => ({
        ...entry,
        full_name: entry.full_name || entry.name,
        total_points: Number(entry.total_points || entry.points || 0),
        rank: entry.ranking_position,
      }))
      const userPosition = currentUser
        ? ranking.find((entry) => entry.id === currentUser.id) || null
        : null

      return NextResponse.json({
        success: true,
        ranking,
        userPosition,
        total: ranking.length,
      })
    }

    if (error.code !== '42P01' && error.code !== '42703' && error.code !== 'PGRST204' && error.code !== 'PGRST205') {
      throw error
    }

    let usersQuery = supabase
      .from('users')
      .select('id, name, email, avatar_url, points, municipality_id')
      .order('points', { ascending: false })
      .limit(limit)
    if (municipality) usersQuery = usersQuery.eq('municipality_id', municipality.id)
    const { data: users, error: usersError } = await usersQuery

    if (usersError) {
      throw usersError
    }

    const ranking = (users || []).map((entry, index) => ({
      ...entry,
      full_name: entry.name,
      total_points: Number(entry.points || 0),
      rank: index + 1,
    }))
    const userPosition = currentUser
      ? ranking.find((entry) => entry.id === currentUser.id) || null
      : null

    return NextResponse.json({
      success: true,
      ranking,
      userPosition,
      total: ranking.length,
    })
  } catch {
    return NextResponse.json({ error: 'Erro ao obter ranking' }, { status: 500 })
  }
}
