import { randomUUID } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import skillsSeed from '@/bncc-skills.json'
import { addPoints } from '@/lib/points-server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export type PublicSkill = {
  id: string
  code: string
  name: string
  description: string
  grade_level: string
  competency: string
  subject: string
  axis: string
}

export type PublicPlan = {
  id: string
  title: string
  teacher: string
  school: string
  grade_level: string
  subject: string
  date: string
  duration: string
  methodology: string
  objectives: string
  materials: string
  notes: string
  skill_ids: string[]
  content: string
  coordinator_viewed_at?: string
  coordinator_name?: string
  coordinator_note?: string
  created_at: string
  updated_at: string
}

export type PublicExperience = {
  id: string
  user_id: string
  title: string
  teacher: string
  school: string
  subject: string
  grade_level: string
  description: string
  content: string
  outcomes: string
  image_url: string
  skill_ids: string[]
  created_at: string
  updated_at: string
}

const PUBLIC_PLAN_USER_EMAIL = 'planos-publicos@bncc.local'

const planSchemaBase = {
  title: z.string().trim().min(3, 'Informe o tema do plano'),
  teacher: z.string().trim().optional().default('Professor(a)'),
  school: z.string().trim().optional().default('Escola Municipal'),
  grade_level: z.string().trim().min(1, 'Informe o ano/turma'),
  subject: z.string().trim().min(1, 'Informe o componente curricular'),
  date: z.string().trim().optional().default(''),
  duration: z.string().trim().optional().default('50 minutos'),
  methodology: z.string().trim().optional().default('Metodologia ativa com mediação do professor'),
  objectives: z.string().trim().optional().default(''),
  materials: z.string().trim().optional().default('Quadro, caderno, celular ou computador compartilhado'),
  notes: z.string().trim().optional().default(''),
  skill_ids: z.array(z.string().trim()).min(1, 'Selecione ao menos uma habilidade'),
  content: z.string().trim().optional().default(''),
}

export const createPlanSchema = z.object(planSchemaBase)
export const updatePlanSchema = z.object(planSchemaBase).partial().extend({
  skill_ids: z.array(z.string().trim()).optional(),
})

const experienceSchemaBase = {
  title: z.string().trim().min(3, 'Informe o titulo da experiência'),
  teacher: z.string().trim().optional().default('Professor(a)'),
  school: z.string().trim().optional().default('Escola Municipal'),
  subject: z.string().trim().optional().default('Computação'),
  grade_level: z.string().trim().optional().default(''),
  description: z.string().trim().min(10, 'Descreva a experiência em pelo menos 10 caracteres'),
  content: z.string().trim().optional().default(''),
  outcomes: z.string().trim().optional().default(''),
  image_url: z.string().trim().optional().default(''),
  skill_ids: z.array(z.string().trim()).optional().default([]),
}

export const createExperienceSchema = z.object(experienceSchemaBase)

export type ExperienceOwner = {
  user_id: string
  teacher?: string
}

