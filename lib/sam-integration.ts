import { z } from 'zod'

export const samSubjectSchema = z.enum(['LP', 'MT'])
export const samGradeSchema = z.union([z.literal(5), z.literal(9)])
export const samDifficultySchema = z.enum(['facil', 'medio', 'dificil'])

export const samDraftQuestionSchema = z.object({
  subject: samSubjectSchema,
  grade: samGradeSchema,
  descriptor: z.string().trim().min(1).max(30),
  difficulty: samDifficultySchema,
  statement: z.string().trim().min(10).max(4000),
  options: z.tuple([
    z.string().trim().min(1).max(1000),
    z.string().trim().min(1).max(1000),
    z.string().trim().min(1).max(1000),
    z.string().trim().min(1).max(1000),
  ]).refine((options) => new Set(options.map((option) => option.toLowerCase())).size === 4, 'As alternativas devem ser diferentes'),
  answer: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(5).max(3000),
  teacherNote: z.string().trim().max(1500).optional().default(''),
  bnccCodes: z.array(z.string().trim().min(2).max(40)).max(20).default([]),
  sourceRef: z.string().trim().max(160).optional(),
})

export type SamDraftQuestion = z.infer<typeof samDraftQuestionSchema>

export function samCompatibility(subject: string, gradeLevel: string) {
  const normalized = subject.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const samSubject = normalized.includes('matemat') ? 'MT' : normalized.includes('portugues') || normalized.includes('lingua portuguesa') ? 'LP' : null
  const gradeMatch = gradeLevel.match(/(?:^|\D)(5|9)(?:\D|$)/)
  const grade = gradeMatch ? Number(gradeMatch[1]) : null
  return samSubject && (grade === 5 || grade === 9)
    ? { subject: samSubject as 'LP' | 'MT', grade: grade as 5 | 9 }
    : null
}

export function parseAiJson(value: string): unknown {
  const cleaned = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const firstArray = cleaned.indexOf('[')
  const lastArray = cleaned.lastIndexOf(']')
  if (firstArray < 0 || lastArray <= firstArray) throw new Error('A IA não retornou uma lista estruturada')
  return JSON.parse(cleaned.slice(firstArray, lastArray + 1))
}
