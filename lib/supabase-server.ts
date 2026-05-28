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

export async function ensureUserProfile(user: User) {
  const supabase = getSupabaseAdmin()
  const fullName =
    (user.user_metadata?.name as string | undefined) ||
    (user.user_metadata?.full_name as string | undefined) ||
    user.email ||
    'Professor(a)'

  const { data: existingProfile, error: selectError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (selectError) {
    throw selectError
  }

  if (existingProfile) {
    return existingProfile
  }

  const { data, error } = await supabase
    .from('users')
    .insert({
      id: user.id,
      email: user.email || `${user.id}@local.invalid`,
      full_name: fullName,
      avatar_url: (user.user_metadata?.avatar_url as string | undefined) || null,
    })
    .select()
    .single()

  if (!error) {
    return data
  }

  if (error.code !== 'PGRST204') {
    throw error
  }

  const { data: fallbackData, error: fallbackError } = await supabase
    .from('users')
    .insert({
      id: user.id,
      email: user.email || `${user.id}@local.invalid`,
      name: fullName,
      avatar_url: (user.user_metadata?.avatar_url as string | undefined) || null,
      points: 0,
    })
    .select()
    .single()

  if (fallbackError) {
    throw fallbackError
  }

  return fallbackData
}

export async function requireAdminUser(request: Request) {
  const user = await requireAuthenticatedUser(request)
  const isAdmin =
    user.user_metadata?.role === 'admin' ||
    user.email === 'admin@bncc.local' ||
    user.email === process.env.ADMIN_EMAIL

  if (!isAdmin) {
    throw new Error('FORBIDDEN')
  }
  return user
}
