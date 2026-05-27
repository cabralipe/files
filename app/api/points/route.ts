import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { addPoints, getTotalPoints } from '@/lib/points-server'
import { getSupabaseAdmin, requireAuthenticatedUser } from '@/lib/supabase-server'

const addPointsSchema = z.object({
  points_amount: z.number().int().min(-100).max(100),
  reason: z.string().trim().min(3),
  related_item_id: z.string().uuid().nullable().optional(),
})

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request)
    const values = addPointsSchema.parse(await request.json())
    await addPoints(user.id, values.points_amount, values.reason, values.related_item_id)
    const totalPoints = await getTotalPoints(user.id)

    return NextResponse.json({ success: true, total_points: totalPoints })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dados invalidos' }, { status: 400 })
    }

    const status = error instanceof Error && error.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json({ error: status === 401 ? 'Login obrigatorio' : 'Erro ao registrar pontos' }, { status })
  }
}

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
