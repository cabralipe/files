import { NextResponse } from 'next/server'
import { getUserSchools, requireUserContext } from '@/lib/supabase-server'
import { resolveMunicipality } from '@/lib/municipality'
import { canViewPeiPipeline } from '@/lib/pei'
import { listPeisForReview, type PublicPlan } from '@/lib/public-backend'

export const dynamic = 'force-dynamic'

// Fila de PEIs para os fluxos de validacao (AEE) e acompanhamento (coordenacao).
export async function GET(request: Request) {
  try {
    const ctx = await requireUserContext(request)
    if (!canViewPeiPipeline(ctx.role)) {
      return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })
    }

    const url = new URL(request.url)
    const status = url.searchParams.get('status') || undefined

    // Município do contexto (banco). super_admin pode escolher via header.
    const isManager = ['admin', 'municipality_admin', 'super_admin'].includes(ctx.role)
    const municipalityId =
      ctx.role === 'super_admin' ? (await resolveMunicipality(request))?.id : ctx.municipalityId || undefined

    // AEE/coordenacao podem estar vinculados a mais de uma escola (user_schools);
    // usa TODAS elas (id + nome, com o school_id/school_name legado como reforço)
    // em vez de um unico campo, senao um vinculo so por user_schools (ou um plano
    // sem school_id ainda) some da fila mesmo pertencendo a escola certa.
    const memberships = isManager ? [] : await getUserSchools(ctx.userId, ctx.municipalityId)
    const schoolIds = Array.from(new Set([...memberships.map((s) => s.id), ...(ctx.schoolId ? [ctx.schoolId] : [])]))
    const schoolNames = Array.from(new Set([...memberships.map((s) => s.name), ...(ctx.school ? [ctx.school] : [])]))

    if (!isManager && !schoolIds.length && !schoolNames.length) {
      return NextResponse.json({ success: true, data: [], total: 0 })
    }

    const plans = await listPeisForReview({
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
    console.error('[GET /api/peis/review-queue]', error)
    return NextResponse.json({ error: 'Nao foi possivel carregar os PEIs' }, { status: 500 })
  }
}
