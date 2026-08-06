import { NextResponse } from 'next/server'
import { getScopedSchoolIds, getSupabaseAdmin, requireUserContext } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// Fila de aprovação dos links de acesso da família, por escola da coordenação.
export async function GET(request: Request) {
  try {
    const ctx = await requireUserContext(request)
    if (ctx.role !== 'coordinator') {
      return NextResponse.json({ error: 'Acesso restrito a coordenadores' }, { status: 403 })
    }

    // Escopo por escola casando id OU nome (cobre escolas duplicadas com ids
    // distintos e coordenador vinculado só pelo nome), senão o link gerado pelo
    // AEE com o school_id do aluno não apareceria na fila.
    const schoolIds = await getScopedSchoolIds(ctx)
    if (!schoolIds.length) {
      return NextResponse.json({ error: 'Coordenador sem escola vinculada' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined

    const supabase = getSupabaseAdmin()
    let query = supabase
      .from('family_access_links')
      .select('id, student_id, responsible_name, relationship, status, created_at, approved_at, students(full_name, grade_level, class_name, school_name)')
      .in('school_id', schoolIds)
      .order('created_at', { ascending: false })
    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Login obrigatório' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'BLOCKED') {
      return NextResponse.json({ error: 'Conta bloqueada' }, { status: 403 })
    }
    console.error('[GET /api/coordinator/family-links]', error)
    return NextResponse.json({ error: 'Não foi possível carregar os acessos da família' }, { status: 500 })
  }
}
