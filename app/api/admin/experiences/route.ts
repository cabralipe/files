import { NextResponse } from 'next/server'
import { requireAdminUser, getSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireAdminUser(request)
    const supabase = getSupabaseAdmin()

    const { data: experiences, error } = await supabase
      .from('successful_experiences')
      .select('*, user:users(full_name, email, school_id)')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, data: experiences })
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
    await requireAdminUser(request)
    const supabase = getSupabaseAdmin()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })
    }

    const { error } = await supabase
      .from('successful_experiences')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

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
