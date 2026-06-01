import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()
    const type = searchParams.get('type') || 'all'
    const limit = Math.min(Number(searchParams.get('limit') || 10), 50)

    if (!query) {
      return NextResponse.json({
        success: true,
        results: { skills: [], experiences: [], users: [], plans: [] },
      })
    }

    const supabase = getSupabaseAdmin()
    const search = `%${query}%`
    const results: {
      skills: unknown[]
      experiences: unknown[]
      users: unknown[]
      plans: unknown[]
    } = { skills: [], experiences: [], users: [], plans: [] }

    if (type === 'all' || type === 'skills') {
      const { data } = await supabase
        .from('skills')
        .select('id, code, name, description, grade_level, competency, subject, axis')
        .or(`name.ilike.${search},description.ilike.${search},code.ilike.${search},subject.ilike.${search},competency.ilike.${search},axis.ilike.${search}`)
        .limit(limit)
      results.skills = data || []
    }

    if (type === 'all' || type === 'experiences') {
      const { data } = await supabase
        .from('successful_experiences')
        .select('id, title, description, category, likes_count, created_at, user_id')
        .or(`title.ilike.${search},description.ilike.${search},content.ilike.${search}`)
        .limit(limit)
      results.experiences = data || []
    }

    if (type === 'all' || type === 'users') {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, avatar_url, bio')
        .or(`full_name.ilike.${search},email.ilike.${search}`)
        .limit(limit)
      if (!error) {
        results.users = data || []
      } else if (error.code === 'PGRST204' || error.code === '42703') {
        const { data: fallbackData } = await supabase
          .from('users')
          .select('id, name, email, avatar_url, bio')
          .or(`name.ilike.${search},email.ilike.${search}`)
          .limit(limit)
        results.users = fallbackData || []
      }
    }

    if (type === 'all' || type === 'plans') {
      const { data } = await supabase
        .from('plans')
        .select('id, title, description, grade_level, duration, created_at, user_id')
        .or(`title.ilike.${search},description.ilike.${search},content.ilike.${search}`)
        .limit(limit)
      results.plans = data || []
    }

    return NextResponse.json({ success: true, query, results })
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar' }, { status: 500 })
  }
}
