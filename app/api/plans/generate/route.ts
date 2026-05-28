import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createPlanSchema, generatePlanText } from '@/lib/public-backend'

export const dynamic = 'force-dynamic'
// Limite total da função no Vercel (segundos). Precisa ser MAIOR que a soma
// dos timeouts internos (primary + fallback) e MENOR que o teto do plano:
// Hobby = 60s, Pro = 300s. Mantemos 60s pra cobrir Hobby também.
export const maxDuration = 60

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
