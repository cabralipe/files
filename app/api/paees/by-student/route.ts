import { NextResponse } from 'next/server'
import { getSupabaseAdmin, requireUserContext } from '@/lib/supabase-server'
import { resolveMunicipality } from '@/lib/municipality'
import { canGeneratePei } from '@/lib/pei'
import { getLatestPaeeForStudent } from '@/lib/public-backend'

export const dynamic = 'force-dynamic'

// Retorna o PAEE mais recente do aluno (preferindo o vigente). Usado pelo
// painel AEE e pelos portais para sinalizar a articulacao PAEE <-> PEI.
export async function GET(request: Request) {
  try {
    const ctx = await requireUserContext(request)
    if (!canGeneratePei(ctx.role)) {
      return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })
    }

    const url = new URL(request.url)
    const studentId = url.searchParams.get('student_id') || ''
    if (!studentId) {
      return NextResponse.json({ error: 'student_id obrigatorio' }, { status: 400 })
    }

    const isManager = ['admin', 'municipality_admin', 'super_admin'].includes(ctx.role)
    const municipalityId =
      ctx.role === 'super_admin' ? (await resolveMunicipality(request))?.id : ctx.municipalityId || undefined

    if (ctx.role !== 'super_admin' && !municipalityId) {
      return NextResponse.json({ error: 'Municipio nao identificado' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, school_id, school_name, municipality_id')
      .eq('id', studentId)
      .maybeSingle()

    if (studentError) throw studentError
    if (!student) {
      return NextResponse.json({ error: 'Aluno nao encontrado' }, { status: 404 })
    }

    if (ctx.role !== 'super_admin' && student.municipality_id !== municipalityId) {
      return NextResponse.json({ error: 'Aluno nao pertence ao seu municipio' }, { status: 403 })
    }

    const sameSchool = ctx.schoolId && student.school_id
      ? ctx.schoolId === student.school_id
      : Boolean(ctx.school && student.school_name === ctx.school)
    if (!isManager && !sameSchool) {
      return NextResponse.json({ error: 'Aluno nao pertence a escola do usuario' }, { status: 403 })
    }

    const paee = await getLatestPaeeForStudent(studentId, municipalityId ?? undefined)

    return NextResponse.json({ success: true, data: paee })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Login obrigatorio' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'BLOCKED') {
      return NextResponse.json({ error: 'Conta bloqueada' }, { status: 403 })
    }
    console.error('[GET /api/paees/by-student]', error)
    return NextResponse.json({ error: 'Nao foi possivel carregar o PAEE do aluno' }, { status: 500 })
  }
}
