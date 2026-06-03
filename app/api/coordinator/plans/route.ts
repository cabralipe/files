import { NextResponse } from 'next/server'
import { listPlansBySchool } from '@/lib/public-backend'
import { requireAuthenticatedUser } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request)
    const role = user.user_metadata?.role
    const school = String(user.user_metadata?.school || '')

    if (role !== 'coordinator') {
      return NextResponse.json({ error: 'Acesso restrito a coordenadores' }, { status: 403 })
    }

    if (!school) {
      return NextResponse.json({ error: 'Coordenador sem escola vinculada' }, { status: 400 })
    }

    const plans = await listPlansBySchool(school)

    return NextResponse.json({
      success: true,
      data: plans,
      plans,
      total: plans.length,
      school,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'BLOCKED') {
      return NextResponse.json({ error: 'Conta bloqueada' }, { status: 403 })
    }
    console.error('[GET /api/coordinator/plans]', error)
    return NextResponse.json({ error: 'Nao foi possivel carregar os planos' }, { status: 500 })
  }
}
