// Regras de autorização PURAS (sem I/O, sem env, sem Supabase).
// Centralizadas aqui para: (1) evitar divergência entre rotas e (2) permitir
// testes unitários determinísticos (ver lib/authz-rules.test.ts).

export type Role = string

export const ALL_ROLES = [
  'teacher',
  'aee_teacher',
  'coordinator',
  'family',
  'admin',
  'municipality_admin',
  'super_admin',
] as const

export type AppRole = typeof ALL_ROLES[number]

export type RolePermissions = {
  manageAeeStudents: boolean
  generatePei: boolean
  generatePaee: boolean
  reviewSchoolPlans: boolean
  manageMunicipality: boolean
  managePlatform: boolean
}

export const ADMIN_ROLES = ['admin', 'municipality_admin', 'super_admin']

// Papéis que podem ver a ficha AEE completa (diagnóstico/CID/barreiras).
export const SENSITIVE_STUDENT_ROLES = [
  'aee_teacher',
  'coordinator',
  'admin',
  'municipality_admin',
  'super_admin',
]

// Papéis que um municipality_admin pode ATRIBUIR (nunca admin/super_admin).
const MUNICIPALITY_ADMIN_ASSIGNABLE = [
  'teacher',
  'aee_teacher',
  'coordinator',
]

export function isValidRole(role: string): boolean {
  return (ALL_ROLES as readonly string[]).includes(role)
}

export function isAdminRole(role: Role): boolean {
  return ADMIN_ROLES.includes(role)
}

export function getRolePermissions(role: Role): RolePermissions {
  const manager = isAdminRole(role)
  return {
    manageAeeStudents: ['aee_teacher', 'coordinator'].includes(role) || manager,
    generatePei: ['teacher', 'aee_teacher', 'coordinator'].includes(role) || manager,
    generatePaee: ['aee_teacher', 'coordinator'].includes(role) || manager,
    reviewSchoolPlans: role === 'coordinator' || manager,
    manageMunicipality: manager,
    managePlatform: role === 'super_admin',
  }
}

export function canSeeSensitiveStudentData(role: Role): boolean {
  return SENSITIVE_STUDENT_ROLES.includes(role)
}

/** Quem executa `actorRole` pode atribuir `targetRole`? */
export function canAssignRole(actorRole: Role, targetRole: string): boolean {
  if (targetRole === 'family') return false
  if (actorRole === 'super_admin') return isValidRole(targetRole)
  if (actorRole === 'admin' || actorRole === 'municipality_admin') {
    return MUNICIPALITY_ADMIN_ASSIGNABLE.includes(targetRole)
  }
  return false
}

/** Recurso pertence ao mesmo município do usuário? super_admin ignora a fronteira. */
export function isSameTenant(
  resourceMunicipalityId: string | null | undefined,
  ctx: { role: Role; municipalityId: string | null },
): boolean {
  if (ctx.role === 'super_admin') return true
  return Boolean(
    ctx.municipalityId && resourceMunicipalityId && ctx.municipalityId === resourceMunicipalityId,
  )
}

export function sameSchool(a: string | null, b: string | null): boolean {
  return Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase())
}

export type PlanActor = {
  role: Role
  userId: string
  municipalityId: string | null
  school: string | null
  schoolId?: string | null
}

export type PlanInfo = {
  userId: string
  municipalityId: string | null
  school: string
  schoolId?: string | null
  isPei: boolean
  isPaee: boolean
}

/** Pode EDITAR o plano? (dono, equipe da mesma escola, ou gestão — mesmo tenant) */
export function canEditPlan(ctx: PlanActor, plan: PlanInfo): boolean {
  if (!isSameTenant(plan.municipalityId, ctx)) return false
  if (plan.userId === ctx.userId) return true
  if ((ctx.role === 'coordinator' || ctx.role === 'aee_teacher') && sameSchoolScope(ctx, plan)) {
    return true
  }
  return isAdminRole(ctx.role)
}

/**
 * Pode EXCLUIR o plano? PEI/PAEE são documentos sensíveis do aluno: só
 * coordenação/AEE (mesma escola) ou gestão — nem o professor autor.
 */
export function canDeletePlan(ctx: PlanActor, plan: PlanInfo): boolean {
  if (!isSameTenant(plan.municipalityId, ctx)) return false
  if (plan.isPei || plan.isPaee) {
    return (
      isAdminRole(ctx.role) ||
      ((ctx.role === 'coordinator' || ctx.role === 'aee_teacher') && sameSchoolScope(ctx, plan))
    )
  }
  if (plan.userId === ctx.userId) return true
  if (ctx.role === 'coordinator' && sameSchoolScope(ctx, plan)) return true
  return isAdminRole(ctx.role)
}

function sameSchoolScope(ctx: PlanActor, plan: PlanInfo) {
  if (ctx.schoolId && plan.schoolId) return ctx.schoolId === plan.schoolId
  return sameSchool(ctx.school, plan.school)
}
