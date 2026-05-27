import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { addPoints } from '@/lib/points-server'
import { getAuthenticatedUser, getSupabaseAdmin, requireAuthenticatedUser } from '@/lib/supabase-server'

const likeSchema = z
  .object({
    experience_id: z.string().uuid().optional(),
    experienceId: z.string().uuid().optional(),
  })
  .transform((value) => ({ experience_id: value.experience_id || value.experienceId || '' }))

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const experienceId = searchParams.get('experienceId') || searchParams.get('experience_id')

    if (!experienceId) {
      return NextResponse.json({ error: 'experience_id e obrigatorio' }, { status: 400 })
    }

    const currentUser = await getAuthenticatedUser(request)
    const supabase = getSupabaseAdmin()
    const { count, error } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('experience_id', experienceId)

    if (error) {
      throw error
    }

    let userLiked = false
    if (currentUser) {
      const { data } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('experience_id', experienceId)
        .maybeSingle()

      userLiked = Boolean(data)
    }

    return NextResponse.json({ success: true, likeCount: count || 0, userLiked })
  } catch {
    return NextResponse.json({ error: 'Erro ao obter likes' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request)
    const values = likeSchema.parse(await request.json())
    const supabase = getSupabaseAdmin()
    const { data: existingLike, error: existingError } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('experience_id', values.experience_id)
      .maybeSingle()

    if (existingError) {
      throw existingError
    }

    if (existingLike) {
      const { data: experience } = await supabase
        .from('successful_experiences')
        .select('likes_count')
        .eq('id', values.experience_id)
        .maybeSingle()
      const { error } = await supabase.from('likes').delete().eq('id', existingLike.id)
      if (error) {
        throw error
      }

      await supabase
        .from('successful_experiences')
        .update({ likes_count: Math.max(Number(experience?.likes_count || 0) - 1, 0) })
        .eq('id', values.experience_id)

      return NextResponse.json({ success: true, liked: false })
    }

    const { data: like, error } = await supabase
      .from('likes')
      .insert({ user_id: user.id, experience_id: values.experience_id })
      .select()
      .single()

    if (error) {
      throw error
    }

    const { data: experience } = await supabase
      .from('successful_experiences')
      .select('user_id, likes_count')
      .eq('id', values.experience_id)
      .maybeSingle()

    await supabase
      .from('successful_experiences')
      .update({ likes_count: Number(experience?.likes_count || 0) + 1 })
      .eq('id', values.experience_id)

    if (experience?.user_id) {
      await addPoints(experience.user_id, 5, 'like_recebido', values.experience_id)
    }

    return NextResponse.json({ success: true, liked: true, like }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dados invalidos' }, { status: 400 })
    }

    const status = error instanceof Error && error.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json({ error: status === 401 ? 'Login obrigatorio' : 'Erro ao curtir' }, { status })
  }
}
