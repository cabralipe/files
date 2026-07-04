import { NextResponse } from 'next/server'
import { getAuthenticatedUser, getSupabaseAdmin } from '@/lib/supabase-server'
import { generatePlanFromPrompt } from '@/lib/public-backend'
import { rateLimitShared, getClientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Geração pública desligada por padrão (exige login). Reabra com:
//   ALLOW_PUBLIC_PLAN_GENERATION=true
const PUBLIC_ENABLED = process.env.ALLOW_PUBLIC_PLAN_GENERATION === 'true'

type NacionalSkill = {
  code: string
  disciplina: string
  unidade_tematica: string
  objeto_conhecimento: string
  habilidade: string
}

type RequestBody = {
  title: string
  teacher?: string
  school?: string
  grade_level?: string
  subject?: string
  date?: string
  duration?: string
  methodology?: string
  objectives?: string
  materials?: string
  notes?: string
  reference_type?: 'bncc' | 'saeb'
  skills: NacionalSkill[]
}

function buildPrompt(body: RequestBody): string {
  const skillBlock = body.skills
    .map((s) => `[${s.code}] ${s.disciplina} — ${s.unidade_tematica}\n${s.habilidade}`)
    .join('\n\n')

  const date = body.date || new Date().toLocaleDateString('pt-BR')
  const objectives = body.objectives?.trim() || '[Inferir objetivos a partir do tema e das habilidades selecionadas]'
  const methodology = body.methodology?.trim() || '[Propor metodologia ativa simples e viável para a turma]'
  const isSaeb = body.reference_type === 'saeb'
  const referenceHeading = isSaeb
    ? 'DESCRITORES DA MATRIZ DE REFERÊNCIA DO SAEB SELECIONADOS'
    : 'HABILIDADES DA BNCC SELECIONADAS'

  return `Você é especialista em educação básica, BNCC e avaliações do SAEB. Gere um plano de aula completo e pronto para uso.

DADOS DO PLANO:
- Professor(a): ${body.teacher || 'Não informado'}
- Escola: ${body.school || 'Não informada'}
- Ano/Turma: ${body.grade_level || 'Não informado'}
- Componente Curricular: ${body.subject || 'Não informado'}
- Data: ${date}
- Duração: ${body.duration || '50 minutos'}
- Tema: ${body.title}
- Recursos disponíveis: ${body.materials || 'recursos básicos da escola'}
- Observações: ${body.notes?.trim() || 'nenhuma'}

OBJETIVOS DO PROFESSOR:
${objectives}

METODOLOGIA INFORMADA:
${methodology}

${referenceHeading} (${body.skills.length}):
${skillBlock || 'Nenhuma referência selecionada — inferir a partir do tema.'}

Escreva em português do Brasil, linguagem clara, direta e prática. O plano deve conter: identificação, objetivos, metodologia/desenvolvimento (com momentos da aula), avaliação e referências. Entre 750 e 1100 palavras. Sem introduções longas ou decoração visual.`
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user && !PUBLIC_ENABLED) {
      return NextResponse.json({ error: 'Faça login para gerar planos com IA.' }, { status: 401 })
    }

    // Rate limit compartilhado (Supabase): por usuário quando logado, por IP no público.
    const limit = user
      ? await rateLimitShared(`bncc-nacional:${user.id}`, 10, 60_000)
      : await rateLimitShared(`bncc-nacional-public:${getClientIp(request)}`, 5, 60_000)
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Muitas gerações em pouco tempo. Aguarde um instante e tente novamente.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
      )
    }

    const body: RequestBody = await request.json()

    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Informe o tema do plano.' }, { status: 400 })
    }
    if (!body.skills?.length) {
      return NextResponse.json({ error: 'Selecione ao menos uma habilidade ou descritor.' }, { status: 400 })
    }

    const prompt = buildPrompt(body)
    const content = await generatePlanFromPrompt(prompt)

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Plano gerado vazio. Tente novamente.' }, { status: 500 })
    }

    // Fire-and-forget analytics event (service role bypasses RLS)
    try {
      const supabase = getSupabaseAdmin()
      void supabase.from('analytics_events').insert({
        event_type: 'bncc_plan_gen',
        school: body.school?.trim() || null,
      })
    } catch {}

    return NextResponse.json({ data: { content } })
  } catch (error) {
    console.error('Erro ao gerar plano BNCC Nacional:', error)
    const message = error instanceof Error ? error.message : 'Não foi possível gerar o plano'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
