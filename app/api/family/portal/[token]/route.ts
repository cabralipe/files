import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getFamilyLinkByToken } from '@/lib/family-access'
import { getStudentPeiPaeeDocs, getApprovedClassPlans } from '@/lib/public-backend'
import { getClientIp, rateLimitShared } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// Portal público da família: sem login, autenticado só pela posse do token
// (link aprovado pela coordenação). Nunca expõe listas de outros alunos.
export async function GET(request: Request, { params }: { params: { token: string } }) {
  try {
    const ip = getClientIp(request)
    const limit = await rateLimitShared(`family-portal:${ip}`, 30, 60_000)
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Aguarde um instante e tente novamente.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
      )
    }

    const link = await getFamilyLinkByToken(params.token)
    if (!link) {
      return NextResponse.json({ error: 'Link inválido.', status: 'not_found' }, { status: 404 })
    }
    if (link.status === 'pending_approval') {
      return NextResponse.json({ status: 'pending_approval', responsible_name: link.responsible_name })
    }
    if (link.status === 'revoked') {
      return NextResponse.json({ error: 'Este link foi revogado pela escola.', status: 'revoked' }, { status: 403 })
    }

    const supabase = getSupabaseAdmin()
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, full_name, school_id, school_name, grade_level, class_name')
      .eq('id', link.student_id)
      .maybeSingle()
    if (studentError) throw studentError
    if (!student) {
      return NextResponse.json({ error: 'Aluno não encontrado.', status: 'not_found' }, { status: 404 })
    }

    const [peiPaeeDocs, classPlans] = await Promise.all([
      getStudentPeiPaeeDocs(student.id, link.municipality_id),
      getApprovedClassPlans({
        municipalityId: link.municipality_id,
        schoolId: student.school_id || link.school_id,
        gradeLevel: student.grade_level,
      }),
    ])

    // Best-effort: registra o último acesso, sem bloquear a resposta.
    void supabase
      .from('family_access_links')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', link.id)
      .then(() => {})

    return NextResponse.json({
      status: 'approved',
      responsible_name: link.responsible_name,
      relationship: link.relationship,
      student: {
        id: student.id,
        full_name: student.full_name,
        school_name: student.school_name,
        grade_level: student.grade_level,
        class_name: student.class_name,
      },
      documents: peiPaeeDocs.map((plan) => ({
        id: plan.id,
        title: plan.title,
        content: plan.content,
        is_paee: Boolean(plan.is_paee),
        plan_status: plan.plan_status,
        is_published: Boolean(plan.is_published),
        consulta_familia: plan.consulta_familia,
        created_at: plan.created_at,
      })),
      class_plans: classPlans.map((plan) => ({
        id: plan.id,
        title: plan.title,
        content: plan.content,
        subject: plan.subject,
        teacher: plan.teacher,
        coordinator_viewed_at: plan.coordinator_viewed_at,
        created_at: plan.created_at,
      })),
    })
  } catch (error) {
    console.error('[GET /api/family/portal/[token]]', error)
    return NextResponse.json({ error: 'Não foi possível carregar os dados da família.' }, { status: 500 })
  }
}
