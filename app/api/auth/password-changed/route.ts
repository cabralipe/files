import { NextResponse } from 'next/server'
import { getSupabaseAdmin, requireUserContext } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const ctx = await requireUserContext(request)
    const supabase = getSupabaseAdmin()
    const { error: profileError } = await supabase
      .from('users')
      .update({ must_change_password: false, updated_at: new Date().toISOString() })
      .eq('id', ctx.userId)
    if (profileError) throw profileError

    const { data, error: userError } = await supabase.auth.admin.getUserById(ctx.userId)
    if (userError) throw userError
    const { error: authError } = await supabase.auth.admin.updateUserById(ctx.userId, {
      app_metadata: { ...(data.user.app_metadata || {}), must_change_password: false },
    })
    if (authError) throw authError

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'BLOCKED') {
      return NextResponse.json({ error: 'Conta bloqueada' }, { status: 403 })
    }
    console.error('[auth/password-changed]', error)
    return NextResponse.json({ error: 'Não foi possível concluir a troca de senha' }, { status: 500 })
  }
}
