import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { ensureUserProfile, getSupabaseAdmin, getUserSchools, requireAuthenticatedUser } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const updateProfileSchema = z.object({
  full_name: z.string().trim().min(2).optional(),
  name: z.string().trim().min(2).optional(),
  bio: z.string().trim().max(500).nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  school_ids: z.array(z.string().uuid()).min(1).optional(),
})

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request)
    const profile = await ensureUserProfile(user)

    return NextResponse.json({ success: true, profile: { ...profile, schools: await getUserSchools(user.id, profile.municipality_id) } })
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
    const currentProfile = await ensureUserProfile(user)
    const values = updateProfileSchema.parse(await request.json())
    const supabase = getSupabaseAdmin()
    const updateValues = {
      ...values,
      full_name: values.full_name || values.name,
      updated_at: new Date().toISOString(),
    }
    delete (updateValues as { name?: string }).name
    let selectedSchools: Array<{ id: string; name: string }> = []
    if (values.school_ids) {
      const schoolIds = Array.from(new Set(values.school_ids))
      const { data: schools, error: schoolsError } = await supabase
        .from('schools').select('id, name, municipality_id').in('id', schoolIds)
      if (schoolsError) throw schoolsError
      if (!schools || schools.length !== schoolIds.length || schools.some((school) => school.municipality_id !== currentProfile.municipality_id)) {
        return NextResponse.json({ error: 'Selecione escolas válidas da sua rede.' }, { status: 400 })
      }
      selectedSchools = schoolIds.map((id) => schools.find((school) => school.id === id)!).filter(Boolean)
      ;(updateValues as Record<string, unknown>).school_id = selectedSchools[0].id
      ;(updateValues as Record<string, unknown>).school_name = selectedSchools[0].name
    }
    delete (updateValues as Record<string, unknown>).school_ids
    const { data, error } = await supabase
      .from('users')
      .update(updateValues)
      .eq('id', user.id)
      .select()
      .single()

    if (!error) {
      if (selectedSchools.length) {
        const linkResult = await supabase.from('user_schools').upsert(selectedSchools.map((school) => ({ user_id: user.id, school_id: school.id })), { onConflict: 'user_id,school_id' })
        if (linkResult.error) throw linkResult.error
        await supabase.from('user_schools').delete().eq('user_id', user.id).not('school_id', 'in', `(${selectedSchools.map((school) => school.id).join(',')})`)
      }
      return NextResponse.json({ success: true, profile: { ...data, schools: selectedSchools.length ? selectedSchools : await getUserSchools(user.id, data.municipality_id) } })
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
