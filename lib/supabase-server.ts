import { createClient, type User } from '@supabase/supabase-js'
import { ADMIN_ROLES, isAdminRole as isAdminRoleRule, isSameTenant } from '@/lib/authz-rules'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// ============================================================
// Papéis e contexto de autorização
// ------------------------------------------------------------
// REGRA CENTRAL: papel (role), bloqueio, município e escola vêm
// SEMPRE da tabela public.users (fonte de verdade no servidor),
// NUNCA de user.user_metadata (que o próprio usuário pode editar
// pelo client via supabase.auth.updateUser). Use requireUserContext
// para qualquer decisão de permissão.
// ============================================================

export type AppRole =
  | 'teacher'
  | 'aee_teacher'
  | 'coordinator'
  | 'family'
  | 'admin'
  | 'municipality_admin'
  | 'super_admin'

const VALID_ROLES: AppRole[] = [
  'teacher',
  'aee_teacher',
  'coordinator',
  'family',
  'admin',
  'municipality_admin',
  'super_admin',
]

export type UserContext = {
  userId: string
  email: string
  role: AppRole
  blocked: boolean
  municipalityId: string | null
  schoolId: string | null
  /** Nome da escola (texto) — ponte com plans.school / students.school_name. */
  school: string | null
  fullName: string
}

export function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase admin credentials are not configured')
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function getSupabaseAuthClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase auth credentials are not configured')
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export function getBearerToken(request: Request) {
  const authHeader = request.headers.get('authorization')
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
}

export async function getAuthenticatedUser(request: Request): Promise<User | null> {
  const token = getBearerToken(request)

  if (!token) {
    return null
  }

  const { data, error } = await getSupabaseAuthClient().auth.getUser(token)

  if (error || !data.user) {
    return null
  }

  return data.user
}

type ProfileSeed = {
  role?: string
  school?: string
}

export async function ensureUserProfile(
  user: User,
  municipalityId?: string,
  seed?: ProfileSeed,
) {
  const supabase = getSupabaseAdmin()
  const fullName =
    (user.user_metadata?.name as string | undefined) ||
    (user.user_metadata?.full_name as string | undefined) ||
    user.email ||
    'Professor(a)'

  const resolvedMuni =
    municipalityId || (user.user_metadata?.municipality_id as string | undefined)

  // O papel só é semeado a partir de uma fonte CONFIÁVEL (rota de cadastro
  // ou de criação por admin, validada no servidor). Nunca de user_metadata
  // em fluxos de login, para não permitir escalonamento por metadata forjado.
  const seededRole =
    seed?.role && VALID_ROLES.includes(seed.role as AppRole) ? seed.role : undefined
  const seededSchool = seed?.school?.trim() || undefined

  const { data: existingProfile, error: selectError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (selectError) {
    throw selectError
  }

  if (existingProfile) {
    // Backfill de campos ausentes, sem sobrescrever o que já existe.
    const patch: Record<string, unknown> = {}
    if (resolvedMuni && !existingProfile.municipality_id) patch.municipality_id = resolvedMuni
    if (seededSchool && !existingProfile.school_name) patch.school_name = seededSchool
    if (Object.keys(patch).length > 0) {
      await supabase.from('users').update(patch).eq('id', user.id)
      return { ...existingProfile, ...patch }
    }
    return existingProfile
  }

  const email = user.email || `${user.id}@local.invalid`
  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) || null

  // Insert canônico usando full_name (padronizado por supabase-migration-users-normalize.sql).
  const row: Record<string, unknown> = { id: user.id, email, full_name: fullName, avatar_url: avatarUrl }
  if (seededRole) row.role = seededRole
  if (seededSchool) row.school_name = seededSchool
  if (resolvedMuni) row.municipality_id = resolvedMuni

  const first = await supabase.from('users').insert(row).select().single()
  if (!first.error) return first.data

  // Único fallback para ambientes ainda não normalizados:
  //  - coluna legada `name` NOT NULL (23502) -> preenche `name`;
  //  - coluna `school_name` inexistente (PGRST204) -> remove-a.
  if (first.error.code === '23502' || first.error.code === 'PGRST204') {
    const retry: Record<string, unknown> = { ...row, name: fullName }
    if (first.error.code === 'PGRST204') delete retry.school_name
    const second = await supabase.from('users').insert(retry).select().single()
    if (!second.error) return second.data
    throw second.error
  }

  throw first.error
}

