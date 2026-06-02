import { NextResponse } from 'next/server'
import { getSupabaseAdmin, requireAuthenticatedUser } from '@/lib/supabase-server'
import { getUserRole } from '@/lib/pei'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request)
    if (getUserRole(user) !== 'family') {
      return NextResponse.json({ error: 'Acesso restrito a familia/responsavel' }, { status: 403 })
    }

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
      .eq('is_pei', true)
      .in('student_id', studentIds)
      .order('created_at', { ascending: false })

    if (plansError) throw plansError

    return NextResponse.json({ success: true, data: plans || [], links: links || [] })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Login obrigatorio' }, { status: 401 })
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao carregar PEIs' }, { status: 500 })
  }
}
