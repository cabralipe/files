import { NextResponse } from 'next/server'
import { getUserSchools, requireUserContext } from '@/lib/supabase-server'
import { resolveMunicipality } from '@/lib/municipality'
import { canViewPeiPipeline } from '@/lib/pei'
import { listPaeesForReview, type PublicPlan } from '@/lib/public-backend'

export const dynamic = 'force-dynamic'

// Fila de PAEEs para acompanhamento do AEE e da coordenacao.
export async function GET(request: Request) {
  try {
    const ctx = await requireUserContext(request)
    if (!canViewPeiPipeline(ctx.role)) {
      return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })
    }

    const url = new URL(request.url)
    const status = url.searchParams.get('status') || undefined

    const isManager = ['admin', 'municipality_admin', 'super_admin'].includes(ctx.role)
    const municipalityId =
      ctx.role === 'super_admin' ? (await resolveMunicipality(request))?.id : ctx.municipalityId || undefined

    // Ver comentário equivalente em /api/peis/review-queue.
    const memberships = isManager ? [] : await getUserSchools(ctx.userId, ctx.municipalityId)
    const schoolIds = Array.from(new Set([...memberships.map((s) => s.id), ...(ctx.schoolId ? [ctx.schoolId] : [])]))
    const schoolNames = Array.from(new Set([...memberships.map((s) => s.name), ...(ctx.school ? [ctx.school] : [])]))

    if (!isManager && !schoolIds.length && !schoolNames.length) {
      return NextResponse.json({ success: true, data: [], total: 0 })
    }

    const plans = await listPaeesForReview({
      municipalityId: municipalityId ?? undefined,
      schoolIds: isManager ? undefined : schoolIds,
      schoolNames: isManager ? undefined : schoolNames,
      status: status as PublicPlan['plan_status'] | undefined,
    })

    return NextResponse.json({ success: true, data: plans, total: plans.length })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Login obrigatorio' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'BLOCKED') {
      return NextResponse.json({ error: 'Conta bloqueada' }, { status: 403 })
    }
    console.error('[GET /api/paees/review-queue]', error)
    return NextResponse.json({ error: 'Nao foi possivel carregar os PAEEs' }, { status: 500 })
  }
}