/**
 * Carrega o contexto de autorização REAL do usuário a partir do banco.
 * Lança 'UNAUTHORIZED' (sem token/token inválido) ou 'BLOCKED' (conta bloqueada).
 */
async function loadContext(request: Request): Promise<{ user: User; ctx: UserContext }> {
  const user = await getAuthenticatedUser(request)
  if (!user) {
    throw new Error('UNAUTHORIZED')
  }

  const profile = (await ensureUserProfile(user)) as Record<string, any>

  const email = user.email || String(profile.email || '')
  let role: AppRole = VALID_ROLES.includes(profile.role) ? (profile.role as AppRole) : 'teacher'

  // Bootstrap por email (contas de operação iniciais). NUNCA rebaixa papel.
  const adminEmail = process.env.ADMIN_EMAIL
  const superEmail = process.env.SUPER_ADMIN_EMAIL
  if (superEmail && email === superEmail) {
    role = 'super_admin'
  } else if (
    (email === 'admin@bncc.local' || (adminEmail && email === adminEmail)) &&
    !ADMIN_ROLES.includes(role)
  ) {
    role = 'admin'
  }

  const blocked = profile.blocked === true
  if (blocked) {
    throw new Error('BLOCKED')
  }

  const ctx: UserContext = {
    userId: user.id,
    email,
    role,
    blocked,
    municipalityId: (profile.municipality_id as string | null) || null,
    schoolId: (profile.school_id as string | null) || null,
    school: (profile.school_name as string | null) || null,
    fullName:
      (profile.full_name as string | undefined) ||
      (profile.name as string | undefined) ||
      email ||
      'Professor(a)',
  }

  return { user, ctx }
}

/**
 * Contexto de autorização confiável (papel/município/escola do banco).
 * Use este helper em QUALQUER rota que decida permissão.
 */
export async function requireUserContext(request: Request): Promise<UserContext> {
  const { ctx } = await loadContext(request)
  return ctx
}

/**
 * Retorna o usuário autenticado (objeto do Supabase Auth) e valida bloqueio
 * pela tabela users. Mantido por compatibilidade para rotas que só precisam
 * do id. Para decisões de papel/escopo, prefira requireUserContext.
 */
export async function requireAuthenticatedUser(request: Request) {
  const { user } = await loadContext(request)
  return user
}

export function isAdminRole(role: AppRole) {
  return isAdminRoleRule(role)
}

export async function requireAdminUser(request: Request): Promise<UserContext> {
  const ctx = await requireUserContext(request)
  if (!isAdminRole(ctx.role)) {
    throw new Error('FORBIDDEN')
  }
  return ctx
}

export async function requireSuperAdmin(request: Request): Promise<UserContext> {
  const ctx = await requireUserContext(request)
  if (ctx.role !== 'super_admin') {
    throw new Error('FORBIDDEN')
  }
  return ctx
}

/**
 * Garante que o recurso pertence ao mesmo município do usuário.
 * super_admin ignora a fronteira. Lança 'SCOPE_FORBIDDEN' caso contrário.
 */
export function assertSameTenant(
  resourceMunicipalityId: string | null | undefined,
  ctx: Pick<UserContext, 'role' | 'municipalityId'>,
) {
  if (!isSameTenant(resourceMunicipalityId, ctx)) {
    throw new Error('SCOPE_FORBIDDEN')
  }
}
