import { createHmac } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserContext } from '@/lib/supabase-server'
import { resolveMunicipality } from '@/lib/municipality'
import { rateLimitShared } from '@/lib/rate-limit'
import { samDraftQuestionSchema } from '@/lib/sam-integration'

export const dynamic = 'force-dynamic'

const schema = z.object({
  requestId: z.string().uuid(),
  questions: z.array(samDraftQuestionSchema).min(1).max(20),
})

export async function POST(request: Request) {
  try {
    const ctx = await requireUserContext(request)
    if (ctx.role === 'family') return NextResponse.json({ error: 'Perfil sem permissão para enviar questões' }, { status: 403 })
    const values = schema.parse(await request.json())
    const limit = await rateLimitShared(`sam-send:${ctx.userId}`, 10, 60_000)
    if (!limit.ok) return NextResponse.json({ error: 'Aguarde antes de enviar outro lote.' }, { status: 429 })
    const baseUrl = process.env.SAM_BASE_URL
    const secret = process.env.SAM_INTEGRATION_SECRET
    if (!baseUrl || !secret || secret.length < 32) return NextResponse.json({ error: 'Integração com o SAM ainda não configurada' }, { status: 503 })
    const municipality = await resolveMunicipality(request)
    const body = JSON.stringify({
      requestId: values.requestId,
      authorEmail: ctx.email,
      sourceMunicipalitySlug: municipality?.slug || null,
      questions: values.questions,
    })
    const timestamp = String(Date.now())
    const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
    const response = await fetch(new URL('/api/integrations/bncc/questions', baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bncc-timestamp': timestamp,
        'x-bncc-signature': signature,
      },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    })
    const payload = await response.json()
    if (!response.ok) return NextResponse.json({ error: payload.error || 'O SAM recusou o lote' }, { status: response.status })
    return NextResponse.json(payload, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message || 'Questões inválidas' }, { status: 400 })
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Faça login para integrar com o SAM' }, { status: 401 })
    if (error instanceof Error && error.message === 'BLOCKED') return NextResponse.json({ error: 'Conta bloqueada' }, { status: 403 })
    console.error('[BNCC SAM send]', error)
    return NextResponse.json({ error: 'Não foi possível enviar as questões ao SAM' }, { status: 500 })
  }
}
