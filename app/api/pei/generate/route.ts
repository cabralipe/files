import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { getSupabaseAdmin, requireUserContext } from '@/lib/supabase-server'
import { buildPeiPrompt, canGeneratePei, generatePeiSchema } from '@/lib/pei'
import { generatePlanFromPrompt, getLatestPaeeForStudent, getLatestPeiForStudent } from '@/lib/public-backend'
import { resolveMunicipality } from '@/lib/municipality'
import { rateLimitShared } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(request: Request) {
  try {
    const ctx = await requireUserContext(request)
    if (!canGeneratePei(ctx.role)) {
      return NextResponse.json({ error: 'Acesso restrito a usuarios pedagogicos autenticados' }, { status: 403 })
    }

    const limit = await rateLimitShared(`pei-generate:${ctx.userId}`, 10, 60_000)
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Muitas gerações em pouco tempo. Aguarde um instante e tente novamente.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
      )
    }

    const values = generatePeiSchema.parse(await request.json())
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

    // Escopo por município (não-super) e por escola (não-gestão).
    const isManager = ['admin', 'municipality_admin', 'super_admin'].includes(ctx.role)
    if (ctx.role !== 'super_admin' && !ctx.municipalityId) {
      return NextResponse.json({ error: 'Municipio nao identificado' }, { status: 400 })
    }
    if (ctx.role !== 'super_admin' && student.municipality_id !== ctx.municipalityId) {
      return NextResponse.json({ error: 'Aluno nao pertence ao seu municipio' }, { status: 403 })
    }
    if (!isManager && (!ctx.school || student.school_name !== ctx.school)) {
      return NextResponse.json({ error: 'Aluno nao pertence a escola do usuario' }, { status: 403 })
    }

    // A ficha pode vir embutida no join; se nao vier (join falhou ou retornou
    // vazio), busca diretamente por student_id antes de desistir.
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
      return NextResponse.json({ error: 'Ficha AEE obrigatoria para gerar PEI' }, { status: 422 })
    }

    // Município para articulação: contexto (banco) para não-super; header p/ super.
    const municipalityId =
      ctx.role === 'super_admin' ? (await resolveMunicipality(request))?.id : ctx.municipalityId || undefined

    // Quando o professor regente opta por combinar, busca o PEI ja existente
    // (do AEE) do aluno para a IA consolidar os dois em um documento unico.
    let basePei: string | undefined
    if (values.merge_existing) {
      const existing = await getLatestPeiForStudent(values.student_id, municipalityId ?? undefined)
      basePei = existing?.content || undefined
    }

    // Articulacao PEI <-> PAEE: se o AEE ja elaborou o PAEE do aluno, o PEI
    // nasce alinhado aos recursos e estrategias do atendimento especializado.
    const existingPaee = await getLatestPaeeForStudent(values.student_id, municipalityId ?? undefined)
    const paeeContext = existingPaee?.content || undefined

    const prompt = buildPeiPrompt({
      student,
      profile,
      plan: values.plan,
      skillsContext: values.skills_context,
      portal: values.portal,
      basePei,
      paeeContext,
    })

    const content = await generatePlanFromPrompt(prompt)
    if (!content.trim()) {
      return NextResponse.json({ error: 'PEI gerado vazio. Tente novamente.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        content,
        student,
        profile,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Login obrigatorio para gerar PEI' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'BLOCKED') {
      return NextResponse.json({ error: 'Conta bloqueada' }, { status: 403 })
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dados invalidos' }, { status: 400 })
    }
    console.error('[POST /api/pei/generate]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao gerar PEI' }, { status: 500 })
  }
}
