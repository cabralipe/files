import { NextResponse } from 'next/server'
import { getSupabaseAdmin, requireUserContext } from '@/lib/supabase-server'
import { resolveMunicipality } from '@/lib/municipality'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const ctx = await requireUserContext(request)
    const municipalityId = ctx.role === 'super_admin'
      ? (await resolveMunicipality(request))?.id
      : ctx.municipalityId
    if (!municipalityId) return NextResponse.json({ error: 'Município não identificado' }, { status: 400 })

    const { data, error } = await getSupabaseAdmin()
      .from('schools')
      .select('id, name')
      .eq('municipality_id', municipalityId)
      .order('name')
    if (error) throw error
    return NextResponse.json({ success: true, data: data || [] }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Login obrigatório' }, { status: 401 })
    if (error instanceof Error && error.message === 'BLOCKED') return NextResponse.json({ error: 'Conta bloqueada' }, { status: 403 })
    return NextResponse.json({ error: 'Erro ao listar escolas' }, { status: 500 })
  }
}
