import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { getSupabaseAdmin, requireSuperAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  name: z.string().trim().min(2).optional(),
  state: z.string().trim().length(2).optional(),
  logo_url: z.string().optional().nullable(),
  primary_color: z.string().optional().nullable(),
  secondary_color: z.string().optional().nullable(),
  contact_email: z.string().email().optional().nullable(),
  is_active: z.boolean().optional(),
  config: z.record(z.any()).optional(),
})

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin(request)
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('municipalities')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 })
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return handle(error)
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin(request)
    const body = patchSchema.parse(await request.json())
    const supabase = getSupabaseAdmin()

    const updates: Record<string, unknown> = { ...body, updated_at: new Date().toISOString() }
    if (typeof updates.state === 'string') updates.state = (updates.state as string).toUpperCase()

    const { data, error } = await supabase
      .from('municipalities')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dados invalidos' }, { status: 400 })
    }
    return handle(error)
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin(request)
    const supabase = getSupabaseAdmin()
    // Desativa em vez de deletar, para não cascatear dados.
    const { error } = await supabase
      .from('municipalities')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', params.id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return handle(error)
  }
}

function handle(error: unknown) {
  if (error instanceof Error && error.message === 'UNAUTHORIZED') {
    return NextResponse.json({ error: 'Login obrigatorio' }, { status: 401 })
  }
  if (error instanceof Error && ['FORBIDDEN', 'BLOCKED'].includes(error.message)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }
  console.error(error)
  return NextResponse.json({ error: 'Erro inesperado' }, { status: 500 })
}
