import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { getSupabaseAdmin, requireAuthenticatedUser } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const notificationUpdateSchema = z.object({
  notification_id: z.string().uuid(),
})

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request)
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit') || 50), 100)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    let query = getSupabaseAdmin()
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    const unreadCount = (data || []).filter((notification) => !notification.is_read).length

    return NextResponse.json({ success: true, notifications: data || [], unreadCount })
  } catch (error) {
    const status = error instanceof Error && error.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json({ error: status === 401 ? 'Login obrigatorio' : 'Erro ao obter notificacoes' }, { status })
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request)
    const values = notificationUpdateSchema.parse(await request.json())
    const { error } = await getSupabaseAdmin()
      .from('notifications')
      .update({ is_read: true })
      .eq('id', values.notification_id)
      .eq('user_id', user.id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dados invalidos' }, { status: 400 })
    }

    const status = error instanceof Error && error.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json({ error: status === 401 ? 'Login obrigatorio' : 'Erro ao atualizar notificacao' }, { status })
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request)
    const values = notificationUpdateSchema.parse(await request.json())
    const { error } = await getSupabaseAdmin()
      .from('notifications')
      .delete()
      .eq('id', values.notification_id)
      .eq('user_id', user.id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dados invalidos' }, { status: 400 })
    }

    const status = error instanceof Error && error.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json({ error: status === 401 ? 'Login obrigatorio' : 'Erro ao deletar notificacao' }, { status })
  }
}
