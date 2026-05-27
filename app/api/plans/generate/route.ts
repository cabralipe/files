import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createPlanSchema, generatePlanText } from '@/lib/public-backend'

export const dynamic = 'force-dynamic'

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

    return NextResponse.json({ error: 'N?o foi possivel gerar o plano' }, { status: 500 })
  }
}
