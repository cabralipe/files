import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { getSupabaseAdmin, getUserSchools, requireUserContext } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const schema = z.object({
  action: z.enum(['approve', 'reject']),
})

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireUserContext(request)
    if (ctx.role !== 'coordinator') {
      return NextResponse.json({ error: 'Acesso restrito a coordenadores' }, { status: 403 })
    }
    const { action } = schema.parse(await request.json())

    const supabase = getSupabaseAdmin()
    const { data: link, error: fetchError } = await supabase
      .from('family_access_links')
      .select('id, school_id, status')
      .eq('id', params.id)
      .maybeSingle()
    if (fetchError) throw fetchError
    if (!link) return NextResponse.json({ error: 'Link não encontrado' }, { status: 404 })

    const memberships = await getUserSchools(ctx.userId, ctx.municipalityId)
    const schoolIds = Array.from(new Set([...memberships.map((s) => s.id), ...(ctx.schoolId ? [ctx.schoolId] : [])]))
    if (!link.school_id || !schoolIds.includes(link.school_id)) {
      return NextResponse.json({ error: 'Este link não pertence a uma escola sua' }, { status: 403 })
    }
    if (link.status !== 'pending_approval') {
      return NextResponse.json({ error: 'Este link já foi decidido' }, { status: 409 })
    }

    const update = action === 'approve'
      ? { status: 'approved', approved_by: ctx.userId, approved_at: new Date().toISOString() }
      : { status: 'revoked', revoked_by: ctx.userId, revoked_at: new Date().toISOString() }

    const { data: updated, error } = await supabase
      .from('family_access_links')
      .update(update)
      .eq('id', params.id)
      .select('id, status')
      .single()
    if (error) throw error

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dados inválidos' }, { status: 400 })
    }
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Login obrigatório' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'BLOCKED') {
      return NextResponse.json({ error: 'Conta bloqueada' }, { status: 403 })
    }
    console.error('[PATCH /api/coordinator/family-links/[id]]', error)
    return NextResponse.json({ error: 'Não foi possível decidir sobre o link' }, { status: 500 })
  }
}
