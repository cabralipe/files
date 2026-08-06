import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { getSupabaseAdmin, requireUserContext } from '@/lib/supabase-server'
import { resolveMunicipality } from '@/lib/municipality'
import { canManageAeeStudents } from '@/lib/pei'
import { generateFamilyToken } from '@/lib/family-access'

export const dynamic = 'force-dynamic'

// Acesso da família por link: o AEE/coordenação gera o link (só o nome do
// responsável), a coordenação aprova, e só então ele funciona no portal
// público (sem email/senha).

const createSchema = z.object({
  student_id: z.string().uuid('Selecione um aluno válido'),
  responsible_name: z.string().trim().min(2, 'Informe o nome do responsável'),
  relationship: z.string().trim().min(2, 'Informe o parentesco (ex.: mãe, pai, avó)'),
})

const deleteSchema = z.object({
  link_id: z.string().uuid(),
})

async function loadScopedStudent(request: Request, studentId: string) {
  const ctx = await requireUserContext(request)
  if (!canManageAeeStudents(ctx.role)) {
    throw new Error('FORBIDDEN')
  }

  const supabase = getSupabaseAdmin()
  const { data: student, error } = await supabase
    .from('students')
    .select('id, full_name, school_id, school_name, municipality_id')
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
  if (['aee_teacher', 'coordinator'].includes(ctx.role)) {
    const sameSchool = ctx.schoolId && student.school_id
      ? ctx.schoolId === student.school_id
      : Boolean(ctx.school && student.school_name && ctx.school.trim().toLowerCase() === student.school_name.trim().toLowerCase())
    if (!sameSchool) throw new Error('FORBIDDEN')
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
      .from('family_access_links')
      .select('id, responsible_name, relationship, token, status, approved_at, created_at')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false })
    if (error) throw error

    return NextResponse.json({ success: true, data: links || [] })
  } catch (error) {
    return handleError(error, 'Erro ao listar acessos da família')
  }
}

export async function POST(request: Request) {
  try {
    const body = createSchema.parse(await request.json())
    const { ctx, student, supabase } = await loadScopedStudent(request, body.student_id)

    // school_id é o que a coordenação usa para encontrar o pedido na fila de
    // aprovação — sem ele o link nunca apareceria para ninguém aprovar.
    if (!student.school_id) {
      return NextResponse.json(
        { error: 'Este aluno não tem escola vinculada (school_id). Atualize o cadastro do aluno antes de gerar o link.' },
        { status: 422 },
      )
    }

    const token = generateFamilyToken()
    const { data: created, error } = await supabase
      .from('family_access_links')
      .insert({
        student_id: student.id,
        municipality_id: student.municipality_id,
        school_id: student.school_id,
        responsible_name: body.responsible_name,
        relationship: body.relationship,
        token,
        status: 'pending_approval',
        created_by: ctx.userId,
      })
      .select('id, token, status, created_at')
      .single()
    if (error) throw error

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    return handleError(error, 'Erro ao gerar o link da família')
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
      .from('family_access_links')
      .select('id, student_id')
      .eq('id', body.link_id)
      .maybeSingle()
    if (!link) return NextResponse.json({ error: 'Link não encontrado' }, { status: 404 })

    if (ctx.role !== 'super_admin') {
      const { data: student } = await supabase
        .from('students')
        .select('municipality_id, school_id, school_name')
        .eq('id', link.student_id)
        .maybeSingle()
      if (!student || student.municipality_id !== ctx.municipalityId) {
        return NextResponse.json({ error: 'Ação não permitida para o seu perfil' }, { status: 403 })
      }
      if (['aee_teacher', 'coordinator'].includes(ctx.role)) {
        const sameSchool = ctx.schoolId && student.school_id
          ? ctx.schoolId === student.school_id
          : Boolean(ctx.school && student.school_name && ctx.school.trim().toLowerCase() === student.school_name.trim().toLowerCase())
        if (!sameSchool) return NextResponse.json({ error: 'Ação não permitida para o seu perfil' }, { status: 403 })
      }
    }

    const { error } = await supabase
      .from('family_access_links')
      .update({ status: 'revoked', revoked_by: ctx.userId, revoked_at: new Date().toISOString() })
      .eq('id', body.link_id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleError(error, 'Erro ao revogar o link')
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
  console.error('[family/access-links]', error)
  return NextResponse.json({ error: fallback }, { status: 500 })
}
