import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createPlanSchema, buildPlanPrompt, generatePlanText } from '@/lib/public-backend'

export const dynamic = 'force-dynamic'

const NVIDIA_KEY = process.env.NVIDIA_API_KEY || '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'
const NVIDIA_MODEL = 'deepseek-ai/deepseek-v4-flash'

export async function POST(request: Request) {
  let values: ReturnType<typeof createPlanSchema.parse>

  try {
    const body = await request.json()
    values = createPlanSchema.parse(body)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dados invalidos' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Requisição inválida' }, { status: 400 })
  }

  try {
    const prompt = await buildPlanPrompt(values)

    const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${NVIDIA_KEY}`,
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2500,
      }),
    })

    if (!res.ok) throw new Error(`NVIDIA API retornou status ${res.status}`)

    const payload = await res.json()
    const content: string | undefined = payload.choices?.[0]?.message?.content
    if (!content?.trim()) throw new Error('Resposta vazia da IA')

    return NextResponse.json({ data: { content } })
  } catch (err) {
    console.warn('[generate] IA principal falhou, usando fallback:', err)
    try {
      const content = await generatePlanText(values)
      return NextResponse.json({ data: { content } })
    } catch {
      return NextResponse.json({ error: 'Não foi possível gerar o plano' }, { status: 500 })
    }
  }
}
