import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { addPoints } from '@/lib/points-server'
import { ensureUserProfile, getSupabaseAdmin, requireAuthenticatedUser } from '@/lib/supabase-server'

const commentSchema = z
  .object({
    experience_id: z.string().uuid().optional(),
    experienceId: z.string().uuid().optional(),
    content: z.string().trim().min(1).max(500),
  })
  .refine(
    (data) => data.experience_id || data.experienceId,
    {
      message: 'experience_id ou experienceId é obrigatório',
    }
  )
  .transform((value) => ({
    experience_id: (value.experience_id || value.experienceId)!,
    content: value.content,
  }))

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const experienceId = searchParams.get('experienceId') || searchParams.get('experience_id')
    const limit = Math.min(Number(searchParams.get('limit') || 50), 100)

    if (!experienceId) {
      return NextResponse.json({ error: 'experience_id e obrigatorio' }, { status: 400 })
    }

    const { data, error } = await getSupabaseAdmin()
      .from('comments')
      .select('id, content, created_at, user_id, users(full_name, avatar_url)')
      .eq('experience_id', experienceId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw error
    }

    const comments = (data || []).map((comment: any) => {
      const userProfile = comment.users || {}
      return {
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        user: {
          id: comment.user_id,
          name: userProfile.full_name || 'Professor(a)',
          email: '',
          avatar_url: userProfile.avatar_url || undefined,
        },
      }
    })

    return NextResponse.json({ success: true, comments })
  } catch (error) {
    console.error('Error in GET /api/comments:', error)
    return NextResponse.json({ error: 'Erro ao obter comentarios' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request)
    await ensureUserProfile(user)
    const values = commentSchema.parse(await request.json())
    const { data, error } = await getSupabaseAdmin()
      .from('comments')
      .insert({
        user_id: user.id,
        experience_id: values.experience_id,
        content: values.content,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    try {
      await addPoints(user.id, 2, 'comentario_criado', data.id)
    } catch (pointsError) {
      console.error('[POST /api/comments] addPoints failed:', pointsError)
    }

    return NextResponse.json({ success: true, comment: data, pointsEarned: 2 }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/comments:', error)
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dados invalidos' }, { status: 400 })
    }

    const status = error instanceof Error && error.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json({ error: status === 401 ? 'Login obrigatorio' : 'Erro ao criar comentario' }, { status })
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request)
    const { comment_id: commentId } = z
      .object({
        comment_id: z.string().uuid().optional(),
        commentId: z.string().uuid().optional(),
      })
      .refine(
        (data) => data.comment_id || data.commentId,
        { message: 'comment_id ou commentId é obrigatório' }
      )
      .transform((value) => ({ comment_id: (value.comment_id || value.commentId)! }))
      .parse(await request.json())
    const supabase = getSupabaseAdmin()
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', commentId)
      .maybeSingle()

    if (fetchError) {
      throw fetchError
    }

    if (!comment) {
      return NextResponse.json({ error: 'Comentário não encontrado' }, { status: 404 })
    }

    if (comment.user_id !== user.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const { error } = await supabase.from('comments').delete().eq('id', commentId)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dados invalidos' }, { status: 400 })
    }

    const status = error instanceof Error && error.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json({ error: status === 401 ? 'Login obrigatorio' : 'Erro ao deletar comentario' }, { status })
  }
}
