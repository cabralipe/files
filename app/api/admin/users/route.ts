import { NextResponse } from 'next/server'
import { requireAdminUser, getSupabaseAdmin } from '@/lib/supabase-server'
import { canAssignRole, isValidRole } from '@/lib/authz-rules'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const ctx = await requireAdminUser(request)
    const isSuper = ctx.role === 'super_admin'
    const supabase = getSupabaseAdmin()

    const { data: listData, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) throw authError
    const authUsers = listData?.users ?? []

    // Escopo por município vem do CONTEXTO (banco), não do header do cliente.
    let dbQuery = supabase.from('users').select('*')
    if (!isSuper) {
      if (!ctx.municipalityId) {
        return NextResponse.json({ success: true, data: [] })
      }
      dbQuery = dbQuery.eq('municipality_id', ctx.municipalityId)
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
          name: dbProfile?.full_name || authUser.user_metadata?.name || '',
          full_name: dbProfile?.full_name || authUser.user_metadata?.name || '',
          // Papel/bloqueio: fonte de verdade é a tabela users.
          role: dbProfile?.role || 'teacher',
          school_id: dbProfile?.school_id || null,
          school: dbProfile?.school_name || authUser.user_metadata?.school || '',
          subject: dbProfile?.subject || authUser.user_metadata?.subject || '',
          blocked: dbProfile?.blocked === true,
          created_at: authUser.created_at,
          last_sign_in_at: authUser.last_sign_in_at || null,
          avatar_url: dbProfile?.avatar_url || null,
          points: dbProfile?.points || 0,
          municipality_id: dbProfile?.municipality_id || null,
        }
      })

    return NextResponse.json({ success: true, data: mergedUsers })
  } catch (error) {
    return handleAdminUsersError(error, 'Erro ao listar usuários')
  }
}

export async function PUT(request: Request) {
  try {
    const ctx = await requireAdminUser(request)
    const supabase = getSupabaseAdmin()

    const body = await request.json()
    const { userId, email, password, role, blocked, school } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 })
    }

    // Carrega o alvo pela tabela de perfis (fonte de verdade).
    const { data: target } = await supabase
      .from('users')
      .select('id, role, municipality_id')
      .eq('id', userId)
      .maybeSingle()

    if (!target) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Fora do município: bloqueado para não-super.
    if (ctx.role !== 'super_admin' && target.municipality_id !== ctx.municipalityId) {
      return NextResponse.json({ error: 'Usuário fora do seu município' }, { status: 403 })
    }

    // Ninguém abaixo de super_admin pode alterar (senha/papel/bloqueio) um super_admin ou admin.
    const targetRole = String(target.role || 'teacher')
    if (ctx.role !== 'super_admin' && (targetRole === 'super_admin' || targetRole === 'admin')) {
      return NextResponse.json({ error: 'Sem permissão sobre este usuário' }, { status: 403 })
    }

    // Atribuição de papel: municipality_admin não pode promover a admin/super_admin.
    if (role !== undefined && !canAssignRole(ctx.role, role)) {
      return NextResponse.json({ error: 'Você não pode atribuir esse papel' }, { status: 403 })
    }

    const updatePayload: Record<string, unknown> = {}
    if (email) updatePayload.email = email
    if (password) updatePayload.password = password

    // Espelha em user_metadata (exibição legada), mas a AUTORIDADE é users.
    const metadataUpdate: Record<string, unknown> = {}
    if (role !== undefined) metadataUpdate.role = role
    if (blocked !== undefined) metadataUpdate.blocked = blocked
    if (school !== undefined) metadataUpdate.school = school
    if (Object.keys(metadataUpdate).length > 0) {
      updatePayload.user_metadata = metadataUpdate
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, updatePayload)
      if (updateError) throw updateError
    }

    // Fonte de verdade: tabela users.
    const dbUpdate: Record<string, unknown> = {}
    if (role !== undefined && isValidRole(role)) dbUpdate.role = role
    if (blocked !== undefined) dbUpdate.blocked = blocked === true
    if (school !== undefined) dbUpdate.school_name = school
    if (Object.keys(dbUpdate).length > 0) {
      const { error: dbUpdateError } = await supabase.from('users').update(dbUpdate).eq('id', userId)
      if (dbUpdateError) throw dbUpdateError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleAdminUsersError(error, 'Erro ao atualizar usuário')
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await requireAdminUser(request)
    const supabase = getSupabaseAdmin()

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 })
    }
    if (userId === ctx.userId) {
      return NextResponse.json({ error: 'Você não pode excluir sua própria conta' }, { status: 409 })
    }

    const { data: target } = await supabase
      .from('users')
      .select('id, role, municipality_id')
      .eq('id', userId)
      .maybeSingle()

    if (!target) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }
    if (ctx.role !== 'super_admin' && target.municipality_id !== ctx.municipalityId) {
      return NextResponse.json({ error: 'Usuário fora do seu município' }, { status: 403 })
    }
    const targetRole = String(target.role || 'teacher')
    if (ctx.role !== 'super_admin' && (targetRole === 'super_admin' || targetRole === 'admin')) {
      return NextResponse.json({ error: 'Sem permissão sobre este usuário' }, { status: 403 })
    }

    await supabase.auth.admin.deleteUser(userId)
    await supabase.from('users').delete().eq('id', userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleAdminUsersError(error, 'Erro ao deletar usuário')
  }
}

function handleAdminUsersError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message === 'UNAUTHORIZED') {
    return NextResponse.json({ error: 'Login obrigatório' }, { status: 401 })
  }
  if (error instanceof Error && error.message === 'BLOCKED') {
    return NextResponse.json({ error: 'Conta bloqueada' }, { status: 403 })
  }
  if (error instanceof Error && error.message === 'FORBIDDEN') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }
  console.error('[api/admin/users]', error)
  return NextResponse.json({ error: fallback }, { status: 500 })
}
