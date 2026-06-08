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

    // Tenta carregar o aluno com a ficha AEE embutida (join via FK).
    let student: Record<string, unknown> | null = null
    const joined = await supabase
      .from('students')
      .select('*, student_aee_profiles(*)')
      .eq('id', values.student_id)
      .maybeSingle()

    if (joined.error) {
      // Se a FK student_aee_profiles nao estiver registrada no PostgREST
      // (PGRST200), carrega o aluno sem o join e busca a ficha em separado.
      const isFkMissing =
        joined.error.code === 'PGRST200' ||
        joined.error.message?.includes('student_aee_profiles')
      if (!isFkMissing) throw joined.error

      console.warn('[POST /api/pei/generate] FK student_aee_profiles nao resolvida, buscando sem join:', joined.error.message)
      const plain = await supabase
        .from('students')
        .select('*')
        .eq('id', values.student_id)
        .maybeSingle()
      if (plain.error) throw plain.error
      student = plain.data
    } else {
      student = joined.data
    }

    if (!student) {
      return NextResponse.json({ error: 'Aluno nao encontrado' }, { status: 404 })
    }

    const userSchool = String(user.user_metadata?.school || '')
    if (role !== 'super_admin' && userSchool && student.school_name !== userSchool) {
      return NextResponse.json({ error: 'Aluno nao pertence a escola do usuario' }, { status: 403 })
    }

    // A ficha pode vir embutida no join; se nao vier (join falhou ou retornou
    // vazio), busca diretamente por student_id antes de desistir.
    let profile: Record<string, unknown> | null = Array.isArray(student.student_aee_profiles)
      ? (student.student_aee_profiles[0] as Record<string, unknown> | undefined) ?? null
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
