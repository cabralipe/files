import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { event_type, page, school } = body as {
      event_type: string; page?: string; school?: string
    }
    if (!event_type) return NextResponse.json({ ok: false }, { status: 400 })

    const supabase = getSupabaseAdmin()

    // Try to insert; if table doesn't exist yet, create it first
    let { error } = await supabase.from('analytics_events').insert({
      event_type,
      page: page ?? null,
      school: school ?? null,
    })

    if (error?.code === '42P01') {
      // Table doesn't exist — attempt to create it via stored procedure or skip
      // We log this so the admin knows the migration needs to run
      console.warn('[analytics] analytics_events table not found. Run supabase-analytics-migration.sql in Supabase SQL Editor.')
    } else if (error) {
      console.error('[analytics] insert error:', error.message)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true }) // always return 200 to not block the UI
  }
}
