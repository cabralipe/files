import { NextResponse } from 'next/server'
import { requireAdminUser, getSupabaseAdmin, ensureUserProfile } from '@/lib/supabase-server'
import { canAssignRole, isValidRole } from '@/lib/authz-rules'
import { z, ZodError } from 'zod'

export const dynamic = 'force-dynamic'

const createAeeSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome'),
  email: z.string().trim().toLowerCase().email('Informe um email válido'),
  school_id: z.string().uuid('Selecione uma escola'),
})

function temporaryPassword() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const bytes = new Uint8Array(14)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('')
}

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

export async function POST(request: Request) {
  try {
    const ctx = await requireAdminUser(request)
    const values = createAeeSchema.parse(await request.json())
    if (!ctx.municipalityId && ctx.role !== 'super_admin') {
      return NextResponse.json({ error: 'Município não identificado' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id, name, municipality_id')
      .eq('id', values.school_id)
      .maybeSingle()
    if (schoolError) throw schoolError
    if (!school || (ctx.role !== 'super_admin' && school.municipality_id !== ctx.municipalityId)) {
      return NextResponse.json({ error: 'Escola fora do seu município' }, { status: 403 })
    }

    const password = temporaryPassword()
    const role = 'aee_teacher' as const
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: values.email,
      password,
      email_confirm: true,
      user_metadata: { name: values.name, school: school.name },
      app_metadata: { role, municipality_id: school.municipality_id, school_id: school.id, must_change_password: true },
    })
    if (createError || !created.user) {
      if (createError?.message?.toLowerCase().includes('already')) {
        return NextResponse.json({ error: 'Este email já possui cadastro.' }, { status: 409 })
      }
      throw createError || new Error('Erro ao criar professor AEE')
    }

    try {
      await ensureUserProfile(created.user, school.municipality_id, {
        role,
        school: school.name,
        schoolId: school.id,
        mustChangePassword: true,
      })
      const { error: linkError } = await supabase.from('user_municipalities').upsert(
        { user_id: created.user.id, municipality_id: school.municipality_id, role },
        { onConflict: 'user_id,municipality_id' },
      )
      if (linkError) throw linkError
      const { error: auditError } = await supabase.from('user_role_audit').insert({
        target_user_id: created.user.id,
        actor_user_id: ctx.userId,
        municipality_id: school.municipality_id,
        previous_role: null,
        new_role: role,
        previous_school_id: null,
        new_school_id: school.id,
        action: 'created',
      })
      if (auditError) throw auditError
    } catch (profileError) {
      await supabase.auth.admin.deleteUser(created.user.id)
      throw profileError
    }

    return NextResponse.json({
      success: true,
      data: { id: created.user.id, email: values.email, name: values.name, role, school_id: school.id, school: school.name },
      temporary_password: password,
    }, { status: 201 })
  } catch (error) {
    return handleAdminUsersError(error, 'Erro ao criar professor AEE')
  }
}

export async function PUT(request: Request) {
  try {
    const ctx = await requireAdminUser(request)
    const supabase = getSupabaseAdmin()

    const body = await request.json()
    const { userId, email, password, role, blocked, school_id, backfill_legacy_plans } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 })
    }

    // Carrega o alvo pela tabela de perfis (fonte de verdade).
    const { data: target } = await supabase
      .from('users')
      .select('id, role, municipality_id, school_id, blocked')
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
    if (ctx.role !== 'super_admin' && ['super_admin', 'admin', 'municipality_admin'].includes(targetRole)) {
      return NextResponse.json({ error: 'Sem permissão sobre este usuário' }, { status: 403 })
    }

    if (targetRole === 'family' && role !== undefined && role !== 'family') {
      return NextResponse.json({ error: 'O perfil Família é gerenciado exclusivamente pelo vínculo com o aluno' }, { status: 409 })
    }

    // Atribuição de papel: municipality_admin não pode promover a admin/super_admin.
    if (role !== undefined && role !== targetRole && !canAssignRole(ctx.role, role)) {
      return NextResponse.json({ error: 'Você não pode atribuir esse papel' }, { status: 403 })
    }

    let schoolName: string | undefined
    if (school_id !== undefined) {
      const { data: school } = await supabase
        .from('schools')
        .select('id, name, municipality_id')
        .eq('id', school_id)
        .maybeSingle()
      if (!school || (ctx.role !== 'super_admin' && school.municipality_id !== ctx.municipalityId)) {
        return NextResponse.json({ error: 'Escola fora do seu município' }, { status: 403 })
      }
      schoolName = school.name
    }

    const effectiveRole = role !== undefined ? role : targetRole
    const effectiveSchoolId = school_id !== undefined ? school_id : target.school_id
    if (['teacher', 'aee_teacher', 'coordinator'].includes(effectiveRole) && !effectiveSchoolId) {
      return NextResponse.json({ error: 'Selecione uma escola para este perfil' }, { status: 400 })
    }

    const { data: authTarget, error: authTargetError } = await supabase.auth.admin.getUserById(userId)
    if (authTargetError) throw authTargetError

    const updatePayload: Record<string, unknown> = {}
    if (email) updatePayload.email = email
    if (password) updatePayload.password = password

    // Espelha em user_metadata (exibição legada), mas a AUTORIDADE é users.
    const metadataUpdate: Record<string, unknown> = {}
    if (schoolName !== undefined) metadataUpdate.school = schoolName
    if (Object.keys(metadataUpdate).length > 0) {
      updatePayload.user_metadata = { ...(authTarget.user.user_metadata || {}), ...metadataUpdate }
    }
    if (role !== undefined || school_id !== undefined || blocked !== undefined || password) {
      updatePayload.app_metadata = {
        ...(authTarget.user.app_metadata || {}),
        role: role !== undefined ? role : targetRole,
        municipality_id: target.municipality_id,
        school_id: school_id !== undefined ? school_id : target.school_id,
        blocked: blocked !== undefined ? blocked === true : target.blocked === true,
        must_change_password: password ? true : authTarget.user.app_metadata?.must_change_password === true,
      }
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, updatePayload)
      if (updateError) throw updateError
    }

    // Fonte de verdade: tabela users.
    const dbUpdate: Record<string, unknown> = {}
    if (email) dbUpdate.email = email
    if (role !== undefined && isValidRole(role)) dbUpdate.role = role
    if (blocked !== undefined) dbUpdate.blocked = blocked === true
    if (school_id !== undefined) dbUpdate.school_id = school_id
    if (schoolName !== undefined) dbUpdate.school_name = schoolName
    if (password) dbUpdate.must_change_password = true
    if (Object.keys(dbUpdate).length > 0) {
      const { error: dbUpdateError } = await supabase.from('users').update(dbUpdate).eq('id', userId)
      if (dbUpdateError) throw dbUpdateError
    }

    if (role !== undefined && role !== targetRole) {
      const { error: municipalityRoleError } = await supabase.from('user_municipalities').upsert(
        { user_id: userId, municipality_id: target.municipality_id, role },
        { onConflict: 'user_id,municipality_id' },
      )
      if (municipalityRoleError) throw municipalityRoleError
    }

    if (backfill_legacy_plans === true && school_id && !target.school_id) {
      const { error: plansError } = await supabase
        .from('plans')
        .update({ school_id, school: schoolName })
        .eq('user_id', userId)
        .is('school_id', null)
      if (plansError) throw plansError
      const { error: experienceError } = await supabase
        .from('successful_experiences')
        .update({ school_id })
        .eq('user_id', userId)
        .is('school_id', null)
      if (experienceError) throw experienceError
    }

    const auditRows: Record<string, unknown>[] = []
    const auditBase = {
      target_user_id: userId,
      actor_user_id: ctx.userId,
      municipality_id: target.municipality_id,
      previous_role: targetRole,
      new_role: role !== undefined ? role : targetRole,
      previous_school_id: target.school_id,
      new_school_id: school_id !== undefined ? school_id : target.school_id,
    }
    if (role !== undefined && role !== targetRole) auditRows.push({ ...auditBase, action: 'role_changed' })
    if (school_id !== undefined && school_id !== target.school_id) auditRows.push({ ...auditBase, action: 'school_changed' })
    if (blocked !== undefined && (blocked === true) !== (target.blocked === true)) {
      auditRows.push({ ...auditBase, action: blocked ? 'blocked' : 'unblocked' })
    }
    if (auditRows.length) {
      const { error: auditError } = await supabase.from('user_role_audit').insert(auditRows)
      if (auditError) throw auditError
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
    if (ctx.role !== 'super_admin' && ['super_admin', 'admin', 'municipality_admin'].includes(targetRole)) {
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
  if (error instanceof ZodError) {
    return NextResponse.json({ error: error.issues[0]?.message || 'Dados inválidos' }, { status: 400 })
  }
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
