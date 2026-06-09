import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthenticatedUser } from '@/lib/supabase-server'
import { resolveMunicipality } from '@/lib/municipality'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const schema = z.object({
  title: z.string().trim().min(1, 'Informe o tema do plano.'),
  teacher: z.string().trim().optional().default('Professor(a)'),
  school: z.string().trim().optional().default('Escola Municipal'),
  grade_level: z.string().trim().min(1, 'Informe o ano/turma.'),
  subject: z.string().trim().optional().default('Anos Iniciais'),
  date: z.string().optional(),
  duration: z.string().optional().default('50 minutos'),
  objectives: z.string().optional().default(''),
  methodology: z.string().optional().default(''),
  materials: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  skills_context: z.string().min(1, 'Selecione ao menos uma habilidade.'),
})

function envNumber(key: string, fallback: number) {
  const v = process.env[key]
  const n = v ? Number(v) : NaN
  return isNaN(n) ? fallback : n
}

async function callOpenAi(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY || ''
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  const timeoutMs = envNumber('OPENAI_TIMEOUT_MS', 30000)
  const maxTokens = envNumber('OPENAI_MAX_OUTPUT_TOKENS', 4200)

  if (!apiKey) throw new Error('OpenAI não configurado')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        input: prompt,
        max_output_tokens: maxTokens,
      }),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`OpenAI error ${res.status}: ${errText.slice(0, 200)}`)
    }
    const data = await res.json() as { output?: Array<{ content?: Array<{ text?: string }> }> }
    const text = data?.output?.[0]?.content?.[0]?.text || ''
    if (!text.trim()) throw new Error('Resposta vazia da OpenAI')
    return text
  } finally {
    clearTimeout(timer)
  }
}

type MunicipalityInfo = { name: string; state: string }

function muniLabel(muni: MunicipalityInfo): string {
  return muni.state ? `${muni.name}-${muni.state}` : muni.name
}

function buildPrompt(input: z.infer<typeof schema>, muni: MunicipalityInfo): string {
  const date = input.date || new Date().toLocaleDateString('pt-BR')
  const obj = input.objectives?.trim() || '[Inferir objetivos a partir do tema e das habilidades selecionadas.]'
  const met = input.methodology?.trim() || '[Propor metodologia ativa viável para a turma.]'
  const local = muniLabel(muni)

  return `Você é especialista em educação básica e no Referencial Curricular de ${local} (Anos Iniciais). \
Gere um plano de aula pronto para uso por professores da rede municipal de ${local}.

DADOS DO PLANO:
- Professor(a): ${input.teacher}
- Escola: ${input.school} | Município: ${local}
- Ano/Turma: ${input.grade_level}
- Componente Curricular: ${input.subject}
- Data: ${date}
- Duração: ${input.duration}
- Tema: ${input.title}
- Recursos disponíveis: ${input.materials || 'recursos básicos de sala de aula'}
- Observações: ${input.notes || 'nenhuma'}

OBJETIVOS DO PROFESSOR:
${obj}

METODOLOGIA INFORMADA:
${met}

HABILIDADES DO REFERENCIAL CURRICULAR DE ${muni.name.toUpperCase()} — ANOS INICIAIS (${input.skills_context.split('\n\n').length} selecionadas):
${input.skills_context}

Escreva em português do Brasil, com linguagem clara, direta e prática. O plano deve ser completo: entre 750 e 1100 palavras. \
Contextualize as atividades na realidade local de ${local} (cultura, paisagens, festas, comunidade). \
Evite introduções longas, decoração visual e repetições.

Use exatamente esta estrutura:

PLANO DE AULA: ${input.title.toUpperCase()}

1. IDENTIFICAÇÃO
Professor(a), escola, município, ano/turma, componente, data, duração e tema.

2. OBJETIVOS
Objetivo geral em uma frase com verbo de ação.
Três objetivos específicos mensuráveis.

3. HABILIDADES DO REFERENCIAL CURRICULAR
Liste as habilidades selecionadas com código e aplicação na aula.

4. CONTEÚDOS
- Conceituais: 2 itens.
- Procedimentais: 2 itens.
- Atitudinais: 1 item.

5. METODOLOGIA
Descreva a abordagem em 2 a 3 frases.

6. DESENVOLVIMENTO DA AULA
Momento inicial (5–10 min): contextualização.
Desenvolvimento (25–30 min): atividade principal.
Encerramento (10–15 min): socialização e síntese.

7. RECURSOS DIDÁTICOS
Liste os materiais.

8. AVALIAÇÃO
Critérios formativos objetivos.

9. REFERÊNCIAS
- Referencial Curricular de ${local} — Anos Iniciais (Secretaria Municipal de Educação, 2024).
- BRASIL. BNCC. Brasília: MEC, 2017.`
}