type SkillSeedShape = {
  skills?: Array<{
    id?: string
    code?: string
    name?: string
    description?: string | null
    grade_level?: string
    competency?: string
    subject?: string
    axis?: string
    category?: string
  }>
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !key || key.includes('\n')) {
    return null
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function normalizeSkill(raw: Record<string, unknown>, index: number): PublicSkill {
  const code = String(raw.code || raw.id || `BNCC-${index + 1}`)
  const subject = String(raw.subject || raw.category || 'Computação')

  return {
    id: String(raw.id || code),
    code,
    name: String(raw.name || code),
    description: raw.description ? String(raw.description) : '',
    grade_level: String(raw.grade_level || 'EJA'),
    competency: String(raw.competency || subject),
    subject,
    axis: String(raw.axis || raw.competency || 'Tecnologia'),
  }
}

export async function listSkills(): Promise<PublicSkill[]> {
  const supabase = getSupabase()

  if (supabase) {
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .order('grade_level', { ascending: true })
      .order('code', { ascending: true })

    if (!error && data?.length) {
      return data.map((skill, index) => normalizeSkill(skill, index))
    }
  }

  return ((skillsSeed as SkillSeedShape).skills || []).map((skill, index) =>
    normalizeSkill(skill, index),
  )
}

function parseDurationMinutes(duration: string) {
  const match = duration.match(/\d+/)
  return match ? Number(match[0]) : 50
}

function toPlanRow(plan: PublicPlan, userId: string) {
  return {
    user_id: userId,
    title: plan.title,
    description: plan.notes || plan.objectives || plan.title,
    grade_level: plan.grade_level,
    content: JSON.stringify({ __publicPlan: true, plan }),
    duration: parseDurationMinutes(plan.duration),
    updated_at: plan.updated_at,
  }
}

function mapPlanRow(row: Record<string, any>): PublicPlan {
  const parsed = typeof row.content === 'string' ? safeJson(row.content) : null
  if (parsed?.__publicPlan && parsed.plan) {
    return {
      ...parsed.plan,
      id: row.id,
      coordinator_viewed_at: parsed.plan.coordinator_viewed_at || row.coordinator_viewed_at || '',
      coordinator_name: parsed.plan.coordinator_name || '',
      coordinator_note: parsed.plan.coordinator_note || row.coordinator_note || '',
      created_at: row.created_at,
      updated_at: row.updated_at,
    }
  }

  return {
    id: String(row.id),
    title: String(row.title || ''),
    teacher: 'Professor(a)',
    school: 'Escola Municipal',
    grade_level: String(row.grade_level || ''),
    subject: String(row.subject || ''),
    date: String(row.created_at || '').slice(0, 10),
    duration: row.duration ? `${row.duration} minutos` : '50 minutos',
    methodology: 'Metodologia ativa com mediacao do professor',
    objectives: String(row.objectives || ''),
    materials: String(row.materials || ''),
    notes: String(row.description || ''),
    skill_ids: [],
    content: String(row.content || ''),
    coordinator_viewed_at: String(row.coordinator_viewed_at || ''),
    coordinator_name: '',
    coordinator_note: String(row.coordinator_note || ''),
    created_at: String(row.created_at || ''),
    updated_at: String(row.updated_at || row.created_at || ''),
  }
}

function safeJson(value: string) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

async function ensurePublicPlanUser() {
  const supabase = getSupabaseAdmin()
  const { data: existingAuthUsers } = await supabase.auth.admin.listUsers()
  let authUser = existingAuthUsers.users.find((user) => user.email === PUBLIC_PLAN_USER_EMAIL)

  if (!authUser) {
    const { data: createdAuthUser, error: createAuthError } = await supabase.auth.admin.createUser({
      email: PUBLIC_PLAN_USER_EMAIL,
      password: randomUUID(),
      email_confirm: true,
      user_metadata: { name: 'Planos publicos' },
    })

    if (createAuthError) {
      throw createAuthError
    }

    authUser = createdAuthUser.user
  }

  if (!authUser) {
    throw new Error('Não foi possivel preparar o usuario publico de planos')
  }

  const { error } = await supabase
    .from('users')
    .upsert({
      id: authUser.id,
      email: PUBLIC_PLAN_USER_EMAIL,
      full_name: 'Planos publicos',
    })

  if (!error) {
    return authUser.id
  }

  if (error.code !== 'PGRST204') {
    throw error
  }

  const { error: fallbackError } = await supabase
    .from('users')
    .upsert({
      id: authUser.id,
      email: PUBLIC_PLAN_USER_EMAIL,
      name: 'Planos publicos',
      points: 0,
    })

  if (fallbackError) {
    throw fallbackError
  }

  return authUser.id
}

export async function listPlans(userId?: string): Promise<PublicPlan[]> {
  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('plans')
    .select('*')
    .order('created_at', { ascending: false })

  if (userId) {
    query = query.eq('user_id', userId)
  } else {
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data || []).map((row) => mapPlanRow(row as Record<string, any>))
}

export async function createPlan(input: z.infer<typeof createPlanSchema>, ownerUserId?: string) {
  const planUserId = ownerUserId || (await ensurePublicPlanUser())
  const values = createPlanSchema.parse(input)
  const now = new Date().toISOString()
  const plan: PublicPlan = {
    id: randomUUID(),
    ...values,
    date: values.date || now.slice(0, 10),
    content: values.content || (await generatePlanText(values)),
    coordinator_viewed_at: '',
    coordinator_name: '',
    coordinator_note: '',
    created_at: now,
    updated_at: now,
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('plans')
    .insert(toPlanRow(plan, planUserId))
    .select()
    .single()

  if (error) {
    throw error
  }

  plan.id = data.id

  return plan
}

export async function updatePlan(id: string, input: z.infer<typeof updatePlanSchema>) {
  const updates = updatePlanSchema.parse(input)
  const supabase = getSupabaseAdmin()
  const { data: current, error: fetchError } = await supabase
    .from('plans')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    throw fetchError
  }

  if (!current) {
    return null
  }

  const nextPlan = {
    ...mapPlanRow(current as Record<string, any>),
    ...updates,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('plans').update(toPlanRow(nextPlan, current.user_id)).eq('id', id)

  if (error) {
    throw error
  }

  return nextPlan
}

export async function deletePlan(id: string) {
  const { error, count } = await getSupabaseAdmin()
    .from('plans')
    .delete({ count: 'exact' })
    .eq('id', id)

  if (error) {
    throw error
  }

  return Boolean(count)
}

export async function listPlansBySchool(school: string): Promise<PublicPlan[]> {
  const plans = await listPlans()
  const normalizedSchool = school.trim().toLowerCase()
  return plans.filter((plan) => plan.school.trim().toLowerCase() === normalizedSchool)
}

export async function reviewPlan(
  id: string,
  reviewerName: string,
  coordinatorNote: string,
) {
  const supabase = getSupabaseAdmin()
  const { data: current, error: fetchError } = await supabase
    .from('plans')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    throw fetchError
  }

  if (!current) {
    return null
  }

  const now = new Date().toISOString()
  const nextPlan = {
    ...mapPlanRow(current as Record<string, any>),
    coordinator_viewed_at: now,
    coordinator_name: reviewerName,
    coordinator_note: coordinatorNote,
    updated_at: now,
  }

  const { error, data } = await supabase
    .from('plans')
    .update(toPlanRow(nextPlan, current.user_id))
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) {
    throw error
  }

  const { error: columnError } = await supabase
    .from('plans')
    .update({
      coordinator_viewed_at: now,
      coordinator_note: coordinatorNote,
    })
    .eq('id', id)

  if (columnError && !columnError.message.includes('schema cache')) {
    throw columnError
  }

  return data ? mapPlanRow(data as Record<string, any>) : nextPlan
}

