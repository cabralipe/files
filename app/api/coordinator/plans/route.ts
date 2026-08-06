import { NextResponse } from 'next/server'
import { listPlansBySchool } from '@/lib/public-backend'
import { getUserSchools, requireUserContext } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const ctx = await requireUserContext(request)

    if (ctx.role !== 'coordinator') {
      return NextResponse.json({ error: 'Acesso restrito a coordenadores' }, { status: 403 })
    }

    // Coordenador pode estar vinculado a mais de uma escola (user_schools).
    const memberships = await getUserSchools(ctx.userId, ctx.municipalityId)
    const schoolIds = Array.from(new Set([...memberships.map((s) => s.id), ...(ctx.schoolId ? [ctx.schoolId] : [])]))
    const schoolNames = Array.from(new Set([...memberships.map((s) => s.name), ...(ctx.school ? [ctx.school] : [])]))
    if (!schoolIds.length && !schoolNames.length) {
      return NextResponse.json({ error: 'Coordenador sem escola vinculada' }, { status: 400 })
    }

    // Escopo por município + escola(s) (do contexto, não do cliente).
    const plans = await listPlansBySchool(schoolIds, ctx.municipalityId || undefined, schoolNames)

    return NextResponse.json({
      success: true,
      data: plans,
      plans,
      total: plans.length,
      schools: schoolNames,
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