function buildFallback(input: z.infer<typeof schema>, muni: MunicipalityInfo): string {
  const date = input.date || new Date().toLocaleDateString('pt-BR')
  const local = muniLabel(muni)
  return `PLANO DE AULA: ${input.title.toUpperCase()}

1. IDENTIFICAÇÃO
Professor(a): ${input.teacher}
Escola: ${input.school} | Município: ${local}
Ano/Turma: ${input.grade_level} | Componente: ${input.subject}
Data: ${date} | Duração: ${input.duration}
Tema: ${input.title}

2. OBJETIVOS
Objetivo geral: Desenvolver aprendizagens significativas sobre ${input.title} alinhadas ao Referencial Curricular de ${local}.
Objetivos específicos:
- Relacionar o tema aos conhecimentos prévios e à realidade local.
- Aplicar as habilidades selecionadas em situações práticas e contextualizadas.
- Produzir uma evidência de aprendizagem individual ou coletiva.

3. HABILIDADES DO REFERENCIAL CURRICULAR
${input.skills_context}

4. CONTEÚDOS
Conceituais:
- Conceitos centrais do componente ${input.subject} ligados ao tema.
- Conexões com a realidade cultural e geográfica de ${local}.
Procedimentais:
- Observação, investigação, registro e comunicação de informações.
- Uso de materiais e recursos disponíveis.
Atitudinais:
- Colaboração, respeito às diferenças e valorização do patrimônio local.

5. METODOLOGIA
${input.methodology || 'Metodologia ativa com mediação do professor, trabalho em duplas/grupos e registro das descobertas.'}

6. DESENVOLVIMENTO DA AULA
Momento inicial: apresente o tema com exemplos da realidade de ${local}. Levante os conhecimentos prévios da turma e registre no quadro as ideias principais. Retome as habilidades selecionadas em linguagem acessível.

Desenvolvimento: proponha uma atividade prática com os recursos disponíveis. Os estudantes devem investigar, organizar informações ou criar um produto simples relacionado ao tema. Circule pela sala, faça perguntas, apoie grupos com mais dificuldade e incentive justificativas.

Encerramento: convide os grupos a compartilhar resultados. Sistematize o que foi aprendido e conecte com as habilidades do referencial. Registre combinados para continuidade.

7. RECURSOS DIDÁTICOS
${input.materials || 'Quadro, caderno, lápis de cor, materiais recicláveis ou recursos digitais disponíveis.'}

8. AVALIAÇÃO
Avaliação formativa observando: participação ativa, colaboração, clareza do registro, pertinência ao tema e qualidade da evidência produzida.

9. REFERÊNCIAS
- Referencial Curricular de ${local} — Anos Iniciais. Secretaria Municipal de Educação, 2024.
- BRASIL. Base Nacional Comum Curricular (BNCC). Brasília: MEC, 2017.

${input.objectives ? `OBJETIVOS DO PROFESSOR:\n${input.objectives}` : ''}
${input.notes ? `\nOBSERVAÇÕES:\n${input.notes}` : ''}

Plano elaborado com base no Referencial Curricular de ${local} — Secretaria Municipal de Educação.`
}

export async function POST(request: Request) {
  try {
    // Exige login: evita que terceiros consumam a cota da OpenAI anonimamente.
    const user = await requireAuthenticatedUser(request)

    const limit = rateLimit(`plan-ai:${user.id}`, 10, 60_000)
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Muitas gerações em pouco tempo. Aguarde um instante e tente novamente.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
      )
    }

    const municipality = await resolveMunicipality(request)
    if (!municipality) {
      return NextResponse.json({ error: 'Municipio nao identificado' }, { status: 400 })
    }

    const body = await request.json()
    const values = schema.parse(body)
    const muni = { name: municipality.name, state: municipality.state }
    const prompt = buildPrompt(values, muni)

    let content: string
    try {
      content = await callOpenAi(prompt)
    } catch (aiError) {
      console.error('[POST /api/plans/generate-ai] OpenAI indisponivel, usando fallback:', aiError instanceof Error ? aiError.message : aiError)
      content = buildFallback(values, muni)
    }

    return NextResponse.json({ data: { content } })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Login obrigatorio para gerar plano' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'BLOCKED') {
      return NextResponse.json({ error: 'Conta bloqueada' }, { status: 403 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dados inválidos' }, { status: 400 })
    }
    console.error('[POST /api/plans/generate-ai]', error)
    const message = error instanceof Error ? error.message : 'Erro ao gerar plano'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
