import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { requireAuthenticatedUser, getSupabaseAdmin } from '@/lib/supabase-server'
import { resolveMunicipality, getMunicipalityById } from '@/lib/municipality'
import { canManageAeeStudents, createStudentWithProfileSchema, getUserRole } from '@/lib/pei'

export const dynamic = 'force-dynamic'

async function resolveUserMunicipality(request: Request, user: Awaited<ReturnType<typeof requireAuthenticatedUser>>) {
  const fromRequest = await resolveMunicipality(request)
  if (fromRequest) return fromRequest
  const metadataMunicipalityId = user.user_metadata?.municipality_id
  return typeof metadataMunicipalityId === 'string' ? getMunicipalityById(metadataMunicipalityId) : null
}

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request)
    const municipality = await resolveUserMunicipality(request, user)
    if (!municipality) {
      return NextResponse.json({ error: 'Municipio nao identificado' }, { status: 400 })
    }

    const url = new URL(request.url)
    const schoolName = url.searchParams.get('school') || String(user.user_metadata?.school || '')
    const role = getUserRole(user)
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('students')
      .select('*, student_aee_profiles(*)')
      .eq('municipality_id', municipality.id)
      .eq('active', true)
      .order('full_name', { ascending: true })

    if (schoolName && !['admin', 'municipality_admin', 'super_admin'].includes(role)) {
      query = query.eq('school_name', schoolName)
    }

    const { data, error } = await query

    // Se a relação student_aee_profiles não foi reconhecida pelo PostgREST
    // (falta de FK registrada), tenta sem o join e retorna perfis vazio.
    if (error) {
      if (error.message?.includes('student_aee_profiles') || error.code === 'PGRST200') {
        console.warn('[GET /api/students] FK student_aee_profiles nao resolvida, buscando sem join:', error.message)
        const { data: fallback, error: fallbackError } = await supabase
          .from('students')
          .select('*')
          .eq('municipality_id', municipality.id)
          .eq('active', true)
          .order('full_name', { ascending: true })
        if (fallbackError) throw fallbackError
        const withEmpty = (fallback || []).map((s) => ({ ...s, student_aee_profiles: [] }))
        return NextResponse.json({ success: true, data: withEmpty })
      }
      throw error
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Login obrigatorio' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'BLOCKED') {
      return NextResponse.json({ error: 'Conta bloqueada' }, { status: 403 })
    }
    console.error('[GET /api/students]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao listar alunos' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request)
    const role = getUserRole(user)
    if (!canManageAeeStudents(role)) {
      return NextResponse.json({ error: 'Acesso restrito ao professor AEE, coordenacao ou administracao' }, { status: 403 })
    }

    const municipality = await resolveUserMunicipality(request, user)
    if (!municipality) {
      return NextResponse.json({ error: 'Municipio nao identificado' }, { status: 400 })
    }

    const values = createStudentWithProfileSchema.parse(await request.json())
    const supabase = getSupabaseAdmin()
    const now = new Date().toISOString()

    const studentRow = {
      ...values.student,
      municipality_id: municipality.id,
      created_by: user.id,
      updated_at: now,
    }

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
          { ...values.profile, student_id: student.id, updated_by: user.id, updated_at: now },
          { onConflict: 'student_id' },
        )
        .select()
        .single()
      if (error) throw error
      profile = data
    }

    return NextResponse.json({ success: true, data: { ...student, student_aee_profiles: profile ? [profile] : [] } }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Login obrigatorio' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'BLOCKED') {
      return NextResponse.json({ error: 'Conta bloqueada' }, { status: 403 })
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dados invalidos' }, { status: 400 })
    }
    console.error('[POST /api/students]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao salvar aluno' }, { status: 500 })
  }
}
