import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createPlanSchema, generatePlanText } from '@/lib/public-backend'

export const dynamic = 'force-dynamic'
// Limite total da funcao no Vercel (segundos). Precisa ser MAIOR que a soma
// dos timeouts internos da cascata (DeepSeek + Gemma + GLM = 70+70+90 = 230s)
// e MENOR que o teto do plano: Hobby = 60s, Pro = 300s.
// 240s cabe na cascata completa + buffer pra parsing e network.
export const maxDuration = 240

export async function POST(request: Request) {
  try {
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