export async function listExperiences(userId?: string): Promise<PublicExperience[]> {
  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('successful_experiences')
    .select('*')
    .order('created_at', { ascending: false })

  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data || []).map((row: any) => {
    const parsedContent = typeof row.content === 'string' ? safeJson(row.content) : null
    const metadata = parsedContent?.__experience ? parsedContent : {}
    return {
      id: row.id,
      user_id: row.user_id,
      title: row.title,
      teacher: metadata.teacher || 'Professor(a)',
      school: metadata.school || 'Escola Municipal',
      subject: metadata.subject || row.category || 'Computação',
      grade_level: metadata.grade_level || '',
      description: row.description || '',
      content: metadata.content || row.content || '',
      outcomes: metadata.outcomes || '',
      image_url: metadata.image_url || (Array.isArray(row.images) ? row.images[0] : '') || '',
      skill_ids: metadata.skill_ids || [],
      created_at: row.created_at,
      updated_at: row.updated_at || row.created_at,
    }
  })
}

export async function createExperience(
  input: z.infer<typeof createExperienceSchema>,
  owner: ExperienceOwner,
) {
  const values = createExperienceSchema.parse(input)
  const now = new Date().toISOString()
  const experience: PublicExperience = {
    id: randomUUID(),
    ...values,
    user_id: owner.user_id,
    teacher: values.teacher || owner.teacher || 'Professor(a)',
    created_at: now,
    updated_at: now,
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('successful_experiences')
    .insert({
      user_id: owner.user_id,
      title: experience.title,
      description: experience.description,
      content: JSON.stringify({
        __experience: true,
        teacher: experience.teacher,
        school: experience.school,
        subject: experience.subject,
        grade_level: experience.grade_level,
        content: experience.content,
        outcomes: experience.outcomes,
        image_url: experience.image_url,
        skill_ids: experience.skill_ids,
      }),
      category: experience.subject,
      images: experience.image_url ? [experience.image_url] : [],
      published: true,
      updated_at: now,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  experience.id = data.id

  await addPoints(owner.user_id, 10, 'experiência_publicada', experience.id)

  return experience
}

export async function buildPlanPrompt(input: z.infer<typeof createPlanSchema>): Promise<string> {
  const skills = await listSkills()
  const selected = skills.filter((skill) => input.skill_ids.includes(skill.id) || input.skill_ids.includes(skill.code))
  const skillBlock = selected
    .map((skill) => `[${skill.code}] ${skill.name}\n${skill.description}\nEixo: ${skill.axis}`)
    .join('\n\n')
  const date = input.date || new Date().toLocaleDateString('pt-BR')

  return `Você é especialista em educação básica e BNCC. Crie um PLANO DE AULA COMPLETO e PRÁTICO para professores da rede pública municipal de Atalaia-AL (Alagoas, Nordeste).

DADOS DO PLANO:
• Professor(a): ${input.teacher || 'Não informado'}
• Escola: ${input.school || 'Não informada'} — Atalaia/AL
• Ano/Turma: ${input.grade_level}
• Componente Curricular: ${input.subject}
• Data: ${date}
• Duração: ${input.duration || '50 minutos'}
• Tema da Aula: ${input.title}
• Objetivos do professor: ${input.objectives || 'Não informado'}
• Recursos disponíveis: ${input.materials || 'recursos básicos'}
• Metodologia: ${input.methodology || 'Metodologia ativa'}
• Observações: ${input.notes || 'nenhuma'}

HABILIDADES DA BNCC COMPUTAÇÃO (${selected.length} selecionadas):
${skillBlock}

Escreva o plano de aula seguindo EXATAMENTE este formato:

════════════════════════════════════════════
PLANO DE AULA
${input.title.toUpperCase()}
════════════════════════════════════════════

▌ IDENTIFICAÇÃO
Professor(a): ${input.teacher || '_______________________'}
Escola: ${input.school || '_______________________'} | Município: Atalaia - AL
Ano/Turma: ${input.grade_level} | Componente: ${input.subject}
Data: ${date} | Duração: ${input.duration || '50 minutos'}
Tema: ${input.title}

────────────────────────────────────────────
▌ OBJETIVOS
────────────────────────────────────────────
OBJETIVO GERAL:
[o que os alunos serão capazes de fazer ao final da aula]

OBJETIVOS ESPECÍFICOS:
• [objetivo 1 — mensurável e específico]
• [objetivo 2]
• [objetivo 3]

────────────────────────────────────────────
▌ HABILIDADES DA BNCC COMPUTAÇÃO
────────────────────────────────────────────
${selected.map((h) => `[${h.code}] ${h.name}\n${h.description}`).join('\n\n')}

────────────────────────────────────────────
▌ CONTEÚDOS
────────────────────────────────────────────
CONCEITUAIS (o que saber):
• [conteúdo 1]
• [conteúdo 2]

PROCEDIMENTAIS (saber fazer):
• [conteúdo 1]
• [conteúdo 2]

ATITUDINAIS (saber ser):
• [conteúdo 1]

────────────────────────────────────────────
▌ METODOLOGIA
────────────────────────────────────────────
[Descreva a abordagem pedagógica de ${input.methodology}: como o pensamento computacional será integrado ao conteúdo e como a realidade de Atalaia-AL será valorizada.]

────────────────────────────────────────────
▌ DESENVOLVIMENTO DA AULA
────────────────────────────────────────────

🟢 MOMENTO INICIAL — Aquecimento e Contextualização
⏱ [XX minutos]

[Como o professor iniciará a aula, perguntas motivadoras e conexão com a realidade dos alunos de Atalaia.]

🔵 DESENVOLVIMENTO — Construção do Conhecimento
⏱ [XX minutos]

[Passo a passo das atividades: o que o professor faz, o que os alunos fazem, como usarão os recursos (${input.materials}), interações e instruções do professor.]

🟡 ENCERRAMENTO — Síntese e Sistematização
⏱ [XX minutos]

[Como consolidar o aprendizado e fazer a síntese da aula.]

────────────────────────────────────────────
▌ RECURSOS DIDÁTICOS
────────────────────────────────────────────
• [liste cada recurso especificando como será usado]

────────────────────────────────────────────
▌ AVALIAÇÃO
────────────────────────────────────────────
AVALIAÇÃO FORMATIVA (durante a aula):
[Como avaliar o progresso dos alunos continuamente]

AVALIAÇÃO SOMATIVA (produto final):
[Produto ou evidência de aprendizagem esperada]

CRITÉRIOS DE AVALIAÇÃO:
• [critério 1]
• [critério 2]
• [critério 3]

────────────────────────────────────────────
▌ REFERÊNCIAS
────────────────────────────────────────────
• BRASIL. Base Nacional Comum Curricular (BNCC). Brasília: MEC, 2017.
• [referência 2 — artigo ou livro sobre computação na educação]
• [referência 3 — plataforma ou material educacional gratuito]

════════════════════════════════════════════
Plano elaborado com base na BNCC Computação
Secretaria Municipal de Educação de Atalaia/AL
${date}
════════════════════════════════════════════`
}

export async function generatePlanText(input: z.infer<typeof createPlanSchema>) {
  const skills = await listSkills()
  const selected = skills.filter((skill) => input.skill_ids.includes(skill.id) || input.skill_ids.includes(skill.code))
  const skillBlock = selected
    .map((skill) => `[${skill.code}] ${skill.name}\n${skill.description}\nEixo: ${skill.axis}`)
    .join('\n\n')
  const date = input.date || new Date().toLocaleDateString('pt-BR')

  const prompt = `Você é especialista em educação básica, BNCC e tecnologia educacional. Crie um PLANO DE AULA COMPLETO, DETALHADO e PRÁTICO para professores da rede pública municipal de Atalaia-AL (Alagoas, Nordeste).

DADOS DO PLANO:
• Professor(a): ${input.teacher || "Não informado"}
• Escola: ${input.school || "Não informada"} — Atalaia/AL
• Ano/Turma: ${input.grade_level}
• Componente Curricular: ${input.subject}
• Data: ${date}
• Duração: ${input.duration || "50 minutos"}
• Tema da Aula: ${input.title}
• Objetivos do professor: ${input.objectives || "Não informado"}
• Recursos disponíveis: ${input.materials || "recursos básicos"}
• Metodologia: ${input.methodology || "Metodologia ativa"}
• Observações: ${input.notes || "nenhuma"}

HABILIDADES DA BNCC COMPUTAÇÃO (${selected.length} selecionadas):
${skillBlock}

Escreva o plano de aula COMPLETO seguindo EXATAMENTE este formato e sendo MUITO detalhado em cada seção:

════════════════════════════════════════════
PLANO DE AULA
${input.title.toUpperCase()}
════════════════════════════════════════════

▌ IDENTIFICAÇÃO
Professor(a): ${input.teacher || "_______________________"}
Escola: ${input.school || "_______________________"} | Município: Atalaia - AL
Ano/Turma: ${input.grade_level} | Componente: ${input.subject}
Data: ${date} | Duração: ${input.duration || "50 minutos"}
Tema: ${input.title}

────────────────────────────────────────────
▌ OBJETIVOS
────────────────────────────────────────────
OBJETIVO GERAL:
[escreva aqui — o que os alunos serão capazes de fazer ao final da aula]

OBJETIVOS ESPECÍFICOS:
• [objetivo 1 — mensurável e específico]
• [objetivo 2]
• [objetivo 3]
• [objetivo 4]

────────────────────────────────────────────
▌ HABILIDADES DA BNCC COMPUTAÇÃO
────────────────────────────────────────────
${selected.map(h => `[${h.code}] ${h.name}\n${h.description}`).join("\n\n")}

────────────────────────────────────────────
▌ CONTEÚDOS
────────────────────────────────────────────
CONCEITUAIS (o que saber):
• [conteúdo 1]
• [conteúdo 2]
• [conteúdo 3]

PROCEDIMENTAIS (saber fazer):
• [conteúdo 1]
• [conteúdo 2]

ATITUDINAIS (saber ser):
• [conteúdo 1]
• [conteúdo 2]

────────────────────────────────────────────
▌ METODOLOGIA
────────────────────────────────────────────
[3-4 parágrafos descrevendo detalhadamente a abordagem pedagógica de ${input.methodology}, como os alunos interagirão com a tecnologia, como o pensamento computacional será integrado ao conteúdo, e como a realidade de Atalaia-AL será valorizada]

────────────────────────────────────────────
▌ DESENVOLVIMENTO DA AULA
────────────────────────────────────────────

🟢 MOMENTO INICIAL — Aquecimento e Contextualização
⏱ [XX minutos]

[Descreva em DETALHE: como o professor iniciará a aula, que perguntas motivadoras fará, como conectará o tema à realidade dos alunos de Atalaia (cultura, cotidiano nordestino, exemplos locais). Inclua diálogos sugeridos, dinâmica com os alunos, como organizar a sala. Mínimo 150 palavras.]

🔵 DESENVOLVIMENTO — Construção do Conhecimento
⏱ [XX minutos]

[Descreva em DETALHE o passo a passo das atividades principais: o que o professor faz, o que os alunos fazem, como usarão os recursos (${input.materials}), como acontecerão as interações entre alunos, quais instruções específicas o professor dará. Inclua sugestões de comandos/perguntas do professor, como lidar com dificuldades comuns. Mínimo 250 palavras.]

🟡 ENCERRAMENTO — Síntese e Sistematização
⏱ [XX minutos]

[Descreva como sistematizar o aprendizado: que perguntas o professor fará para consolidar o conhecimento, como os alunos registrarão o que aprenderam, como fazer a transição para a próxima aula. Mínimo 100 palavras.]

────────────────────────────────────────────
▌ RECURSOS DIDÁTICOS
────────────────────────────────────────────
• [liste cada recurso especificando como será usado]

────────────────────────────────────────────
▌ AVALIAÇÃO
────────────────────────────────────────────
AVALIAÇÃO FORMATIVA (durante a aula):
[Como o professor avaliará o progresso dos alunos continuamente]

AVALIAÇÃO SOMATIVA (produto final):
[Qual o produto/evidência de aprendizagem esperada]

CRITÉRIOS DE AVALIAÇÃO:
• [critério 1 — específico e observável]
• [critério 2]
• [critério 3]
• [critério 4]

────────────────────────────────────────────
▌ REFERÊNCIAS
────────────────────────────────────────────
• BRASIL. Base Nacional Comum Curricular (BNCC). Brasília: MEC, 2017.
• [referência 2 — artigo ou livro sobre computação na educação]
• [referência 3 — material digital gratuito]
• [referência 4 — site ou plataforma educacional]

════════════════════════════════════════════
Plano elaborado com base na BNCC Computação
Secretaria Municipal de Educação de Atalaia/AL
${date}
════════════════════════════════════════════

ATENÇÃO: Seja MUITO detalhado e prático. O plano deve ser autoexplicativo e estar pronto para uso imediato por qualquer professor. Valorize a cultura nordestina, a realidade de Atalaia-AL e use linguagem acessível.`

  const nvidiaKey = process.env.NVIDIA_API_KEY || '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'
  const nvidiaModel = 'deepseek-ai/deepseek-v4-flash'

  try {
    const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${nvidiaKey}`,
      },
      body: JSON.stringify({
        model: nvidiaModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2500,
      }),
    })

    if (!res.ok) {
      throw new Error(`Status ${res.status}`)
    }

    const payload = await res.json()
    const content = payload.choices?.[0]?.message?.content
    if (content) {
      return content
    }
  } catch (apiError) {
    console.warn('Erro ao chamar NVIDIA NIM API, usando template estático local:', apiError)
  }

  // Fallback local caso a API falhe
  return `PLANO DE AULA
${input.title.toUpperCase()}

IDENTIFICACAO
Professor(a): ${input.teacher || 'Professor(a)'}
Escola: ${input.school || 'Escola Municipal'} | Município: Atalaia - AL
Ano/Turma: ${input.grade_level} | Componente: ${input.subject}
Data: ${date} | Duração: ${input.duration || '50 minutos'}
Tema: ${input.title}

OBJETIVOS
Objetivo geral:
Desenvolver uma experiência de aprendizagem conectada a BNCC Computação, valorizando o cotidiano dos estudantes e o uso responsavel de tecnologias digitais.

Objetivos especificos:
- Relacionar o tema da aula aos conhecimentos previos dos estudantes.
- Aplicar procedimentos de investigacao, registro, colaboracao ou criacao digital.
- Produzir uma evidencia de aprendizagem individual ou coletiva.
- Exercitar atitudes de autoria, seguranca, respeito e cidadania digital.

HABILIDADES DA BNCC COMPUTACAO
${skillBlock || 'Nenhuma habilidade encontrada.'}

CONTEÚDOS
- Conceitos centrais do componente ${input.subject}.
- Cultura digital, pensamento computacional e uso critico de recursos tecnologicos.
- Comunicacao, registro e socializacao de descobertas.

METODOLOGIA
${input.methodology || 'Metodologia ativa com mediacao do professor.'}

O professor inicia a aula contextualizando o tema com exemplos proximos da realidade de Atalaia/AL. Em seguida, organiza a turma para uma atividade pratica em duplas ou pequenos grupos, alternando momentos de orientacao coletiva, investigacao guiada e registro das descobertas.

DESENVOLVIMENTO DA AULA
Momento inicial:
Apresente o tema, escute hipoteses dos estudantes e registre no quadro as ideias principais. Retome as habilidades selecionadas em linguagem simples.

Desenvolvimento:
Proponha uma tarefa pratica com os recursos disponíveis. Os estudantes devem pesquisar, organizar informacoes, criar um produto simples ou resolver um desafio relacionado ao tema. Circule pela sala, faca perguntas, apoie grupos com mais dificuldade e incentive justificativas.

Encerramento:
Convide os grupos a compartilhar resultados. Sistematize o que foi aprendido, conecte com a BNCC Computação e registre combinados para continuidade.

RECURSOS DIDÁTICOS
${input.materials || 'Quadro, caderno, celular ou computador compartilhado.'}

AVALIACAO
A avaliação sera formativa, observando participacao, colaboracao, clareza do registro, relacao com as habilidades selecionadas e qualidade da evidencia produzida. Considere tambem uma autoavaliação breve: o que aprendi, o que foi dificil e como usei a tecnologia com responsabilidade.

OBSERVACOES
${input.notes || 'Plano gerado para uso e edição pelo professor.'}

REFERENCIAS
- BRASIL. Base Nacional Comum Curricular (BNCC). Brasilia: MEC, 2017.
- BNCC Computação e documentos curriculares complementares.

Plano elaborado com base na BNCC Computação
Secretaria Municipal de Educação de Atalaia/AL`
}
