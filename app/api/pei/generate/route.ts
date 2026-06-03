import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { getSupabaseAdmin, requireAuthenticatedUser } from '@/lib/supabase-server'
import { buildPeiPrompt, canGeneratePei, generatePeiSchema, getUserRole } from '@/lib/pei'
import { generatePlanFromPrompt } from '@/lib/public-backend'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request)
    const role = getUserRole(user)
    if (!canGeneratePei(role)) {
      return NextResponse.json({ error: 'Acesso restrito a usuarios pedagogicos autenticados' }, { status: 403 })
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

    const userSchool = String(user.user_metadata?.school || '')
    if (role !== 'super_admin' && userSchool && student.school_name !== userSchool) {
      return NextResponse.json({ error: 'Aluno nao pertence a escola do usuario' }, { status: 403 })
    }

    const profile = Array.isArray(student.student_aee_profiles)
      ? student.student_aee_profiles[0]
      : null

    if (!profile) {
      return NextResponse.json({ error: 'Ficha AEE obrigatoria para gerar PEI' }, { status: 422 })
    }

    const prompt = buildPeiPrompt({
      student,
      profile,
      plan: values.plan,
      skillsContext: values.skills_context,
      portal: values.portal,
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
