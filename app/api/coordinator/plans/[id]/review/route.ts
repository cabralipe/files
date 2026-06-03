import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { listPlansBySchool, reviewPlan } from '@/lib/public-backend'
import { requireAuthenticatedUser } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const reviewSchema = z.object({
  note: z.string().trim().max(2000, 'A ressalva deve ter no maximo 2000 caracteres').optional().default(''),
})

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuthenticatedUser(request)
    const role = user.user_metadata?.role
    const school = String(user.user_metadata?.school || '')

    if (role !== 'coordinator') {
      return NextResponse.json({ error: 'Acesso restrito a coordenadores' }, { status: 403 })
    }

    const plans = await listPlansBySchool(school)
    const canReview = plans.some((plan) => plan.id === params.id)

    if (!canReview) {
      return NextResponse.json({ error: 'Plano nao encontrado para esta escola' }, { status: 404 })
    }

    const values = reviewSchema.parse(await request.json())
    const reviewerName =
      String(user.user_metadata?.name || user.user_metadata?.full_name || user.email || 'Coordenador(a)')
    const plan = await reviewPlan(params.id, reviewerName, values.note)

    return NextResponse.json({ success: true, data: plan, plan })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dados invalidos' }, { status: 400 })
    }

    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'BLOCKED') {
      return NextResponse.json({ error: 'Conta bloqueada' }, { status: 403 })
    }
    console.error('[PUT /api/coordinator/plans/[id]/review]', error)
    return NextResponse.json({ error: 'Nao foi possivel revisar o plano' }, { status: 500 })
  }
}
