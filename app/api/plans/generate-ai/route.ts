import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/supabase-server'
import { resolveMunicipality } from '@/lib/municipality'
import { rateLimitShared, getClientIp } from '@/lib/rate-limit'
import { generatePlanFromPrompt } from '@/lib/public-backend'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const schema = z.object({
  title: z.string().trim().min(1, 'Informe o tema.'),
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
  // Tipo de documento a gerar. 'plano' preserva o comportamento original.
  kind: z.enum(['plano', 'exercicios', 'avaliacao']).optional().default('plano'),
  num_questions: z.coerce.number().int().min(1).max(30).optional().default(10),
  difficulty: z.enum(['facil', 'medio', 'dificil', 'mista']).optional().default('mista'),
})

const DIFFICULTY_LABEL: Record<string, string> = {
  facil: 'fácil',
  medio: 'médio',
  dificil: 'difícil',
  mista: 'progressiva (do mais fácil ao mais difícil)',
}

// A chamada à OpenAI usa o mesmo helper do gerador de planos público
// (lib/public-backend.ts): ele envia `reasoning: { effort }` e faz o parsing
// correto da Responses API — filtrando o item `type: 'message'` em vez de
// assumir que `output[0]` é a mensagem (com modelos de reasoning como o
// gpt-5-nano, `output[0]` é o item de reasoning e vinha vazio, forçando o
// fallback local mesmo com a IA respondendo 200).
const callOpenAi = generatePlanFromPrompt

type MunicipalityInfo = { name: string; state: string }

function muniLabel(muni: MunicipalityInfo): string {
  return muni.state ? `${muni.name}-${muni.state}` : muni.name
}

