import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { addPoints } from '@/lib/points-server'
import { getAuthenticatedUser, getSupabaseAdmin } from '@/lib/supabase-server'

const enrollSchema = z.object({
  userId: z.string().uuid().optional(),
  planId: z.string().uuid(),
})

async function getUserId(request: Request, bodyUserId?: string) {
  const user = await getAuthenticatedUser(request)
  return user?.id || bodyUserId || null
}

async function planExists(planId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from('plans')
    .select('id')
    .eq('id', planId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return Boolean(data)
}

export async function POST(request: Request) {
  try {
    const values = enrollSchema.parse(await request.json())
    const userId = await getUserId(request, values.userId)

    if (!userId) {
      return NextResponse.json({ error: 'Login obrigatorio' }, { status: 401 })
    }

    if (!(await planExists(values.planId))) {
      return NextResponse.json({ error: 'Plano n?o encontrado' }, { status: 404 })
    }

    await addPoints(userId, 10, 'plano_acessado', values.planId)

    return NextResponse.json({
      success: true,
      message: 'Plano registrado com sucesso',
      pointsEarned: 10,
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dados invalidos' }, { status: 400 })
    }

    console.error('[POST /api/plans/enroll]', error)
    return NextResponse.json({ error: 'Erro ao registrar plano' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const values = enrollSchema.parse(await request.json())
    const userId = await getUserId(request, values.userId)

    if (!userId) {
      return NextResponse.json({ error: 'Login obrigatorio' }, { status: 401 })
    }

    await addPoints(userId, -10, 'plano_removido', values.planId)

    return NextResponse.json({
      success: true,
      message: 'Registro do plano removido',
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dados invalidos' }, { status: 400 })
    }

    console.error('[DELETE /api/plans/enroll]', error)
    return NextResponse.json({ error: 'Erro ao remover registro do plano' }, { status: 500 })
  }
}
