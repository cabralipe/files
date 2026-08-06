import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { getFamilyLinkByToken } from '@/lib/family-access'
import { getClientIp, rateLimitShared } from '@/lib/rate-limit'
import { transitionPlanStatus } from '@/lib/public-backend'

export const dynamic = 'force-dynamic'

const schema = z.object({
  plan_id: z.string().uuid(),
  responsavel_nome: z.string().trim().min(2, 'Informe o nome do responsável'),
  parentesco: z.string().trim().optional().default(''),
  concordancia: z.enum(['aprovado', 'ciencia_sem_aprovacao']),
  observacoes: z.string().trim().optional().default(''),
})

// Registra a ciência/aprovação da família em um PEI ou PAEE, autenticado
// apenas pelo token do link (sem login) — mesma ação de /api/plans/[id]/status
// com action=family_consent, mas verificando o vínculo via link aprovado.
export async function PATCH(request: Request, { params }: { params: { token: string } }) {
  try {
    const ip = getClientIp(request)
    const limit = await rateLimitShared(`family-portal-consent:${ip}`, 20, 60_000)
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Aguarde um instante e tente novamente.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
      )
    }

    const link = await getFamilyLinkByToken(params.token)
    if (!link || link.status !== 'approved') {
      return NextResponse.json({ error: 'Link inválido ou não aprovado.' }, { status: 403 })
    }

    const body = schema.parse(await request.json())

    const plan = await transitionPlanStatus(body.plan_id, 'family_consent', {
      actorName: body.responsavel_nome,
      consulta_familia: {
        responsavel_nome: body.responsavel_nome,
        parentesco: body.parentesco,
        concordancia: body.concordancia,
        observacoes: body.observacoes,
        formato: 'portal',
      },
      actor: {
        role: 'family',
        verifiedStudentId: link.student_id,
      },
    })
    if (!plan) {
      return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: plan })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dados inválidos' }, { status: 400 })
    }
    if (error instanceof Error && error.message === 'SCOPE_FORBIDDEN') {
      return NextResponse.json({ error: 'Este documento não pertence ao aluno vinculado a este link.' }, { status: 403 })
    }
    if (error instanceof Error && error.message.startsWith('TRANSITION_')) {
      return NextResponse.json({ error: 'Transição de status inválida para este documento' }, { status: 409 })
    }
    console.error('[PATCH /api/family/portal/[token]/consent]', error)
    return NextResponse.json({ error: 'Não foi possível registrar a ciência.' }, { status: 500 })
  }
}
