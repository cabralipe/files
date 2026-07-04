import { NextResponse } from 'next/server'
import { getSupabaseAdmin, requireUserContext } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const ctx = await requireUserContext(request)
    if (ctx.role !== 'family') {
      return NextResponse.json({ error: 'Acesso restrito a familia/responsavel' }, { status: 403 })
    }
    const user = { id: ctx.userId }

    const supabase = getSupabaseAdmin()
    const { data: links, error: linksError } = await supabase
      .from('family_student_links')
      .select('student_id, relationship, students(full_name, school_name, grade_level)')
      .eq('family_user_id', user.id)

    if (linksError) throw linksError
    const studentIds = (links || []).map((link) => link.student_id).filter(Boolean)
    if (!studentIds.length) {
      return NextResponse.json({ success: true, data: [] })
    }

    const { data: plans, error: plansError } = await supabase
      .from('plans')
      .select('*')
      .in('student_id', studentIds)
      .order('created_at', { ascending: false })

    if (plansError) throw plansError

    // Inclui PEIs e PAEEs; o PAEE e identificado dentro do JSON de conteudo.
    const documents = (plans || [])
      .map((row) => {
        let inner: Record<string, any> | null = null
        try {
          const parsed = typeof row.content === 'string' ? JSON.parse(row.content) : null
          if (parsed?.__publicPlan && parsed.plan) inner = parsed.plan
        } catch {
          inner = null
        }
        const isPaee = Boolean(inner?.is_paee)
        if (!row.is_pei && !isPaee) return null
        return {
          id: row.id,
          title: inner?.title || row.title,
          content: inner?.content || row.content || '',
          is_published: Boolean(row.is_published),
          plan_status: inner?.plan_status || (row.is_published ? 'vigente' : 'rascunho'),
          is_paee: isPaee,
          student_id: row.student_id,
          consulta_familia: inner?.consulta_familia || row.consulta_familia || {},
          created_at: row.created_at,
        }
      })
      .filter(Boolean)

    return NextResponse.json({ success: true, data: documents, links: links || [] })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Login obrigatorio' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'BLOCKED') {
      return NextResponse.json({ error: 'Conta bloqueada' }, { status: 403 })
    }
    console.error('[GET /api/family/peis]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao carregar PEIs' }, { status: 500 })
  }
}
