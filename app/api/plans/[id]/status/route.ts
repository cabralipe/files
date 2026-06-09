import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { requireAuthenticatedUser } from '@/lib/supabase-server'
import { getUserRole, canApprovePeiAee, canConsentFamily, canGeneratePei } from '@/lib/pei'
import {
  transitionPlanStatus,
  type PlanTransition,
  type PlanAeeCollaboration,
  type PlanFamilyConsultation,
} from '@/lib/public-backend'

export const dynamic = 'force-dynamic'

const schema = z.object({
  action: z.enum(['submit_aee', 'approve_aee', 'reject_aee', 'family_consent']),
  note: z.string().trim().optional(),
  colaboracao_aee: z.record(z.unknown()).optional(),
  consulta_familia: z.record(z.unknown()).optional(),
})

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuthenticatedUser(request)
    const role = getUserRole(user)
    const body = schema.parse(await request.json())

    const allowed =
      (body.action === 'submit_aee' && canGeneratePei(role)) ||
      ((body.action === 'approve_aee' || body.action === 'reject_aee') && canApprovePeiAee(role)) ||
      (body.action === 'family_consent' && canConsentFamily(role))
    if (!allowed) {
      return NextResponse.json({ error: 'Acao nao permitida para o seu perfil' }, { status: 403 })
    }

    const actorName = String(user.user_metadata?.name || user.user_metadata?.full_name || '')
    const plan = await transitionPlanStatus(params.id, body.action as PlanTransition, {
      actorName,
      note: body.note,
      colaboracao_aee: body.colaboracao_aee as Partial<PlanAeeCollaboration> | undefined,
      consulta_familia: body.consulta_familia as Partial<PlanFamilyConsultation> | undefined,
    })
    if (!plan) {
      return NextResponse.json({ error: 'PEI nao encontrado' }, { status: 404 })
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
    if (error instanceof Error && error.message.startsWith('TRANSITION_')) {
      return NextResponse.json({ error: 'Transicao de status invalida para este PEI' }, { status: 409 })
    }
    console.error('[PATCH /api/plans/[id]/status]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar status do PEI' },
      { status: 500 },
    )
  }
}
