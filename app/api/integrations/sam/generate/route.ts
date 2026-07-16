import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserContext } from '@/lib/supabase-server'
import { generatePlanFromPrompt } from '@/lib/public-backend'
import { rateLimitShared } from '@/lib/rate-limit'
import { parseAiJson, samDraftQuestionSchema, samGradeSchema, samSubjectSchema } from '@/lib/sam-integration'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const requestSchema = z.object({
  subject: samSubjectSchema,
  grade: samGradeSchema,
  content: z.string().trim().min(20).max(40_000),
  bnccCodes: z.array(z.string().trim().min(2).max(40)).min(1).max(20),
  count: z.coerce.number().int().min(1).max(20).default(10),
  sourceRef: z.string().trim().max(160).optional(),
})

export async function POST(request: Request) {
  try {
    const ctx = await requireUserContext(request)
    if (ctx.role === 'family') return NextResponse.json({ error: 'Perfil sem permissão para gerar questões no SAM' }, { status: 403 })
    const values = requestSchema.parse(await request.json())
    const limit = await rateLimitShared(`sam-questions:${ctx.userId}`, 5, 60_000)
    if (!limit.ok) return NextResponse.json({ error: 'Aguarde antes de gerar outro lote.' }, { status: 429 })

    const baseUrl = process.env.SAM_BASE_URL
    if (!baseUrl) return NextResponse.json({ error: 'Integração com o SAM ainda não configurada' }, { status: 503 })
    const descriptorUrl = new URL('/api/integrations/bncc/questions', baseUrl)
    descriptorUrl.searchParams.set('subject', values.subject)
    descriptorUrl.searchParams.set('grade', String(values.grade))
    const descriptorResponse = await fetch(descriptorUrl, { cache: 'no-store', signal: AbortSignal.timeout(15_000) })
    const descriptorPayload = await descriptorResponse.json()
    if (!descriptorResponse.ok) throw new Error(descriptorPayload.error || 'SAM indisponível para consultar descritores')
    const descriptors = z.array(z.object({ code: z.string(), label: z.string(), theme: z.string().nullable().optional() })).parse(descriptorPayload.data)
    if (!descriptors.length) return NextResponse.json({ error: 'O SAM não possui descritores para este componente/ano' }, { status: 409 })

    const prompt = `Você é elaborador de itens educacionais alinhados à BNCC e ao SAEB.
Transforme o documento fornecido em exatamente ${values.count} questões objetivas para o SAM.
Componente: ${values.subject === 'LP' ? 'Língua Portuguesa' : 'Matemática'}.
Ano: ${values.grade}º ano.
Códigos BNCC obrigatórios: ${values.bnccCodes.join(', ')}.

Descritores SAEB permitidos (use apenas um código desta lista por questão):
${descriptors.map((descriptor) => `${descriptor.code}: ${descriptor.label}${descriptor.theme ? ` — ${descriptor.theme}` : ''}`).join('\n')}

Regras:
- exatamente quatro alternativas diferentes e plausíveis;
- answer é o índice numérico da correta: 0=A, 1=B, 2=C, 3=D;
- não use alternativas como "todas as anteriores";
- produza explicação pedagógica objetiva;
- distribua dificuldade entre facil, medio e dificil;
- cada item deve medir o descritor declarado e permanecer adequado ao ${values.grade}º ano;
- responda SOMENTE com um array JSON válido, sem markdown.

Formato de cada objeto:
{"subject":"${values.subject}","grade":${values.grade},"descriptor":"D1","difficulty":"medio","statement":"...","options":["...","...","...","..."],"answer":0,"explanation":"...","teacherNote":"...","bnccCodes":${JSON.stringify(values.bnccCodes)},"sourceRef":${JSON.stringify(values.sourceRef || '')}}

Documento-base:
${values.content}`

    const aiText = await generatePlanFromPrompt(prompt)
    const parsed = z.array(samDraftQuestionSchema).min(1).max(20).parse(parseAiJson(aiText))
    if (parsed.length !== values.count) {
      return NextResponse.json({ error: `A IA retornou ${parsed.length} questão(ões), mas o lote exige ${values.count}. Gere novamente.` }, { status: 422 })
    }
    const allowedDescriptors = new Set(descriptors.map((descriptor) => descriptor.code))
    if (parsed.some((question) => question.subject !== values.subject || question.grade !== values.grade || !allowedDescriptors.has(question.descriptor))) {
      return NextResponse.json({ error: 'A IA retornou componente, ano ou descritor incompatível. Gere novamente.' }, { status: 422 })
    }
    return NextResponse.json({ success: true, data: parsed, descriptors })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message || 'Dados inválidos' }, { status: 400 })
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Faça login para integrar com o SAM' }, { status: 401 })
    if (error instanceof Error && error.message === 'BLOCKED') return NextResponse.json({ error: 'Conta bloqueada' }, { status: 403 })
    console.error('[BNCC SAM generate]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao estruturar questões para o SAM' }, { status: 500 })
  }
}
