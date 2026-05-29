import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) throw new Error('Supabase not configured')
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { event_type, page, school } = body as {
      event_type: string; page?: string; school?: string
    }
    if (!event_type) return NextResponse.json({ ok: false }, { status: 400 })

    const supabase = getAnonClient()
    await supabase.from('analytics_events').insert({
      event_type,
      page: page ?? null,
      school: school ?? null,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true }) // silently succeed even on error
  }
}
