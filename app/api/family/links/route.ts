import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { getSupabaseAdmin, requireUserContext, ensureUserProfile } from '@/lib/supabase-server'
import { resolveMunicipality } from '@/lib/municipality'
import { canManageAeeStudents } from '@/lib/pei'

export const dynamic = 'force-dynamic'

// Vínculo família↔aluno: a porta de entrada do papel "family".
// AEE/coordenação cadastram o responsável (criando a conta se preciso) e o
// vinculam ao aluno; a partir daí a família consulta e dá ciência no painel.

const createSchema = z.object({
  student_id: z.string().uuid('Selecione um aluno válido'),
  email: z.string().trim().toLowerCase().email('Informe um email válido'),
  name: z.string().trim().min(2, 'Informe o nome do responsável'),
  relationship: z.string().trim().min(2, 'Informe o parentesco (ex.: mãe, pai, avó)'),
})

const deleteSchema = z.object({
  link_id: z.string().uuid(),
})

function tempPassword() {
  // 12 caracteres legíveis (sem 0/O/1/l) para entregar em mãos à família.
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let out = ''
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  for (const b of bytes) out += alphabet[b % alphabet.length]
  return out
}

async function loadScopedStudent(request: Request, studentId: string) {
  const ctx = await requireUserContext(request)
  if (!canManageAeeStudents(ctx.role)) {
    throw new Error('FORBIDDEN')
  }

  const supabase = getSupabaseAdmin()
  const { data: student, error } = await supabase
    .from('students')
    .select('id, full_name, school_name, municipality_id')
    .eq('id', studentId)
    .maybeSingle()
  if (error) throw error
  if (!student) throw new Error('NOT_FOUND')

  let municipalityId = ctx.municipalityId
  if (!municipalityId && ctx.role === 'super_admin') {
    municipalityId = (await resolveMunicipality(request))?.id ?? null
  }
  if (ctx.role !== 'super_admin' && student.municipality_id !== municipalityId) {
    throw new Error('FORBIDDEN')
  }

  return { ctx, student, supabase }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('student_id') || ''
    if (!studentId) {
      return NextResponse.json({ error: 'Informe o aluno (student_id)' }, { status: 400 })
    }
    const { student, supabase } = await loadScopedStudent(request, studentId)

    const { data: links, error } = await supabase
      .from('family_student_links')
      .select('id, family_user_id, relationship, created_at')
      .eq('student_id', student.id)
      .order('created_at', { ascending: true })
    if (error) throw error

    // Enriquecer com nome/email do responsável.
    const ids = (links || []).map((l) => l.family_user_id).filter(Boolean)
    let profiles: Record<string, { name: string; email: string }> = {}
    if (ids.length) {
      const { data: users } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', ids)
      profiles = Object.fromEntries((users || []).map((u) => [u.id, { name: u.name || '', email: u.email || '' }]))
    }

    return NextResponse.json({
      success: true,
      data: (links || []).map((l) => ({
        id: l.id,
        relationship: l.relationship || '',
        created_at: l.created_at,
        name: profiles[l.family_user_id]?.name || '',
        email: profiles[l.family_user_id]?.email || '',
      })),
    })
  } catch (error) {
    return handleError(error, 'Erro ao listar responsáveis')
  }
}

export async function POST(request: Request) {
  try {
    const body = createSchema.parse(await request.json())
    const { student, supabase } = await loadScopedStudent(request, body.student_id)

    // 1) Conta do responsável: reutiliza se o email já existir; senão cria.
    let familyUserId = ''
    let temp: string | null = null

    const { data: existing } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', body.email)
      .maybeSingle()

    if (existing) {
      if (existing.role !== 'family') {
        return NextResponse.json(
          { error: 'Este email pertence a uma conta da equipe escolar. Use um email pessoal do responsável.' },
          { status: 409 },
        )
      }
      familyUserId = existing.id
    } else {
      temp = tempPassword()
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email: body.email,
        password: temp,
        email_confirm: true,
        user_metadata: { name: body.name, role: 'family' },
      })
      if (createError || !created.user) {
        throw createError || new Error('Erro ao criar a conta do responsável')
      }
      familyUserId = created.user.id
      // Linha na tabela users (fonte de verdade) com papel family.
      await ensureUserProfile(created.user, student.municipality_id, {
        role: 'family',
        school: student.school_name || undefined,
      })
    }

    // 2) Vínculo (idempotente: não duplica).
    const { data: dup } = await supabase
      .from('family_student_links')
      .select('id')
      .eq('family_user_id', familyUserId)
      .eq('student_id', student.id)
      .maybeSingle()

    if (!dup) {
      const { error: linkError } = await supabase.from('family_student_links').insert({
        family_user_id: familyUserId,
        student_id: student.id,
        relationship: body.relationship,
      })
      if (linkError) throw linkError
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          student_name: student.full_name,
          email: body.email,
          already_linked: Boolean(dup),
          // Senha provisória aparece UMA única vez, para entrega em mãos.
          temp_password: temp,
        },
      },
      { status: dup ? 200 : 201 },
    )
  } catch (error) {
    return handleError(error, 'Erro ao vincular responsável')
  }
}

export async function DELETE(request: Request) {
  try {
    const body = deleteSchema.parse(await request.json())
    const ctx = await requireUserContext(request)
    if (!canManageAeeStudents(ctx.role)) {
      return NextResponse.json({ error: 'Ação não permitida para o seu perfil' }, { status: 403 })
    }

    const supabase = getSupabaseAdmin()
    const { data: link } = await supabase
      .from('family_student_links')
      .select('id, student_id')
      .eq('id', body.link_id)
      .maybeSingle()
    if (!link) return NextResponse.json({ error: 'Vínculo não encontrado' }, { status: 404 })

    // Escopo: o aluno do vínculo precisa ser do município de quem remove.
    if (ctx.role !== 'super_admin') {
      const { data: student } = await supabase
        .from('students')
        .select('municipality_id')
        .eq('id', link.student_id)
        .maybeSingle()
      if (!student || student.municipality_id !== ctx.municipalityId) {
        return NextResponse.json({ error: 'Ação não permitida para o seu perfil' }, { status: 403 })
      }
    }

    const { error } = await supabase.from('family_student_links').delete().eq('id', body.link_id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleError(error, 'Erro ao remover vínculo')
  }
}

function handleError(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: error.issues[0]?.message || 'Dados inválidos' }, { status: 400 })
  }
  if (error instanceof Error) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Login obrigatório' }, { status: 401 })
    if (error.message === 'BLOCKED') return NextResponse.json({ error: 'Conta bloqueada' }, { status: 403 })
    if (error.message === 'FORBIDDEN') return NextResponse.json({ error: 'Ação não permitida para o seu perfil' }, { status: 403 })
    if (error.message === 'NOT_FOUND') return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 })
  }
  console.error('[family/links]', error)
  return NextResponse.json({ error: fallback }, { status: 500 })
}
