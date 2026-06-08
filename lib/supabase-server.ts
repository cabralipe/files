import { createClient, type User } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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

export async function requireAuthenticatedUser(request: Request) {
  const user = await getAuthenticatedUser(request)

  if (!user) {
    throw new Error('UNAUTHORIZED')
  }

  if (user.user_metadata?.blocked === true) {
    throw new Error('BLOCKED')
  }

  return user
}

export async function ensureUserProfile(user: User, municipalityId?: string) {
  const supabase = getSupabaseAdmin()
  const fullName =
    (user.user_metadata?.name as string | undefined) ||
    (user.user_metadata?.full_name as string | undefined) ||
    user.email ||
    'Professor(a)'

  const resolvedMuni =
    municipalityId || (user.user_metadata?.municipality_id as string | undefined)

  const { data: existingProfile, error: selectError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (selectError) {
    throw selectError
  }

  if (existingProfile) {
    if (resolvedMuni && !existingProfile.municipality_id) {
      await supabase
        .from('users')
        .update({ municipality_id: resolvedMuni })
        .eq('id', user.id)
    }
    return existingProfile
  }

  const email = user.email || `${user.id}@local.invalid`
  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) || null

  // O schema de producao pode ter as colunas "name" (legada, NOT NULL) e/ou
  // "full_name". Para nao depender de qual existe, tentamos preencher AMBAS.
  // Se alguma coluna nao existir neste banco, o PostgREST retorna PGRST204 e
  // caimos para variacoes mais simples ate uma funcionar.
  const candidates: Array<Record<string, unknown>> = [
    { id: user.id, email, full_name: fullName, name: fullName, avatar_url: avatarUrl },
    { id: user.id, email, full_name: fullName, avatar_url: avatarUrl },
    { id: user.id, email, name: fullName, avatar_url: avatarUrl, points: 0 },
  ]
  if (resolvedMuni) {
    for (const candidate of candidates) candidate.municipality_id = resolvedMuni
  }

  let lastError: { code?: string; message?: string } | null = null
  for (const candidate of candidates) {
    const { data, error } = await supabase
      .from('users')
      .insert(candidate)
      .select()
      .single()

    if (!error) {
      return data
    }

    // PGRST204 = coluna inexistente neste schema; tenta a proxima variacao.
    // Qualquer outro erro e real (ex.: permissao, conexao) e deve interromper.
    if (error.code !== 'PGRST204') {
      throw error
    }
    lastError = error
  }

  throw lastError || new Error('Nao foi possivel criar o perfil do usuario')
}

export async function requireAdminUser(request: Request) {
  const user = await requireAuthenticatedUser(request)
  const isAdmin =
    user.user_metadata?.role === 'admin' ||
    user.user_metadata?.role === 'municipality_admin' ||
    user.user_metadata?.role === 'super_admin' ||
    user.email === 'admin@bncc.local' ||
    user.email === process.env.ADMIN_EMAIL

  if (!isAdmin) {
    throw new Error('FORBIDDEN')
  }
  return user
}

export async function requireSuperAdmin(request: Request) {
  const user = await requireAuthenticatedUser(request)
  const isSuper =
    user.user_metadata?.role === 'super_admin' ||
    user.email === process.env.SUPER_ADMIN_EMAIL

  if (!isSuper) {
    throw new Error('FORBIDDEN')
  }
  return user
}
