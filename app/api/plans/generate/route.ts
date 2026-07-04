import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createPlanSchema, generatePlanWithSource } from '@/lib/public-backend'
import { getAuthenticatedUser } from '@/lib/supabase-server'
import { rateLimitShared, getClientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
// Limite total da funcao no Vercel (segundos). Precisa ser MAIOR que os
// timeouts internos e MENOR que o teto do plano (Hobby=60s, Pro=300s).
export const maxDuration = 300

// Geração pública é DESLIGADA por padrão (exige login) para conter custo de IA.
// Para reabrir ao público (com rate limit por IP), defina no ambiente:
//   ALLOW_PUBLIC_PLAN_GENERATION=true
const PUBLIC_ENABLED = process.env.ALLOW_PUBLIC_PLAN_GENERATION === 'true'

const FALLBACK_WARNING =
  'A IA não respondeu agora. Este plano foi gerado por um modelo local — revise com atenção antes de publicar.'

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request)

    if (!user && !PUBLIC_ENABLED) {
      return NextResponse.json(
        { error: 'Faça login para gerar planos com IA.' },
        { status: 401 },
      )
    }

    // Rate limit compartilhado (Supabase): por usuário quando logado, por IP no público.
    const limit = user
      ? await rateLimitShared(`plan-ai:${user.id}`, 10, 60_000)
      : await rateLimitShared(`plan-public:${getClientIp(request)}`, 5, 60_000)
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Muitas gerações em pouco tempo. Aguarde um instante e tente novamente.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
      )
    }

    const body = await request.json()
    const values = createPlanSchema.parse(body)
    const { content, source } = await generatePlanWithSource(values)

    return NextResponse.json({
      data: {
        content,
        source,
        ...(source === 'fallback' ? { warning: FALLBACK_WARNING } : {}),
      },
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dados invalidos' }, { status: 400 })
    }

    console.error('[POST /api/plans/generate]', error instanceof Error ? error.message : 'erro')
    const message = error instanceof Error ? error.message : 'Nao foi possivel gerar o plano'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
