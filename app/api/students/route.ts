import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { getSupabaseAdmin, getUserSchools, requireUserContext } from '@/lib/supabase-server'
import { resolveMunicipality } from '@/lib/municipality'
import { canManageAeeStudents, createStudentWithProfileSchema } from '@/lib/pei'
import { canSeeSensitiveStudentData } from '@/lib/authz-rules'

export const dynamic = 'force-dynamic'

const MANAGER_ROLES = ['admin', 'municipality_admin', 'super_admin']

const STUDENT_FIELDS =
  'id, full_name, birth_date, grade_level, class_name, shift, enrollment_number, school_id, school_name, municipality_id, active, created_at, updated_at'

export async function GET(request: Request) {
  try {
    const ctx = await requireUserContext(request)

    // Município vem SEMPRE do contexto do usuário (banco), nunca do header do
    // cliente. Apenas super_admin pode inspecionar outro município explicitamente.
    let municipalityId = ctx.municipalityId
    if (ctx.role === 'super_admin') {
      const m = await resolveMunicipality(request)
      municipalityId = m?.id ?? null
    }
    if (!municipalityId && ctx.role !== 'super_admin') {
      return NextResponse.json({ error: 'Municipio nao identificado' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const canSeeSensitive = canSeeSensitiveStudentData(ctx.role)
    const isManager = MANAGER_ROLES.includes(ctx.role)

    // Família: apenas alunos vinculados à sua conta, sem ficha AEE.
    if (ctx.role === 'family') {
      const { data: links, error: linksError } = await supabase
        .from('family_student_links')
        .select('student_id')
        .eq('family_user_id', ctx.userId)
      if (linksError) throw linksError
      const ids = (links || []).map((l) => l.student_id).filter(Boolean)
      if (!ids.length) return NextResponse.json({ success: true, data: [] })
      const { data, error } = await supabase
        .from('students')
        .select(STUDENT_FIELDS)
        .in('id', ids)
        .order('full_name', { ascending: true })
      if (error) throw error
      return NextResponse.json({ success: true, data: data || [] })
    }

    const selectClause = canSeeSensitive ? `${STUDENT_FIELDS}, student_aee_profiles(*)` : STUDENT_FIELDS

    let query = supabase
      .from('students')
      .select(selectClause)
      .eq('active', true)
      .order('full_name', { ascending: true })

    if (municipalityId) query = query.eq('municipality_id', municipalityId)

    // Não-gestores ficam restritos à PRÓPRIA escola (do contexto, não do cliente).
    if (!isManager) {
      const memberships = await getUserSchools(ctx.userId, municipalityId)
      const requestedSchoolId = new URL(request.url).searchParams.get('school_id')
      const allowedSchoolIds = memberships.map((school) => school.id)
      const schoolId = requestedSchoolId && allowedSchoolIds.includes(requestedSchoolId)
        ? requestedSchoolId
        : (ctx.schoolId && allowedSchoolIds.includes(ctx.schoolId) ? ctx.schoolId : null)
      if (!schoolId && !ctx.school) {
        return NextResponse.json({ success: true, data: [] })
      }
      query = schoolId ? query.eq('school_id', schoolId) : query.eq('school_name', ctx.school)
    }

    const { data, error } = await query

    if (error) {
      // Se a relação student_aee_profiles não foi reconhecida pelo PostgREST,
      // refaz sem o join.
      if (error.message?.includes('student_aee_profiles') || error.code === 'PGRST200') {
        let fb = supabase
          .from('students')
          .select(STUDENT_FIELDS)
          .eq('active', true)
          .order('full_name', { ascending: true })
        if (municipalityId) fb = fb.eq('municipality_id', municipalityId)
        if (!isManager && ctx.schoolId) fb = fb.eq('school_id', ctx.schoolId)
        else if (!isManager && ctx.school) fb = fb.eq('school_name', ctx.school)
        const { data: fallback, error: fallbackError } = await fb
        if (fallbackError) throw fallbackError
        const withEmpty = (fallback || []).map((s) => ({ ...s, student_aee_profiles: [] }))
        return NextResponse.json({ success: true, data: withEmpty })
      }
      throw error
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    return handleStudentsError(error, 'Erro ao listar alunos')
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireUserContext(request)
    if (!canManageAeeStudents(ctx.role)) {
      return NextResponse.json(
        { error: 'Acesso restrito ao professor AEE, coordenacao ou administracao' },
        { status: 403 },
      )
    }

    let municipalityId = ctx.municipalityId
    if (ctx.role === 'super_admin') {
      const m = await resolveMunicipality(request)
      municipalityId = m?.id ?? municipalityId
    }
    if (!municipalityId) {
      return NextResponse.json({ error: 'Municipio nao identificado' }, { status: 400 })
    }

    const values = createStudentWithProfileSchema.parse(await request.json())
    const supabase = getSupabaseAdmin()
    const now = new Date().toISOString()

    if (!values.student.school_id) {
      return NextResponse.json({ error: 'Selecione uma escola cadastrada' }, { status: 400 })
    }
    const { data: selectedSchool, error: schoolError } = await supabase
      .from('schools')
      .select('id, name, municipality_id')
      .eq('id', values.student.school_id)
      .maybeSingle()
    if (schoolError) throw schoolError
    if (!selectedSchool || selectedSchool.municipality_id !== municipalityId) {
      return NextResponse.json({ error: 'Escola fora do município selecionado' }, { status: 403 })
    }

    // Não-gestores só cadastram/editam alunos da própria escola.
    if (!MANAGER_ROLES.includes(ctx.role) && ctx.schoolId && values.student.school_id !== ctx.schoolId) {
      return NextResponse.json({ error: 'Voce so pode cadastrar alunos da sua escola' }, { status: 403 })
    }
    if (!MANAGER_ROLES.includes(ctx.role) && !ctx.schoolId && ctx.school && values.student.school_name !== ctx.school) {
      return NextResponse.json({ error: 'Voce so pode cadastrar alunos da sua escola' }, { status: 403 })
    }

    const { school_id, ...studentFields } = values.student
    const studentRow: Record<string, unknown> = {
      ...studentFields,
      school_id,
      school_name: selectedSchool.name,
      municipality_id: municipalityId,
      created_by: ctx.userId,
      updated_at: now,
    }
    if (!studentRow.birth_date) studentRow.birth_date = null

    const { data: student, error: studentError } = await supabase
      .from('students')
      .upsert(studentRow)
      .select()
      .single()

    if (studentError) throw studentError

    let profile = null
    if (values.profile) {
      const { data, error } = await supabase
        .from('student_aee_profiles')
        .upsert(
          { ...values.profile, student_id: student.id, updated_by: ctx.userId, updated_at: now },
          { onConflict: 'student_id' },
        )
        .select()
        .single()
      if (error) throw error
      profile = data
    }

    return NextResponse.json(
      { success: true, data: { ...student, student_aee_profiles: profile ? [profile] : [] } },
      { status: 201 },
    )
  } catch (error) {
    return handleStudentsError(error, 'Erro ao salvar aluno')
  }
}

function handleStudentsError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message === 'UNAUTHORIZED') {
    return NextResponse.json({ error: 'Login obrigatorio' }, { status: 401 })
  }
  if (error instanceof Error && error.message === 'BLOCKED') {
    return NextResponse.json({ error: 'Conta bloqueada' }, { status: 403 })
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: error.issues[0]?.message || 'Dados invalidos' }, { status: 400 })
  }
  console.error('[api/students]', error)
  return NextResponse.json({ error: error instanceof Error ? error.message : fallback }, { status: 500 })
}
