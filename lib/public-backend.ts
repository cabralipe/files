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
  is_published?: boolean
  plan_status?: 'rascunho' | 'aguardando_aee' | 'aguardando_familia' | 'vigente' | 'arquivado' | 'substituido'
  is_pei?: boolean
  student_id?: string
  pei_snapshot?: Record<string, unknown>
  revisao_regente?: boolean
  colaboracao_aee?: PlanAeeCollaboration
  consulta_familia?: PlanFamilyConsultation
  // PAEE — plano do AEE, articulado com o PEI da sala regular.
  is_paee?: boolean
  paee_organizacao?: PlanPaeeOrganizacao
  linked_pei_id?: string
  created_at: string
  updated_at: string
}

export type PlanPaeeOrganizacao = {
  frequencia_semanal: string
  duracao_atendimento: string
  tipo_atendimento: 'individual' | 'grupo' | 'misto'
  local: string
  horario: string
  turno_aee: 'manha' | 'tarde' | 'noite' | 'contraturno'
  periodo_validade: string
  metas_periodo: string
}

export type PlanAeeCollaboration = {
  professor_id: string
  nome: string
  data: string
  funcao: string
  contribuicoes: string
  recursos_indicados: string[]
  adaptacoes_sugeridas: string[]
  parecer: string
}

export type PlanFamilyConsultation = {
  responsavel_nome: string
  parentesco: string
  data_consulta: string
  formato: 'presencial' | 'telefone' | 'whatsapp' | 'reuniao_online' | 'outro'
  informacoes_relevantes: string
  expectativas: string
  concordancia: 'aprovado' | 'ciencia_sem_aprovacao' | 'pendente'
  observacoes: string
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
  // PAEE nao usa habilidades BNCC; a exigencia de ao menos uma habilidade e
  // aplicada no createPlanSchema apenas para planos/PEIs.
  skill_ids: z.array(z.string().trim()).optional().default([]),
  content: z.string().trim().optional().default(''),
  is_published: z.boolean().optional().default(false),
  plan_status: z.enum(['rascunho', 'aguardando_aee', 'aguardando_familia', 'vigente', 'arquivado', 'substituido']).optional().default('rascunho'),
  is_pei: z.boolean().optional().default(false),
  is_paee: z.boolean().optional().default(false),
  paee_organizacao: z.object({
    frequencia_semanal: z.string().trim().optional().default('2 vezes por semana'),
    duracao_atendimento: z.string().trim().optional().default('50 minutos'),
    tipo_atendimento: z.enum(['individual', 'grupo', 'misto']).optional().default('individual'),
    local: z.string().trim().optional().default('Sala de Recursos Multifuncionais'),
    horario: z.string().trim().optional().default(''),
    turno_aee: z.enum(['manha', 'tarde', 'noite', 'contraturno']).optional().default('contraturno'),
    periodo_validade: z.string().trim().optional().default(''),
    metas_periodo: z.string().trim().optional().default(''),
  }).optional(),
  linked_pei_id: z.string().trim().optional().default(''),
  student_id: z.string().trim().optional().default(''),
  pei_snapshot: z.record(z.unknown()).optional().default({}),
  revisao_regente: z.boolean().optional().default(false),
  colaboracao_aee: z.object({
    professor_id: z.string().trim().optional().default(''),
    nome: z.string().trim().optional().default(''),
    data: z.string().trim().optional().default(''),
    funcao: z.string().trim().optional().default('Professor da sala especial/AEE'),
    contribuicoes: z.string().trim().optional().default(''),
    recursos_indicados: z.array(z.string().trim()).optional().default([]),
    adaptacoes_sugeridas: z.array(z.string().trim()).optional().default([]),
    parecer: z.string().trim().optional().default(''),
  }).optional(),
  consulta_familia: z.object({
    responsavel_nome: z.string().trim().optional().default(''),
    parentesco: z.string().trim().optional().default(''),
    data_consulta: z.string().trim().optional().default(''),
    formato: z.enum(['presencial', 'telefone', 'whatsapp', 'reuniao_online', 'outro']).optional().default('presencial'),
    informacoes_relevantes: z.string().trim().optional().default(''),
    expectativas: z.string().trim().optional().default(''),
    concordancia: z.enum(['aprovado', 'ciencia_sem_aprovacao', 'pendente']).optional().default('pendente'),
    observacoes: z.string().trim().optional().default(''),
  }).optional(),
}

