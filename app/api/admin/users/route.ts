import { NextResponse } from 'next/server'
import { requireAdminUser, getSupabaseAdmin } from '@/lib/supabase-server'
import { resolveMunicipality } from '@/lib/municipality'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const adminUser = await requireAdminUser(request)
    const isSuper = adminUser.user_metadata?.role === 'super_admin'
    const supabase = getSupabaseAdmin()
    const municipality = await resolveMunicipality(request)

    const { data: listData, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      throw authError
    }

    const authUsers = listData?.users ?? []

    let dbQuery = supabase.from('users').select('*')
    if (!isSuper && municipality) {
      dbQuery = dbQuery.eq('municipality_id', municipality.id)
    }
    const { data: dbProfiles } = await dbQuery

    const allowedIds = new Set((dbProfiles || []).map((p) => p.id))

    const mergedUsers = authUsers
      .filter((u) => isSuper || allowedIds.has(u.id))
      .map((authUser) => {
        const dbProfile = dbProfiles?.find((p) => p.id === authUser.id)
        return {
          id: authUser.id,
          email: authUser.email,
          full_name: dbProfile?.full_name || authUser.user_metadata?.name || '',
          role: authUser.user_metadata?.role || dbProfile?.role || 'teacher',
          school: authUser.user_metadata?.school || '',
          subject: dbProfile?.subject || authUser.user_metadata?.subject || '',
          blocked: authUser.user_metadata?.blocked === true,
          created_at: authUser.created_at,
          last_sign_in_at: authUser.last_sign_in_at || null,
          avatar_url: dbProfile?.avatar_url || null,
          points: dbProfile?.points || 0,
          municipality_id: dbProfile?.municipality_id || null,
        }
      })

    return NextResponse.json({ success: true, data: mergedUsers })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Login obrigatório' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'BLOCKED') {
      return NextResponse.json({ error: 'Conta bloqueada' }, { status: 403 })
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }
    console.error('Error in GET /api/admin/users:', error)
    return NextResponse.json({ error: 'Erro ao listar usuários' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdminUser(request)
    const supabase = getSupabaseAdmin()

    const body = await request.json()
    const { userId, email, password, role, blocked, school } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatePayload: Record<string, any> = {}

    if (email) {
      updatePayload.email = email
    }
    if (password) {
      updatePayload.password = password
    }

    const metadataUpdate: Record<string, unknown> = {}
    if (role !== undefined) metadataUpdate.role = role
    if (blocked !== undefined) metadataUpdate.blocked = blocked
    if (school !== undefined) metadataUpdate.school = school

    if (Object.keys(metadataUpdate).length > 0) {
      updatePayload.user_metadata = metadataUpdate
    }

    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      updatePayload,
    )

    if (updateError) {
      throw updateError
    }

    const validDbRoles = ['teacher', 'aee_teacher', 'coordinator', 'family', 'admin', 'super_admin']
    if (role && validDbRoles.includes(role)) {
      const { error: dbUpdateError } = await supabase.from('users').update({ role }).eq('id', userId)
      if (dbUpdateError) throw dbUpdateError
    }

    return NextResponse.json({ success: true, data: updatedUser })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Login obrigatório' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'BLOCKED') {
      return NextResponse.json({ error: 'Conta bloqueada' }, { status: 403 })
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }
    console.error('Error in PUT /api/admin/users:', error)
    return NextResponse.json({ error: 'Erro ao atualizar usuário' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdminUser(request)
    const supabase = getSupabaseAdmin()

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 })
    }

    await supabase.auth.admin.deleteUser(userId)
    await supabase.from('users').delete().eq('id', userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Login obrigatório' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'BLOCKED') {
      return NextResponse.json({ error: 'Conta bloqueada' }, { status: 403 })
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }
    console.error('Error in DELETE /api/admin/users:', error)
    return NextResponse.json({ error: 'Erro ao deletar usuário' }, { status: 500 })
  }
}
