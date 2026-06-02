import { z } from 'zod'
import type { User } from '@supabase/supabase-js'

export const userRoleSchema = z.enum([
  'teacher',
  'aee_teacher',
  'coordinator',
  'family',
  'admin',
  'municipality_admin',
  'super_admin',
])

export type UserRole = z.infer<typeof userRoleSchema>

export const studentSchema = z.object({
  id: z.string().uuid().optional(),
  school_id: z.string().trim().optional().default(''),
  school_name: z.string().trim().min(2, 'Informe a escola'),
  full_name: z.string().trim().min(2, 'Informe o nome do aluno'),
  birth_date: z.string().trim().optional().default(''),
  grade_level: z.string().trim().min(1, 'Informe o ano/turma'),
  class_name: z.string().trim().optional().default(''),
  shift: z.enum(['manha', 'tarde', 'noite', 'integral']).optional().default('manha'),
  enrollment_number: z.string().trim().optional().default(''),
  active: z.boolean().optional().default(true),
})

export const studentAeeProfileSchema = z.object({
  student_id: z.string().uuid().optional(),
  public_target: z
    .enum(['deficiencia', 'tea', 'altas_habilidades_superdotacao', 'transtorno_global_desenvolvimento', 'outro'])
    .optional()
    .default('outro'),
  diagnosis_report: z.string().trim().optional().default(''),
  cid_or_notes: z.string().trim().optional().default(''),
  educational_needs: z.string().trim().optional().default(''),
  learning_barriers: z.array(z.string().trim()).optional().default([]),
  communication_profile: z.string().trim().optional().default(''),
  autonomy_profile: z.string().trim().optional().default(''),
  social_interaction: z.string().trim().optional().default(''),
  sensory_aspects: z.string().trim().optional().default(''),
  motor_aspects: z.string().trim().optional().default(''),
  cognitive_aspects: z.string().trim().optional().default(''),
  reading_writing_level: z.string().trim().optional().default(''),
  math_level: z.string().trim().optional().default(''),
  interests: z.array(z.string().trim()).optional().default([]),
  strengths: z.array(z.string().trim()).optional().default([]),
  difficulties: z.array(z.string().trim()).optional().default([]),
  accessibility_resources: z.array(z.string().trim()).optional().default([]),
  assistive_technology: z.array(z.string().trim()).optional().default([]),
  curricular_adaptations: z.array(z.string().trim()).optional().default([]),
  evaluation_adaptations: z.array(z.string().trim()).optional().default([]),
  family_notes: z.string().trim().optional().default(''),
  external_supports: z.string().trim().optional().default(''),
  medication_notes: z.string().trim().optional().default(''),
  emergency_notes: z.string().trim().optional().default(''),
  privacy_level: z.literal('restrito').optional().default('restrito'),
})

export const createStudentWithProfileSchema = z.object({
  student: studentSchema,
  profile: studentAeeProfileSchema.optional(),
})

export const generatePeiSchema = z.object({
  student_id: z.string().uuid('Selecione um aluno cadastrado'),
  portal: z.enum(['computacao', 'anos_iniciais', 'bncc_nacional']).default('computacao'),
  plan: z.record(z.unknown()),
  skills_context: z.string().trim().optional().default(''),
})

export type Student = z.infer<typeof studentSchema> & {
  id: string
  municipality_id: string
  created_by?: string
  created_at?: string
  updated_at?: string
}

export type StudentAeeProfile = z.infer<typeof studentAeeProfileSchema>

export function getUserRole(user: User): UserRole {
  const role = String(user.user_metadata?.role || 'teacher')
  return userRoleSchema.safeParse(role).success ? (role as UserRole) : 'teacher'
}

export function canManageAeeStudents(role: UserRole) {
  return ['aee_teacher', 'coordinator', 'admin', 'municipality_admin', 'super_admin'].includes(role)
}

export function canGeneratePei(role: UserRole) {
  return ['teacher', 'aee_teacher', 'coordinator', 'admin', 'municipality_admin', 'super_admin'].includes(role)
}

export function canValidatePei(role: UserRole) {
  return ['coordinator', 'admin', 'municipality_admin'].includes(role)
}

export function canFamilyAccessPei(role: UserRole) {
  return role === 'family'
}

function listBlock(items?: string[]) {
  return items?.length ? items.map((item) => `- ${item}`).join('\n') : '- Nao informado'
}

function field(value: unknown, fallback = 'Nao informado') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