export const createPlanSchema = z.object(planSchemaBase).superRefine((values, ctx) => {
  if (!values.is_paee && values.skill_ids.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['skill_ids'],
      message: 'Selecione ao menos uma habilidade',
    })
  }
})
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
  const rawAxis = String(raw.axis || raw.competency || 'Tecnologia')
  // corrige typos conhecidos no campo axis
  const axis = rawAxis.replace(/^PP(ENSAMENTO)/i, 'P$1').trim()

  return {
    id: String(raw.id || code),
    code,
    name: String(raw.name || code),
    description: raw.description ? String(raw.description) : '',
    grade_level: String(raw.grade_level || 'EJA'),
    competency: String(raw.competency || subject),
    subject,
    axis,
  }
}

export async function listSkills(municipalityId?: string | null): Promise<PublicSkill[]> {
  const supabase = getSupabase()

  if (supabase) {
    let query = supabase
      .from('skills')
      .select('*')
      .order('grade_level', { ascending: true })
      .order('code', { ascending: true })

    // Isolamento por tenant: quando o município é conhecido, retorna só o
    // currículo dele. Sem município, mantém o comportamento global anterior.
    if (municipalityId) {
      query = query.eq('municipality_id', municipalityId)
    }

    const { data, error } = await query

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

function toPlanRow(plan: PublicPlan, userId: string, municipalityId?: string) {
  const row: Record<string, unknown> = {
    user_id: userId,
    title: plan.title,
    description: plan.notes || plan.objectives || plan.title,
    grade_level: plan.grade_level,
    subject: plan.subject,
    content: JSON.stringify({ __publicPlan: true, plan }),
    duration: parseDurationMinutes(plan.duration),
    materials: plan.materials,
    objectives: plan.objectives,
    is_published: Boolean(plan.is_published),
    is_pei: Boolean(plan.is_pei),
    student_id: plan.student_id || null,
    pei_snapshot: plan.pei_snapshot || {},
    updated_at: plan.updated_at,
  }
  if (municipalityId) row.municipality_id = municipalityId
  return row
}

function hasText(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
}

function validatePublicationReadiness(plan: PublicPlan) {
  if (!plan.is_published && plan.plan_status !== 'vigente') return

  // PAEE: elaborado pelo proprio AEE, exige aluno vinculado e ciencia da familia.
  if (plan.is_paee) {
    const familia = plan.consulta_familia
    const missing: string[] = []
    if (!hasText(plan.student_id)) missing.push('aluno vinculado ao PAEE')
    if (!familia || !hasText(familia.responsavel_nome) || !hasText(familia.data_consulta)) {
      missing.push('consulta familiar registrada')
    }
    if (!familia || familia.concordancia === 'pendente') {
      missing.push('aprovacao ou ciencia formal da familia/responsavel')
    }
    if (missing.length) {
      throw new Error(`PUBLICATION_BLOCKED:${missing.join(', ')}`)
    }
    return
  }

  if (!plan.is_pei) return

  const aee = plan.colaboracao_aee
  const familia = plan.consulta_familia
  const missing: string[] = []

  if (!plan.revisao_regente) missing.push('revisao humana do professor regente')
  if (!hasText(plan.student_id)) missing.push('aluno vinculado ao PEI')
  if (!aee || !hasText(aee.nome) || !hasText(aee.data) || !hasText(aee.contribuicoes)) {
    missing.push('colaboracao registrada do AEE')
  }
  if (!plan.coordinator_viewed_at) missing.push('validacao da coordenacao pedagogica')
  if (!familia || !hasText(familia.responsavel_nome) || !hasText(familia.data_consulta)) {
    missing.push('consulta familiar registrada')
  }
  if (!familia || familia.concordancia === 'pendente') {
    missing.push('aprovacao ou ciencia formal da familia/responsavel')
  }

  if (missing.length) {
    throw new Error(`PUBLICATION_BLOCKED:${missing.join(', ')}`)
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
      is_published: Boolean(row.is_published || parsed.plan.is_published),
      plan_status: parsed.plan.plan_status || (row.is_published ? 'vigente' : 'rascunho'),
      is_pei: Boolean(row.is_pei || parsed.plan.is_pei),
      is_paee: Boolean(parsed.plan.is_paee),
      student_id: parsed.plan.student_id || row.student_id || '',
      pei_snapshot: parsed.plan.pei_snapshot || row.pei_snapshot || {},
      revisao_regente: Boolean(parsed.plan.revisao_regente),
      colaboracao_aee: parsed.plan.colaboracao_aee,
      consulta_familia: parsed.plan.consulta_familia,
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
    is_published: Boolean(row.is_published),
    plan_status: row.is_published ? 'vigente' : 'rascunho',
    is_pei: Boolean(row.is_pei),
    is_paee: false,
    student_id: String(row.student_id || ''),
    pei_snapshot: row.pei_snapshot || {},
    revisao_regente: false,
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

export async function listPlans(userId?: string, municipalityId?: string): Promise<PublicPlan[]> {
  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('plans')
    .select('*')
    .order('created_at', { ascending: false })

  if (userId) {
    query = query.eq('user_id', userId)
  }
  if (municipalityId) {
    query = query.eq('municipality_id', municipalityId)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data || []).map((row) => mapPlanRow(row as Record<string, any>))
}

export async function createPlan(
  input: z.infer<typeof createPlanSchema>,
  ownerUserId?: string,
  municipalityId?: string,
) {
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
    is_published: values.is_published,
    plan_status: values.is_published ? 'vigente' : values.plan_status,
    is_pei: values.is_pei,
    student_id: values.student_id,
    pei_snapshot: values.pei_snapshot,
    revisao_regente: values.revisao_regente,
    colaboracao_aee: values.colaboracao_aee,
    consulta_familia: values.consulta_familia,
    created_at: now,
    updated_at: now,
  }

  validatePublicationReadiness(plan)

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('plans')
    .insert(toPlanRow(plan, planUserId, municipalityId))
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
    is_published: updates.is_published ?? mapPlanRow(current as Record<string, any>).is_published ?? false,
    plan_status:
      updates.is_published === true
        ? 'vigente'
        : updates.plan_status || mapPlanRow(current as Record<string, any>).plan_status || 'rascunho',
    updated_at: new Date().toISOString(),
  }

  validatePublicationReadiness(nextPlan)

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

// Lista PEIs (de todos os professores) para os fluxos de validacao AEE/coordenacao.
export async function listPeisForReview(opts: {
  municipalityId?: string
  school?: string
  status?: PublicPlan['plan_status']
}): Promise<PublicPlan[]> {
  let plans = await listPlans(undefined, opts.municipalityId)
  plans = plans.filter((plan) => plan.is_pei)
  if (opts.school) {
    const s = opts.school.trim().toLowerCase()
    plans = plans.filter((plan) => plan.school.trim().toLowerCase() === s)
  }
  if (opts.status) {
    plans = plans.filter((plan) => (plan.plan_status || 'rascunho') === opts.status)
  }
  return plans
}

// Retorna o PEI do aluno (preferindo o vigente) para o professor regente reaproveitar.
export async function getLatestPeiForStudent(
  studentId: string,
  municipalityId?: string,
): Promise<PublicPlan | null> {
  const plans = await listPlans(undefined, municipalityId)
  const peis = plans.filter((plan) => plan.is_pei && plan.student_id === studentId)
  const vigente = peis.find((plan) => plan.plan_status === 'vigente')
  return vigente || peis[0] || null
}

// Lista PAEEs (planos do AEE) para acompanhamento do AEE/coordenacao.
export async function listPaeesForReview(opts: {
  municipalityId?: string
  school?: string
  status?: PublicPlan['plan_status']
}): Promise<PublicPlan[]> {
  let plans = await listPlans(undefined, opts.municipalityId)
  plans = plans.filter((plan) => plan.is_paee)
  if (opts.school) {
    const s = opts.school.trim().toLowerCase()
    plans = plans.filter((plan) => plan.school.trim().toLowerCase() === s)
  }
  if (opts.status) {
    plans = plans.filter((plan) => (plan.plan_status || 'rascunho') === opts.status)
  }
  return plans
}

// Retorna o PAEE do aluno (preferindo o vigente) para articulacao com o PEI.
export async function getLatestPaeeForStudent(
  studentId: string,
  municipalityId?: string,
): Promise<PublicPlan | null> {
  const plans = await listPlans(undefined, municipalityId)
  const paees = plans.filter((plan) => plan.is_paee && plan.student_id === studentId)
  const vigente = paees.find((plan) => plan.plan_status === 'vigente')
  return vigente || paees[0] || null
}

export type PlanTransition = 'submit_aee' | 'submit_familia' | 'approve_aee' | 'reject_aee' | 'family_consent'

// Maquina de estados do PEI: rascunho -> aguardando_aee -> aguardando_familia -> vigente.
// Maquina de estados do PAEE (autor ja e o AEE, nao passa pela validacao AEE):
// rascunho -> aguardando_familia -> vigente.
export async function transitionPlanStatus(
  id: string,
  action: PlanTransition,
  payload: {
    actorName?: string
    colaboracao_aee?: Partial<PlanAeeCollaboration>
    consulta_familia?: Partial<PlanFamilyConsultation>
    note?: string
    // Identidade de quem executa a acao, para validar o escopo (escola/municipio
    // ou vinculo familiar) e evitar que um usuario atue sobre documentos alheios.
    actor?: { role?: string; userId?: string; school?: string; municipalityId?: string }
  } = {},
): Promise<PublicPlan | null> {
  const supabase = getSupabaseAdmin()
  const { data: current, error } = await supabase.from('plans').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!current) return null

  const plan = mapPlanRow(current as Record<string, any>)
  if (!plan.is_pei && !plan.is_paee) throw new Error('TRANSITION_NOT_PEI')

  // Escopo: alem do papel (validado na rota), o documento precisa pertencer ao
  // usuario. Gestao (admin/municipio) tem alcance amplo; equipe escolar fica na
  // sua escola; familia/responsavel so atua em alunos vinculados a sua conta.
  const actor = payload.actor
  if (actor?.role) {
    const managers = ['admin', 'municipality_admin', 'super_admin']
    if (actor.role === 'municipality_admin' && actor.municipalityId && current.municipality_id
      && current.municipality_id !== actor.municipalityId) {
      throw new Error('SCOPE_FORBIDDEN')
    }
    if (actor.role === 'family') {
      const { data: link } = await supabase
        .from('family_student_links')
        .select('student_id')
        .eq('family_user_id', actor.userId || '')
        .eq('student_id', plan.student_id || '')
        .maybeSingle()
      if (!link) throw new Error('SCOPE_FORBIDDEN')
    } else if (!managers.includes(actor.role)) {
      // teacher / aee_teacher / coordinator: restritos a propria escola.
      if (actor.school && plan.school && actor.school !== plan.school) {
        throw new Error('SCOPE_FORBIDDEN')
      }
    }
  }

  const status = plan.plan_status || 'rascunho'
  const now = new Date().toISOString()
  const next: PublicPlan = { ...plan, updated_at: now }

  if (action === 'submit_aee') {
    if (plan.is_paee || status !== 'rascunho') throw new Error('TRANSITION_INVALID')
    next.plan_status = 'aguardando_aee'
  } else if (action === 'submit_familia') {
    // PAEE vai direto do rascunho para a ciencia da familia.
    if (!plan.is_paee || status !== 'rascunho') throw new Error('TRANSITION_INVALID')
    next.plan_status = 'aguardando_familia'
  } else if (action === 'approve_aee') {
    if (plan.is_paee || status !== 'aguardando_aee') throw new Error('TRANSITION_INVALID')
    next.plan_status = 'aguardando_familia'
    next.revisao_regente = true
    next.colaboracao_aee = {
      professor_id: plan.colaboracao_aee?.professor_id || '',
      nome: payload.colaboracao_aee?.nome || payload.actorName || plan.colaboracao_aee?.nome || '',
      data: payload.colaboracao_aee?.data || now.slice(0, 10),
      funcao: payload.colaboracao_aee?.funcao || plan.colaboracao_aee?.funcao || 'Professor da sala especial/AEE',
      contribuicoes: payload.colaboracao_aee?.contribuicoes || plan.colaboracao_aee?.contribuicoes || 'Validado pelo professor AEE.',
      recursos_indicados: payload.colaboracao_aee?.recursos_indicados || plan.colaboracao_aee?.recursos_indicados || [],
      adaptacoes_sugeridas: payload.colaboracao_aee?.adaptacoes_sugeridas || plan.colaboracao_aee?.adaptacoes_sugeridas || [],
      parecer: payload.colaboracao_aee?.parecer || plan.colaboracao_aee?.parecer || '',
    }
  } else if (action === 'reject_aee') {
    if (status !== 'aguardando_aee') throw new Error('TRANSITION_INVALID')
    next.plan_status = 'rascunho'
    next.coordinator_note = payload.note || plan.coordinator_note || ''
  } else if (action === 'family_consent') {
    if (status !== 'aguardando_familia') throw new Error('TRANSITION_INVALID')
    next.plan_status = 'vigente'
    next.is_published = true
    next.consulta_familia = {
      responsavel_nome: payload.consulta_familia?.responsavel_nome || plan.consulta_familia?.responsavel_nome || payload.actorName || '',
      parentesco: payload.consulta_familia?.parentesco || plan.consulta_familia?.parentesco || '',
      data_consulta: payload.consulta_familia?.data_consulta || now.slice(0, 10),
      formato: payload.consulta_familia?.formato || plan.consulta_familia?.formato || 'presencial',
      informacoes_relevantes: payload.consulta_familia?.informacoes_relevantes || plan.consulta_familia?.informacoes_relevantes || '',
      expectativas: payload.consulta_familia?.expectativas || plan.consulta_familia?.expectativas || '',
      concordancia: payload.consulta_familia?.concordancia || 'aprovado',
      observacoes: payload.consulta_familia?.observacoes || plan.consulta_familia?.observacoes || '',
    }
  } else {
    throw new Error('TRANSITION_UNKNOWN')
  }

  const { error: upErr } = await supabase
    .from('plans')
    .update(toPlanRow(next, current.user_id))
    .eq('id', id)
  if (upErr) throw upErr
  return next
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

export async function listExperiences(
  userId?: string,
  municipalityId?: string,
): Promise<PublicExperience[]> {
  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('successful_experiences')
    .select('*')
    .order('created_at', { ascending: false })

  if (userId) {
    query = query.eq('user_id', userId)
  }
  if (municipalityId) {
    query = query.eq('municipality_id', municipalityId)
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
  municipalityId?: string,
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
  const row: Record<string, unknown> = {
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
    updated_at: now,
  }
  if (municipalityId) row.municipality_id = municipalityId

  const { data, error } = await supabase
    .from('successful_experiences')
    .insert(row)
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
  const teacherObjectives = (input.objectives || '').trim()
  const teacherMethodology = (input.methodology || '').trim()
  const teacherNotes = (input.notes || '').trim()
  const objectivesBlock = teacherObjectives
    ? teacherObjectives
    : '[Sugestao da IA - ajuste conforme sua intencao pedagogica] Inferir objetivos a partir do tema e das habilidades selecionadas.'
  const methodologyBlock = teacherMethodology
    ? teacherMethodology
    : '[Sugestao da IA - ajuste conforme sua intencao pedagogica] Propor metodologia ativa simples e viavel para a turma.'

  return `Voce e especialista em educacao basica, BNCC Computacao e tecnologia educacional. Gere um plano de aula pronto para uso por professores da rede municipal.

DADOS DO PLANO:
- Professor(a): ${input.teacher || 'Nao informado'}
- Escola: ${input.school || 'Nao informada'} | Municipio: rede municipal
- Ano/Turma: ${input.grade_level}
- Componente Curricular: ${input.subject}
- Data: ${date}
- Duracao: ${input.duration || '50 minutos'}
- Tema: ${input.title}
- Recursos disponiveis: ${input.materials || 'recursos basicos'}
- Observacoes: ${teacherNotes || 'nenhuma'}

OBJETIVOS DO PROFESSOR:
${objectivesBlock}

METODOLOGIA INFORMADA:
${methodologyBlock}

HABILIDADES DA BNCC COMPUTACAO (${selected.length} selecionadas):
${skillBlock || 'Nenhuma habilidade encontrada.'}

Escreva em portugues do Brasil, com linguagem clara, direta e pratica. O plano deve ser completo e moderadamente detalhado: entre 750 e 1100 palavras. Evite introducoes longas, decoracao visual e repeticoes.

Use exatamente esta estrutura:

PLANO DE AULA: ${input.title.toUpperCase()}

1. IDENTIFICACAO
Professor(a), escola, municipio, ano/turma, componente, data, duracao e tema.

2. OBJETIVOS
Objetivo geral em uma frase com verbo de acao.
Tres objetivos especificos mensuraveis.

3. HABILIDADES BNCC
Liste as habilidades selecionadas com codigo e aplicacao na aula.

4. CONTEUDOS
- Conceituais: 2 itens.
- Procedimentais: 2 itens.
- Atitudinais: 1 item.

5. METODOLOGIA
Dois paragrafos explicando como a metodologia sera aplicada, incluindo organizacao da turma, pensamento computacional e conexao com o municipio.

6. DESENVOLVIMENTO DA AULA
- Momento inicial: tempo, acao do professor, pergunta disparadora e como ativar conhecimentos previos.
- Desenvolvimento: passo a passo da atividade principal, papel dos estudantes, uso dos recursos, intervencoes do professor e adaptacao se houver poucos dispositivos.
- Encerramento: sintese, socializacao, registro final e encaminhamento para continuidade.

7. RECURSOS DIDATICOS
Lista objetiva dos recursos e como serao usados.

8. AVALIACAO
Avaliacao formativa, produto/evidencia final, 4 criterios observaveis e uma sugestao simples de autoavaliacao dos estudantes.

9. REFERENCIAS
BNCC e uma referencia complementar adequada.

Feche com: Plano elaborado com base na BNCC Computacao - Secretaria Municipal de Educacao.`
}

type OpenAiResponseContent = {
  type?: string
  text?: string
}

type OpenAiResponseOutput = {
  type?: string
  content?: OpenAiResponseContent[]
}

type OpenAiResponsePayload = {
  output_text?: string
  output?: OpenAiResponseOutput[]
}

type OpenAiCallOptions = {
  key: string
  model: string
  timeoutMs: number
  prompt: string
  maxTokens: number
  reasoningEffort: string
}

function envNumber(name: string, fallback: number): number {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function describeOpenAiError(err: unknown, timeoutMs: number): string {
  if (err instanceof Error && err.name === 'AbortError') {
    return `timeout / abortado apos ${timeoutMs}ms`
  }
  return err instanceof Error ? err.message : 'erro desconhecido'
}

function extractOpenAiText(payload: OpenAiResponsePayload): string {
  if (payload.output_text) {
    return payload.output_text.trim()
  }

  return (payload.output || [])
    .filter((item) => !item.type || item.type === 'message')
    .flatMap((item) => item.content || [])
    .map((content) => content.text || '')
    .filter(Boolean)
    .join('\n')
    .trim()
}

async function callOpenAiResponse(opts: OpenAiCallOptions): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs)
  const callStartTime = Date.now()

  console.log(`[IA-GERADOR] [openai] Modelo: "${opts.model}" | Timeout: ${opts.timeoutMs}ms`)

  try {
    const body: Record<string, unknown> = {
      model: opts.model,
      input: opts.prompt,
      max_output_tokens: opts.maxTokens,
      reasoning: { effort: opts.reasoningEffort },
      text: { verbosity: 'low' },
      store: false,
    }

    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${opts.key}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    const callDuration = Date.now() - callStartTime

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      const detail = errText ? ': ' + errText.slice(0, 300) : ''
      throw new Error(`[openai] Status ${res.status} apos ${callDuration}ms${detail}`)
    }

    const payload = (await res.json()) as OpenAiResponsePayload
    const content = extractOpenAiText(payload)

    if (!content) {
      throw new Error('[openai] Resposta vazia da API')
    }

    console.log(`[IA-GERADOR] [openai] Sucesso em ${callDuration}ms. Tamanho: ${content.length} caracteres.`)
    return content
  } catch (error) {
    const callDuration = Date.now() - callStartTime
    console.error(`[IA-GERADOR] [openai] Falhou apos ${callDuration}ms: ${describeOpenAiError(error, opts.timeoutMs)}`)
    throw error
  } finally {
    clearTimeout(timer)
  }
}

export async function generatePlanFromPrompt(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY || ''
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  const timeoutMs = envNumber('OPENAI_TIMEOUT_MS', 30000)
  const maxTokens = envNumber('OPENAI_MAX_OUTPUT_TOKENS', 4200)
  const reasoningEffort = process.env.OPENAI_REASONING_EFFORT || 'minimal'

  if (!apiKey) throw new Error('IA indisponível no momento. Tente novamente mais tarde.')

  return callOpenAiResponse({ key: apiKey, model, timeoutMs, prompt, maxTokens, reasoningEffort })
}

export async function generatePlanText(input: z.infer<typeof createPlanSchema>) {
  const prompt = await buildPlanPrompt(input)
  const totalStartTime = Date.now()
  const apiKey = process.env.OPENAI_API_KEY || ''
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  const timeoutMs = envNumber('OPENAI_TIMEOUT_MS', 30000)
  const maxTokens = envNumber('OPENAI_MAX_OUTPUT_TOKENS', 4200)
  const reasoningEffort = process.env.OPENAI_REASONING_EFFORT || 'minimal'

  const skills = await listSkills()
  const selected = skills.filter((skill) => input.skill_ids.includes(skill.id) || input.skill_ids.includes(skill.code))
  const date = input.date || new Date().toLocaleDateString('pt-BR')

  console.log('\n==================================================')
  console.log(`[IA-GERADOR] [${new Date().toISOString()}] Nova solicitacao de plano recebida.`)
  console.log(`[IA-GERADOR] Tema: "${input.title}" | Ano/Turma: "${input.grade_level}" | Componente: "${input.subject}"`)
  console.log(`[IA-GERADOR] Habilidades resolvidas: ${selected.map((skill) => skill.code).join(', ') || 'nenhuma'} (Total: ${selected.length})`)
  console.log(`[IA-GERADOR] Provedor: OpenAI | Modelo: ${model} | Timeout: ${timeoutMs}ms | Max output tokens: ${maxTokens} | Reasoning: ${reasoningEffort}`)
  console.log(`[IA-GERADOR] Chave OpenAI configurada? ${apiKey ? 'Sim' : 'Nao'}`)
  console.log('==================================================')

  if (apiKey) {
    try {
      const content = await callOpenAiResponse({
        key: apiKey,
        model,
        timeoutMs,
        prompt,
        maxTokens,
        reasoningEffort,
      })
      console.log(`[IA-GERADOR] Sucesso total via OpenAI/${model}. Tempo total: ${Date.now() - totalStartTime}ms.`)
      return content
    } catch {
      console.error(`[IA-GERADOR] OpenAI falhou apos ${Date.now() - totalStartTime}ms. Usando template local.`)
    }
  }

  const skillBlock = selected
    .map((skill) => `- [${skill.code}] ${skill.name}: ${skill.description}`)
    .join('\n')
  const teacherObjectives = (input.objectives || '').trim()
  const teacherMethodology = (input.methodology || '').trim()
  const teacherNotes = (input.notes || '').trim()

  return `PLANO DE AULA: ${input.title.toUpperCase()}

1. IDENTIFICACAO
Professor(a): ${input.teacher || 'Professor(a)'}
Escola: ${input.school || 'Escola Municipal'} | Municipio: rede municipal
Ano/Turma: ${input.grade_level} | Componente: ${input.subject}
Data: ${date} | Duracao: ${input.duration || '50 minutos'}
Tema: ${input.title}

2. OBJETIVOS
Objetivo geral: Desenvolver uma experiencia de aprendizagem alinhada a BNCC Computacao, conectando ${input.title} ao cotidiano dos estudantes do municipio.
Objetivos especificos:
- Relacionar o tema aos conhecimentos previos da turma.
- Aplicar procedimentos de investigacao, registro, colaboracao ou criacao digital.
- Produzir uma evidencia de aprendizagem individual ou coletiva.
- Exercitar atitudes de autoria, respeito e cidadania digital.

3. HABILIDADES BNCC
${skillBlock || 'Nenhuma habilidade encontrada.'}

4. CONTEUDOS
Conceituais:
- Conceitos centrais do componente ${input.subject} ligados ao tema.
- Cultura digital e pensamento computacional.
Procedimentais:
- Observacao, registro, organizacao e comunicacao de informacoes.
- Uso orientado dos recursos disponiveis.
Atitudinais:
- Colaboracao, respeito e responsabilidade no uso da tecnologia.

5. METODOLOGIA
${teacherMethodology || 'Metodologia ativa com mediacao do professor.'}

O professor inicia contextualizando o tema com exemplos proximos da realidade do municipio. Em seguida, organiza a turma em duplas ou grupos para uma atividade pratica, alternando orientacao coletiva, investigacao guiada e registro das descobertas.

6. DESENVOLVIMENTO DA AULA
Momento inicial: apresente o tema, escute hipoteses dos estudantes e registre no quadro as ideias principais. Retome as habilidades selecionadas em linguagem simples.

Desenvolvimento: proponha uma tarefa pratica com os recursos disponiveis. Os estudantes devem pesquisar, organizar informacoes, criar um produto simples ou resolver um desafio relacionado ao tema. Circule pela sala, faca perguntas, apoie grupos com mais dificuldade e incentive justificativas.

Encerramento: convide os grupos a compartilhar resultados. Sistematize o que foi aprendido, conecte com a BNCC Computacao e registre combinados para continuidade.

7. RECURSOS DIDATICOS
${input.materials || 'Quadro, caderno, celular ou computador compartilhado.'}

8. AVALIACAO
A avaliacao sera formativa, observando participacao, colaboracao, clareza do registro, relacao com as habilidades selecionadas e qualidade da evidencia produzida. Produto final: registro, apresentacao breve ou artefato criado pela turma. Criterios: participacao, pertinencia ao tema e uso responsavel da tecnologia.

9. REFERENCIAS
- BRASIL. Base Nacional Comum Curricular (BNCC). Brasilia: MEC, 2017.
- BNCC Computacao e documentos curriculares complementares.

OBJETIVOS DO PROFESSOR
${teacherObjectives || 'Nao informado - usar tema e habilidades BNCC como base.'}

OBSERVACOES
${teacherNotes || 'Plano gerado para uso e edicao pelo professor.'}

Plano elaborado com base na BNCC Computacao - Secretaria Municipal de Educacao.`
}
