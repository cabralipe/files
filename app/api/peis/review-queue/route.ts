import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/supabase-server'
import { resolveMunicipality } from '@/lib/municipality'
import { getUserRole, canViewPeiPipeline } from '@/lib/pei'
import { listPeisForReview, type PublicPlan } from '@/lib/public-backend'

export const dynamic = 'force-dynamic'

// Fila de PEIs para os fluxos de validacao (AEE) e acompanhamento (coordenacao).
export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request)
    const role = getUserRole(user)
    if (!canViewPeiPipeline(role)) {
      return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })
    }

    const municipality = await resolveMunicipality(request)
    const url = new URL(request.url)
    const status = url.searchParams.get('status') || undefined

    // Gestao ve todas as escolas do municipio; AEE/coordenacao ficam na sua escola.
    const isManager = ['admin', 'municipality_admin', 'super_admin'].includes(role)
    const school = isManager
      ? url.searchParams.get('school') || undefined
      : String(user.user_metadata?.school || '') || undefined

    const plans = await listPeisForReview({
      municipalityId: municipality?.id,
      school,
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
