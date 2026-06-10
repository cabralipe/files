import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { ensureUserProfile, getSupabaseAdmin, requireAuthenticatedUser } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const updateProfileSchema = z.object({
  full_name: z.string().trim().min(2).optional(),
  name: z.string().trim().min(2).optional(),
  bio: z.string().trim().max(500).nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
})

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request)
    const profile = await ensureUserProfile(user)

    return NextResponse.json({ success: true, profile })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Login obrigatorio' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'BLOCKED') {
      return NextResponse.json({ error: 'Conta bloqueada' }, { status: 403 })
    }
    console.error('[GET /api/profile]', error)
    return NextResponse.json({ error: 'Erro ao obter perfil' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request)
    await ensureUserProfile(user)
    const values = updateProfileSchema.parse(await request.json())
    const supabase = getSupabaseAdmin()
    const updateValues = {
      ...values,
      full_name: values.full_name || values.name,
      updated_at: new Date().toISOString(),
    }
    delete (updateValues as { name?: string }).name
    const { data, error } = await supabase
      .from('users')
      .update(updateValues)
      .eq('id', user.id)
      .select()
      .single()

    if (!error) {
      return NextResponse.json({ success: true, profile: data })
    }

    if (error.code !== 'PGRST204') {
      throw error
    }

    const { data: fallbackData, error: fallbackError } = await supabase
      .from('users')
      .update({
        name: values.full_name || values.name,
        bio: values.bio,
        avatar_url: values.avatar_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single()

    if (fallbackError) {
      throw fallbackError
    }

    return NextResponse.json({ success: true, profile: fallbackData })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dados invalidos' }, { status: 400 })
    }

    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Login obrigatorio' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'BLOCKED') {
      return NextResponse.json({ error: 'Conta bloqueada' }, { status: 403 })
    }
    console.error('[PUT /api/profile]', error)
    return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 })
  }
}
