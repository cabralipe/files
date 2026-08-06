import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { getUserSchools, requireUserContext } from '@/lib/supabase-server'
import { canApprovePeiAee, canConsentFamily, canGeneratePei } from '@/lib/pei'
import {
  transitionPlanStatus,
  type PlanTransition,
  type PlanAeeCollaboration,
  type PlanFamilyConsultation,
} from '@/lib/public-backend'

export const dynamic = 'force-dynamic'

const schema = z.object({
  action: z.enum(['submit_aee', 'submit_familia', 'approve_aee', 'reject_aee', 'family_consent']),
  note: z.string().trim().optional(),
  colaboracao_aee: z.record(z.unknown()).optional(),
  consulta_familia: z.record(z.unknown()).optional(),
})

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireUserContext(request)
    const role = ctx.role
    const body = schema.parse(await request.json())

    const allowed =
      (body.action === 'submit_aee' && canGeneratePei(role)) ||
      (body.action === 'submit_familia' && canApprovePeiAee(role)) ||
      ((body.action === 'approve_aee' || body.action === 'reject_aee') && canApprovePeiAee(role)) ||
      (body.action === 'family_consent' && canConsentFamily(role))
    if (!allowed) {
      return NextResponse.json({ error: 'Acao nao permitida para o seu perfil' }, { status: 403 })
    }

    const memberships = ['admin', 'municipality_admin', 'super_admin'].includes(role)
      ? []
      : await getUserSchools(ctx.userId, ctx.municipalityId)

    const plan = await transitionPlanStatus(params.id, body.action as PlanTransition, {
      actorName: ctx.fullName,
      note: body.note,
      colaboracao_aee: body.colaboracao_aee as Partial<PlanAeeCollaboration> | undefined,
      consulta_familia: body.consulta_familia as Partial<PlanFamilyConsultation> | undefined,
      actor: {
        role,
        userId: ctx.userId,
        school: ctx.school || '',
        schoolId: ctx.schoolId || undefined,
        schoolIds: memberships.map((s) => s.id),
        schoolNames: memberships.map((s) => s.name),
        municipalityId: ctx.municipalityId || undefined,
      },
    })
    if (!plan) {
      return NextResponse.json({ error: 'Documento nao encontrado' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: plan })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Login obrigatorio' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'BLOCKED') {
      return NextResponse.json({ error: 'Conta bloqueada' }, { status: 403 })
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dados invalidos' }, { status: 400 })
    }
    if (error instanceof Error && error.message === 'SCOPE_FORBIDDEN') {
      return NextResponse.json({ error: 'Este documento nao pertence a sua escola/turma' }, { status: 403 })
    }
    if (error instanceof Error && error.message.startsWith('TRANSITION_')) {
      return NextResponse.json({ error: 'Transicao de status invalida para este documento' }, { status: 409 })
    }
    console.error('[PATCH /api/plans/[id]/status]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar status do documento' },
      { status: 500 },
    )
  }
}
