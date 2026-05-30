import { NextResponse } from 'next/server'
import { requireAdminUser, getSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireAdminUser(request)
    const supabase = getSupabaseAdmin()

    // Verify the analytics_events table exists
    const { error: tableCheck } = await supabase
      .from('analytics_events')
      .select('id', { count: 'exact', head: true })
      .limit(1)

    if (tableCheck?.code === '42P01') {
      return NextResponse.json({ data: null, needsMigration: true })
    }

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const ago7d  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000)
    const ago30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const q = (page: string) =>
      supabase.from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'pageview')
        .eq('page', page)

    const [
      { count: compTotal },
      { count: compToday },
      { count: compLast7d },
      { count: compLast30d },
      { count: nacTotal },
      { count: nacToday },
      { count: nacLast7d },
      { count: nacLast30d },
      { count: portalPlans },
      { count: nacPlans },
      { data: schoolRows },
    ] = await Promise.all([
      q('/'),
      q('/').gte('created_at', todayStart.toISOString()),
      q('/').gte('created_at', ago7d.toISOString()),
      q('/').gte('created_at', ago30d.toISOString()),
      q('/bncc-nacional'),
      q('/bncc-nacional').gte('created_at', todayStart.toISOString()),
      q('/bncc-nacional').gte('created_at', ago7d.toISOString()),
      q('/bncc-nacional').gte('created_at', ago30d.toISOString()),
      supabase.from('plans').select('*', { count: 'exact', head: true }),
      supabase.from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'bncc_plan_gen'),
      supabase.from('analytics_events')
        .select('school')
        .eq('event_type', 'bncc_plan_gen')
        .not('school', 'is', null)
        .neq('school', ''),
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

    return NextResponse.json({
      data: {
        computacao: {
          visits: {
            total:   compTotal   ?? 0,
            today:   compToday   ?? 0,
            last7d:  compLast7d  ?? 0,
            last30d: compLast30d ?? 0,
          },
          plans: portalPlans ?? 0,
        },
        nacional: {
          visits: {
            total:   nacTotal   ?? 0,
            today:   nacToday   ?? 0,
            last7d:  nacLast7d  ?? 0,
            last30d: nacLast30d ?? 0,
          },
          plans: nacPlans ?? 0,
        },
        topSchools,
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
