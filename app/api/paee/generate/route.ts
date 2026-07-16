import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { getSupabaseAdmin, requireUserContext } from '@/lib/supabase-server'
import { buildPaeePrompt, canGeneratePaee, generatePaeeSchema, paeeOrganizacaoSchema } from '@/lib/paee'
import { generatePlanFromPrompt, getLatestPeiForStudent } from '@/lib/public-backend'
import { resolveMunicipality } from '@/lib/municipality'
import { rateLimitShared } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Gera o PAEE (plano do AEE) a partir da ficha AEE do aluno, articulado com o
// PEI da sala regular quando houver.
export async function POST(request: Request) {
  try {
    const ctx = await requireUserContext(request)
    if (!canGeneratePaee(ctx.role)) {
      return NextResponse.json({ error: 'Acesso restrito ao professor AEE, coordenacao ou administracao' }, { status: 403 })
    }

    const limit = await rateLimitShared(`paee-generate:${ctx.userId}`, 10, 60_000)
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Muitas gerações em pouco tempo. Aguarde um instante e tente novamente.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
      )
    }

    const values = generatePaeeSchema.parse(await request.json())
    const supabase = getSupabaseAdmin()

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*, student_aee_profiles(*)')
      .eq('id', values.student_id)
      .maybeSingle()

    if (studentError) throw studentError
    if (!student) {
      return NextResponse.json({ error: 'Aluno nao encontrado' }, { status: 404 })
    }

    const isManager = ['admin', 'municipality_admin', 'super_admin'].includes(ctx.role)
    if (ctx.role !== 'super_admin' && !ctx.municipalityId) {
      return NextResponse.json({ error: 'Municipio nao identificado' }, { status: 400 })
    }
    if (ctx.role !== 'super_admin' && student.municipality_id !== ctx.municipalityId) {
      return NextResponse.json({ error: 'Aluno nao pertence ao seu municipio' }, { status: 403 })
    }
    const sameSchool = ctx.schoolId && student.school_id
      ? ctx.schoolId === student.school_id
      : Boolean(ctx.school && student.school_name === ctx.school)
    if (!isManager && !sameSchool) {
      return NextResponse.json({ error: 'Aluno nao pertence a escola do usuario' }, { status: 403 })
    }

    let profile: Record<string, unknown> | null = Array.isArray(student.student_aee_profiles)
      ? ((student.student_aee_profiles[0] as Record<string, unknown> | undefined) ?? null)
      : null

    if (!profile) {
      const direct = await supabase
        .from('student_aee_profiles')
        .select('*')
        .eq('student_id', values.student_id)
        .maybeSingle()
      if (direct.error) throw direct.error
      profile = direct.data
    }

    if (!profile) {
      return NextResponse.json({ error: 'Ficha AEE obrigatoria para gerar o PAEE' }, { status: 422 })
    }

    // Articulacao PAEE <-> PEI: envia o PEI mais recente (preferindo o vigente)
    // para a IA alinhar o atendimento do AEE ao trabalho da sala regular.
    let peiVigente: string | undefined
    let linkedPeiId = ''
    if (values.articular_pei) {
      const municipalityId =
        ctx.role === 'super_admin' ? (await resolveMunicipality(request))?.id : ctx.municipalityId || undefined
      const existing = await getLatestPeiForStudent(values.student_id, municipalityId ?? undefined)
      peiVigente = existing?.content || undefined
      linkedPeiId = existing?.id || ''
    }

    const aeeTeacherName = ctx.fullName || ''
    const prompt = buildPaeePrompt({
      student,
      profile,
      organizacao: paeeOrganizacaoSchema.parse(values.organizacao || {}),
      observacoes: values.observacoes,
      aeeTeacherName,
      peiVigente,
    })

    const content = await generatePlanFromPrompt(prompt)
    if (!content.trim()) {
      return NextResponse.json({ error: 'PAEE gerado vazio. Tente novamente.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        content,
        student,
        profile,
        linked_pei_id: linkedPeiId,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Login obrigatorio para gerar PAEE' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'BLOCKED') {
      return NextResponse.json({ error: 'Conta bloqueada' }, { status: 403 })
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dados invalidos' }, { status: 400 })
    }
    console.error('[POST /api/paee/generate]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao gerar PAEE' }, { status: 500 })
  }
}
