import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createPlanSchema, generatePlanText } from '@/lib/public-backend'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
// Limite total da funcao no Vercel (segundos). Precisa ser MAIOR que a soma
// dos timeouts internos da cascata (DeepSeek + Gemma + GLM = 70+70+90 = 230s)
// e MENOR que o teto do plano: Hobby = 60s, Pro = 300s.
// 300s cabe na cascata completa + buffer pra parsing e network.
export const maxDuration = 300

export async function POST(request: Request) {
  try {
    // Rota pública (sem login): limita por IP para conter abuso e custo de IA.
    const limit = rateLimit(`plan-public:${getClientIp(request)}`, 5, 60_000)
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Muitas gerações em pouco tempo. Aguarde um instante e tente novamente.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
      )
    }

    const body = await request.json()
    const values = createPlanSchema.parse(body)
    const content = await generatePlanText(values)

    return NextResponse.json({ data: { content } })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dados invalidos' }, { status: 400 })
    }

    console.error('Erro ao gerar plano:', error)
    const message = error instanceof Error ? error.message : 'Nao foi possivel gerar o plano'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
