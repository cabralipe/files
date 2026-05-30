import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { generatePlanFromPrompt } from '@/lib/public-backend'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

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
  skills: NacionalSkill[]
}

function buildPrompt(body: RequestBody): string {
  const skillBlock = body.skills
    .map((s) => `[${s.code}] ${s.disciplina} — ${s.unidade_tematica}\n${s.habilidade}`)
    .join('\n\n')

  const date = body.date || new Date().toLocaleDateString('pt-BR')
  const objectives = body.objectives?.trim() || '[Inferir objetivos a partir do tema e das habilidades selecionadas]'
  const methodology = body.methodology?.trim() || '[Propor metodologia ativa simples e viável para a turma]'

  return `Você é especialista em educação básica e BNCC. Gere um plano de aula completo e pronto para uso.

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

HABILIDADES DA BNCC SELECIONADAS (${body.skills.length}):
${skillBlock || 'Nenhuma habilidade selecionada — inferir a partir do tema.'}

Escreva em português do Brasil, linguagem clara, direta e prática. O plano deve conter: identificação, objetivos, metodologia/desenvolvimento (com momentos da aula), avaliação e referências. Entre 750 e 1100 palavras. Sem introduções longas ou decoração visual.`
}

export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json()

    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Informe o tema do plano.' }, { status: 400 })
    }
    if (!body.skills?.length) {
      return NextResponse.json({ error: 'Selecione ao menos uma habilidade.' }, { status: 400 })
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
