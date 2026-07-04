import { NextResponse } from 'next/server'
import { getTotalPoints } from '@/lib/points-server'
import { getSupabaseAdmin, requireAuthenticatedUser } from '@/lib/supabase-server'

// NOTA: o antigo POST /api/points foi REMOVIDO. Ele permitia que qualquer
// usuário autenticado creditasse pontos arbitrários a si mesmo (cheat/farming).
// Pontos passam a ser concedidos APENAS pelo servidor, em ações reais
// (like/comentário/experiência/plano) via awardPointsOnce (idempotente).

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request)
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit') || 50), 100)
    const { data, error } = await getSupabaseAdmin()
      .from('points_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      total_points: await getTotalPoints(user.id),
      transactions: data || [],
    })
  } catch (error) {
    const status = error instanceof Error && error.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json({ error: status === 401 ? 'Login obrigatorio' : 'Erro ao obter pontos' }, { status })
  }
}
