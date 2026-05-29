import { NextResponse } from 'next/server'
import { requireAdminUser, getSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireAdminUser(request)
    const supabase = getSupabaseAdmin()

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const ago30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const ago7d  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000)

    const [
      { count: totalViews },
      { count: viewsToday },
      { count: viewsLast7d },
      { count: viewsLast30d },
      { count: portalPlans },
      { count: nacPlans },
      { data: schoolRows },
      { data: plansByDayRows },
    ] = await Promise.all([
      supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_type', 'pageview'),
      supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_type', 'pageview').gte('created_at', todayStart.toISOString()),
      supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_type', 'pageview').gte('created_at', ago7d.toISOString()),
      supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_type', 'pageview').gte('created_at', ago30d.toISOString()),
      supabase.from('plans').select('*', { count: 'exact', head: true }),
      supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_type', 'bncc_plan_gen'),
      supabase.from('analytics_events').select('school').eq('event_type', 'bncc_plan_gen').not('school', 'is', null).neq('school', ''),
      supabase.from('analytics_events').select('created_at').eq('event_type', 'pageview').gte('created_at', ago30d.toISOString()),
    ])

    // Aggregate top schools
    const schoolMap: Record<string, number> = {}
    for (const row of schoolRows ?? []) {
      if (row.school) schoolMap[row.school] = (schoolMap[row.school] ?? 0) + 1
    }
    const topSchools = Object.entries(schoolMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([school, count]) => ({ school, count }))

    // Daily visit counts for sparkline (last 30 days)
    const dailyVisits: Record<string, number> = {}
    for (const row of plansByDayRows ?? []) {
      const day = (row.created_at as string).slice(0, 10)
      dailyVisits[day] = (dailyVisits[day] ?? 0) + 1
    }

    return NextResponse.json({
      data: {
        visits: {
          total:    totalViews   ?? 0,
          today:    viewsToday   ?? 0,
          last7d:   viewsLast7d  ?? 0,
          last30d:  viewsLast30d ?? 0,
        },
        plans: {
          portal:   portalPlans ?? 0,
          nacional: nacPlans    ?? 0,
          total:    (portalPlans ?? 0) + (nacPlans ?? 0),
        },
        topSchools,
        dailyVisits,
      },
    })
  } catch (error) {
    if (error instanceof Error && ['UNAUTHORIZED', 'FORBIDDEN'].includes(error.message)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }
    console.error('Admin analytics error:', error)
    return NextResponse.json({ error: 'Erro ao carregar analytics' }, { status: 500 })
  }
}
