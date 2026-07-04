import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { deletePlan, getPlanOwnership, updatePlan } from '@/lib/public-backend'
import { requireUserContext } from '@/lib/supabase-server'
import { canDeletePlan, canEditPlan, type PlanInfo } from '@/lib/authz-rules'

export const dynamic = 'force-dynamic'

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireUserContext(request)
    const info = await getPlanOwnership(params.id)
    if (!info) {
      return NextResponse.json({ error: 'Plano nao encontrado' }, { status: 404 })
    }

    const planInfo: PlanInfo = { userId: info.userId, municipalityId: info.municipalityId, school: info.school, isPei: info.isPei, isPaee: info.isPaee }
    if (!canEditPlan(ctx, planInfo)) {
      return NextResponse.json({ error: 'Sem permissao para editar este plano' }, { status: 403 })
    }

    const body = await request.json()
    const plan = await updatePlan(params.id, body)

    if (!plan) {
      return NextResponse.json({ error: 'Plano nao encontrado' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: plan, plan })
  } catch (error) {
    return handlePlanError(error, 'Nao foi possivel atualizar o plano')
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireUserContext(request)
    const info = await getPlanOwnership(params.id)
    if (!info) {
      return NextResponse.json({ error: 'Plano nao encontrado' }, { status: 404 })
    }

    const planInfo: PlanInfo = { userId: info.userId, municipalityId: info.municipalityId, school: info.school, isPei: info.isPei, isPaee: info.isPaee }
    if (!canDeletePlan(ctx, planInfo)) {
      const msg = info.isPei || info.isPaee ? 'Sem permissao para excluir este documento' : 'Sem permissao para excluir este plano'
      return NextResponse.json({ error: msg }, { status: 403 })
    }

    const deleted = await deletePlan(params.id)
    if (!deleted) {
      return NextResponse.json({ error: 'Plano nao encontrado' }, { status: 404 })
    }
    return NextResponse.json({ success: true, ok: true })
  } catch (error) {
    return handlePlanError(error, 'Nao foi possivel excluir o plano')
  }
}

function handlePlanError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message === 'UNAUTHORIZED') {
    return NextResponse.json({ error: 'Login obrigatorio' }, { status: 401 })
  }
  if (error instanceof Error && error.message === 'BLOCKED') {
    return NextResponse.json({ error: 'Conta bloqueada' }, { status: 403 })
  }
  if (error instanceof Error && error.message === 'SCOPE_FORBIDDEN') {
    return NextResponse.json({ error: 'Este plano nao pertence ao seu municipio' }, { status: 403 })
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: error.issues[0]?.message || 'Dados invalidos' }, { status: 400 })
  }
  if (error instanceof Error && error.message.startsWith('PUBLICATION_BLOCKED:')) {
    return NextResponse.json(
      { error: `Publicacao bloqueada. Pendencias: ${error.message.replace('PUBLICATION_BLOCKED:', '')}` },
      { status: 422 },
    )
  }
  console.error('[api/plans/[id]]', error)
  return NextResponse.json({ error: fallback }, { status: 500 })
}