function buildPlanPrompt(input: z.infer<typeof schema>, muni: MunicipalityInfo): string {
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

function buildExercisesPrompt(input: z.infer<typeof schema>, muni: MunicipalityInfo): string {
  const local = muniLabel(muni)
  const n = input.num_questions
  const dif = DIFFICULTY_LABEL[input.difficulty]

  return `Você é especialista em educação básica e no Referencial Curricular de ${local}. \
Elabore uma LISTA DE EXERCÍCIOS pronta para impressão e uso por professores da rede municipal de ${local}.

DADOS:
- Professor(a): ${input.teacher}
- Escola: ${input.school} | Município: ${local}
- Ano/Turma: ${input.grade_level}
- Componente Curricular: ${input.subject}
- Tema/Assunto: ${input.title}
- Quantidade de questões: ${n}
- Nível de dificuldade: ${dif}
- Observações: ${input.notes || 'nenhuma'}

HABILIDADES DO REFERENCIAL CURRICULAR DE ${muni.name.toUpperCase()} (${input.skills_context.split('\n\n').length} selecionadas):
${input.skills_context}

Escreva em português do Brasil, com linguagem adequada à faixa etária do ${input.grade_level}. \
Contextualize os enunciados na realidade local de ${local} (cultura, paisagens, festas, comunidade, nomes e lugares da região). \
Varie os tipos de questão: múltipla escolha (com 4 alternativas a–d), completar lacunas, verdadeiro ou falso, associação e questões abertas/dissertativas curtas. \
As questões devem avaliar as habilidades listadas. Não inclua decoração visual nem introduções longas.

Use exatamente esta estrutura:

LISTA DE EXERCÍCIOS: ${input.title.toUpperCase()}

IDENTIFICAÇÃO
Escola, professor(a), componente, ano/turma e espaço para nome e data do aluno.

INSTRUÇÕES
Uma ou duas frases orientando como responder.

QUESTÕES
Numere de 1 a ${n}. Em cada questão indique entre colchetes a habilidade avaliada (ex.: [EF01LP01]). \
Para múltipla escolha, liste as alternativas a) b) c) d). Deixe claro o comando da questão.

GABARITO COMENTADO
Ao final, liste a resposta de cada questão numerada, com uma breve justificativa pedagógica (1 a 2 frases). \
Nas questões abertas, descreva o que se espera na resposta.`
}

function buildAssessmentPrompt(input: z.infer<typeof schema>, muni: MunicipalityInfo): string {
  const local = muniLabel(muni)
  const n = input.num_questions
  const dif = DIFFICULTY_LABEL[input.difficulty]

  return `Você é especialista em avaliação da aprendizagem na educação básica e no Referencial Curricular de ${local}. \
Elabore uma ATIVIDADE AVALIATIVA (prova) pronta para aplicação por professores da rede municipal de ${local}.

DADOS:
- Professor(a): ${input.teacher}
- Escola: ${input.school} | Município: ${local}
- Ano/Turma: ${input.grade_level}
- Componente Curricular: ${input.subject}
- Tema/Conteúdo avaliado: ${input.title}
- Quantidade de questões: ${n}
- Nível de dificuldade: ${dif}
- Observações: ${input.notes || 'nenhuma'}

HABILIDADES DO REFERENCIAL CURRICULAR DE ${muni.name.toUpperCase()} (${input.skills_context.split('\n\n').length} selecionadas):
${input.skills_context}

Escreva em português do Brasil, com linguagem clara e adequada ao ${input.grade_level}. \
Contextualize as questões na realidade local de ${local}. \
Combine questões objetivas (múltipla escolha com 4 alternativas a–d) e questões discursivas. \
Distribua a pontuação de forma que a soma total seja 10,0 pontos e indique o valor de cada questão. \
As questões devem avaliar as habilidades listadas de forma justa e progressiva.

Use exatamente esta estrutura:

ATIVIDADE AVALIATIVA: ${input.title.toUpperCase()}

IDENTIFICAÇÃO
Escola, professor(a), componente, ano/turma. Espaço para Nome do aluno, Turma, Data e Nota.

INSTRUÇÕES
Regras da avaliação (uso de material, tempo, orientação de preenchimento) em 2 a 3 frases.

QUESTÕES
Numere de 1 a ${n}. Em cada questão indique o valor em pontos e, entre colchetes, a habilidade avaliada (ex.: [EF01MA01]). \
Para múltipla escolha, liste as alternativas a) b) c) d).

GABARITO E CRITÉRIOS DE CORREÇÃO
Ao final, liste a resposta esperada de cada questão e os critérios de pontuação das questões discursivas (o que vale pontuação parcial e total). \
Confirme que a soma dos valores é 10,0 pontos.`
}

function buildPrompt(input: z.infer<typeof schema>, muni: MunicipalityInfo): string {
  if (input.kind === 'exercicios') return buildExercisesPrompt(input, muni)
  if (input.kind === 'avaliacao') return buildAssessmentPrompt(input, muni)
  return buildPlanPrompt(input, muni)
}

function buildPlanFallback(input: z.infer<typeof schema>, muni: MunicipalityInfo): string {
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

function buildQuestionsFallback(
  input: z.infer<typeof schema>,
  muni: MunicipalityInfo,
  header: string,
): string {
  const local = muniLabel(muni)
  const n = input.num_questions
  const lines: string[] = []
  for (let i = 1; i <= n; i++) {
    lines.push(`${i}. [Habilidade selecionada] Questão ${i} sobre ${input.title}, contextualizada na realidade de ${local}. \
(Elabore o enunciado a partir das habilidades selecionadas e do nível ${DIFFICULTY_LABEL[input.difficulty]}.)`)
  }
  const gab = Array.from({ length: n }, (_v, i) => `${i + 1}. Resposta esperada — revisar conforme o enunciado.`).join('\n')

  return `${header}: ${input.title.toUpperCase()}

IDENTIFICAÇÃO
Escola: ${input.school} | Município: ${local}
Professor(a): ${input.teacher} | Componente: ${input.subject} | Ano/Turma: ${input.grade_level}
Aluno(a): _______________________  Data: ____/____/____

HABILIDADES AVALIADAS
${input.skills_context}

QUESTÕES
${lines.join('\n\n')}

GABARITO
${gab}

Documento elaborado com base no Referencial Curricular de ${local} — Secretaria Municipal de Educação.
(A IA não respondeu agora; este é um rascunho local — revise e complete os enunciados antes de aplicar.)`
}

function buildFallback(input: z.infer<typeof schema>, muni: MunicipalityInfo): string {
  if (input.kind === 'exercicios') return buildQuestionsFallback(input, muni, 'LISTA DE EXERCÍCIOS')
  if (input.kind === 'avaliacao') return buildQuestionsFallback(input, muni, 'ATIVIDADE AVALIATIVA')
  return buildPlanFallback(input, muni)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const values = schema.parse(body)

    // Exercicios e atividades avaliativas podem ser gerados SEM login (com rate
    // limit por IP). Plano de aula continua exigindo login para conter o custo
    // de IA — que costuma ser a geração mais pesada e reaproveitável.
    const publicKind = values.kind === 'exercicios' || values.kind === 'avaliacao'
    const user = await getAuthenticatedUser(request)
    if (!user && !publicKind) {
      return NextResponse.json({ error: 'Login obrigatorio para gerar plano' }, { status: 401 })
    }

    const limit = user
      ? await rateLimitShared(`plan-ai:${user.id}`, 10, 60_000)
      : await rateLimitShared(`plan-ai-public:${getClientIp(request)}`, 5, 60_000)
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

    const muni = { name: municipality.name, state: municipality.state }
    const prompt = buildPrompt(values, muni)

    let content: string
    let source: 'ai' | 'fallback' = 'ai'
    try {
      content = await callOpenAi(prompt)
    } catch (aiError) {
      console.error('[POST /api/plans/generate-ai] OpenAI indisponivel, usando fallback:', aiError instanceof Error ? aiError.message : 'erro')
      content = buildFallback(values, muni)
      source = 'fallback'
    }

    const docLabel = values.kind === 'exercicios' ? 'Esta lista de exercícios' : values.kind === 'avaliacao' ? 'Esta atividade avaliativa' : 'Este plano'
    return NextResponse.json({
      data: {
        content,
        source,
        kind: values.kind,
        ...(source === 'fallback'
          ? { warning: `A IA não respondeu agora. ${docLabel} foi gerado por um modelo local — revise com atenção antes de publicar.` }
          : {}),
      },
    })
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
