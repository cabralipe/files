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
        stream: true,
      }),
    })

    if (!res.ok || !res.body) {
      throw new Error(`NVIDIA API status ${res.status}`)
    }

    const decoder = new TextDecoder()
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const reader = res.body!.getReader()
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const lines = decoder.decode(value, { stream: true }).split('\n')
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const data = line.slice(6).trim()
              if (data === '[DONE]') {
                controller.close()
                return
              }
              try {
                const delta = JSON.parse(data).choices?.[0]?.delta?.content
                if (delta) controller.enqueue(encoder.encode(delta))
              } catch {
                // ignore partial SSE parse errors
              }
            }
          }
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch {
    // Fallback: non-streaming call
    try {
      const content = await generatePlanText(values)
      return NextResponse.json({ data: { content } })
    } catch {
      return NextResponse.json({ error: 'Não foi possível gerar o plano' }, { status: 500 })
    }
  }
}