export function buildPeiPrompt(input: {
  student: Record<string, unknown>
  profile: Record<string, unknown> | null
  plan: Record<string, unknown>
  skillsContext: string
  portal: string
}) {
  const { student, profile, plan, skillsContext, portal } = input
  const p = profile || {}

  return `Voce e especialista em educacao inclusiva, AEE, BNCC e planejamento educacional individualizado.
Gere um PEI pedagogico, acessivel e individualizado em portugues do Brasil.

LIMITES OBRIGATORIOS:
- Nao diagnosticar, nao sugerir laudo, nao inferir condicao clinica e nao substituir avaliacao profissional.
- Usar somente as informacoes registradas pela escola, professor AEE, professor regente e familia.
- Tratar medicacao, laudo, CID e acompanhamentos externos apenas como informacao declarada, quando houver.
- O texto deve apoiar a inclusao, a participacao, a autonomia, a acessibilidade e a aprendizagem.

BASE LEGAL/PEDAGOGICA:
- LDB: AEE gratuito e transversal, preferencialmente na rede regular.
- Lei Brasileira de Inclusao: sistema educacional inclusivo, aprendizado ao longo da vida e atendimento conforme caracteristicas, interesses e necessidades.
- Politica Nacional de Educacao Especial Inclusiva e diretrizes de AEE: apoio complementar ou suplementar, participacao da familia e eliminacao de barreiras.

DADOS DO PLANO:
- Portal de origem: ${portal}
- Tema: ${field(plan.title)}
- Professor(a) regente: ${field(plan.teacher)}
- Escola: ${field(plan.school || student.school_name)}
- Ano/Turma: ${field(plan.grade_level || student.grade_level)}
- Componente: ${field(plan.subject)}
- Data: ${field(plan.date)}
- Duracao: ${field(plan.duration)}
- Objetivos informados: ${field(plan.objectives)}
- Metodologia informada: ${field(plan.methodology)}
- Recursos disponiveis: ${field(plan.materials)}
- Observacoes do professor: ${field(plan.notes)}

HABILIDADES BNCC/REFERENCIAL:
${skillsContext || 'Nao informado'}

IDENTIFICACAO DO ESTUDANTE:
- Nome: ${field(student.full_name)}
- Ano/Turma: ${field(student.grade_level)}
- Turma: ${field(student.class_name)}
- Turno: ${field(student.shift)}
- Publico-alvo informado: ${field(p.public_target)}

FICHA AEE:
- Necessidades educacionais: ${field(p.educational_needs)}
- Barreiras de aprendizagem:
${listBlock(p.learning_barriers as string[] | undefined)}
- Comunicacao: ${field(p.communication_profile)}
- Autonomia: ${field(p.autonomy_profile)}
- Interacao social: ${field(p.social_interaction)}
- Aspectos sensoriais: ${field(p.sensory_aspects)}
- Aspectos motores: ${field(p.motor_aspects)}
- Aspectos cognitivos: ${field(p.cognitive_aspects)}
- Leitura/escrita: ${field(p.reading_writing_level)}
- Matematica: ${field(p.math_level)}
- Interesses:
${listBlock(p.interests as string[] | undefined)}
- Potencialidades:
${listBlock(p.strengths as string[] | undefined)}
- Dificuldades:
${listBlock(p.difficulties as string[] | undefined)}
- Recursos de acessibilidade:
${listBlock(p.accessibility_resources as string[] | undefined)}
- Tecnologia assistiva:
${listBlock(p.assistive_technology as string[] | undefined)}
- Adaptacoes curriculares:
${listBlock(p.curricular_adaptations as string[] | undefined)}
- Adaptacoes avaliativas:
${listBlock(p.evaluation_adaptations as string[] | undefined)}
- Observacoes da familia: ${field(p.family_notes)}
- Acompanhamentos externos informados: ${field(p.external_supports)}
- Medicacao informada espontaneamente: ${field(p.medication_notes)}

Gere o PEI com esta estrutura:

PEI - PLANO EDUCACIONAL INDIVIDUALIZADO

1. IDENTIFICACAO DO ESTUDANTE
2. CONTEXTO ESCOLAR
3. SINTESE DA FICHA AEE
4. POTENCIALIDADES DO ESTUDANTE
5. BARREIRAS IDENTIFICADAS
6. OBJETIVOS PEDAGOGICOS INDIVIDUALIZADOS
7. HABILIDADES BNCC/REFERENCIAL RELACIONADAS
8. ESTRATEGIAS DE ENSINO
9. RECURSOS DE ACESSIBILIDADE
10. TECNOLOGIA ASSISTIVA
11. ADAPTACOES CURRICULARES
12. ADAPTACOES DE AVALIACAO
13. FORMAS DE COMUNICACAO E PARTICIPACAO
14. ROTINA DE ACOMPANHAMENTO
15. RESPONSABILIDADES DO PROFESSOR REGENTE
16. RESPONSABILIDADES DO PROFESSOR AEE
17. PARTICIPACAO DA FAMILIA
18. CRITERIOS DE ACOMPANHAMENTO
19. REVISOES BIMESTRAIS
20. ASSINATURAS E CIENCIA

Escreva de forma objetiva, aplicavel pela escola e sem linguagem clinica indevida.`
}
