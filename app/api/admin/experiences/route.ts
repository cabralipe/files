import { NextResponse } from 'next/server'
import { requireAdminUser, getSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const ctx = await requireAdminUser(request)
    const supabase = getSupabaseAdmin()

    // Fetch all available columns so older databases do not fail when optional
    // columns are missing from the deployed schema.
    let query = supabase
      .from('successful_experiences')
      .select('*')
      .order('created_at', { ascending: false })
    // Admin municipal só vê experiências do próprio município.
    if (ctx.role !== 'super_admin') {
      if (!ctx.municipalityId) return NextResponse.json({ success: true, data: [] })
      query = query.eq('municipality_id', ctx.municipalityId)
    }
    const { data: experiences, error } = await query

    if (error) {
      // Table might not exist yet
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, data: [] })
      }
      throw error
    }

    // Fetch author names separately — avoids FK join issues
    const userIds = [...new Set((experiences ?? []).map((e) => e.user_id).filter(Boolean))]
    let authorMap: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', userIds)
      for (const p of profiles ?? []) authorMap[p.id] = p.full_name
    }

    const mapped = (experiences ?? []).map((e) => ({
      ...e,
      author_name: authorMap[e.user_id] ?? '—',
    }))

    return NextResponse.json({ success: true, data: mapped })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Login obrigatório' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'BLOCKED') {
      return NextResponse.json({ error: 'Conta bloqueada' }, { status: 403 })
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }
    console.error('Error in GET /api/admin/experiences:', error)
    return NextResponse.json({ error: 'Erro ao listar experiências' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await requireAdminUser(request)
    const supabase = getSupabaseAdmin()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })
    }

    // Admin municipal só exclui experiências do próprio município.
    if (ctx.role !== 'super_admin') {
      const { data: exp } = await supabase
        .from('successful_experiences')
        .select('municipality_id')
        .eq('id', id)
        .maybeSingle()
      if (!exp) return NextResponse.json({ error: 'Experiência não encontrada' }, { status: 404 })
      if (exp.municipality_id !== ctx.municipalityId) {
        return NextResponse.json({ error: 'Experiência fora do seu município' }, { status: 403 })
      }
    }

    const { error } = await supabase
      .from('successful_experiences')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Login obrigatório' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'BLOCKED') {
      return NextResponse.json({ error: 'Conta bloqueada' }, { status: 403 })
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }
    console.error('Error in DELETE /api/admin/experiences:', error)
    return NextResponse.json({ error: 'Erro ao deletar experiência' }, { status: 500 })
  }
}
