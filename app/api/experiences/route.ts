import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createExperience, listExperiences } from '@/lib/public-backend'
import { requireAuthenticatedUser, getAuthenticatedUser, ensureUserProfile, getSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const requestedId = searchParams.get('id')
    const mine = searchParams.get('mine') === 'true'
    
    const currentUser = await getAuthenticatedUser(request)
    const filterUserId = mine ? (currentUser ? currentUser.id : (await requireAuthenticatedUser(request)).id) : undefined
    
    const experiences = await listExperiences(filterUserId)
    let data = requestedId
      ? experiences.filter((experience) => experience.id === requestedId)
      : experiences

    if (currentUser && data.length > 0) {
      const supabase = getSupabaseAdmin()
      const currentUserProfile = await ensureUserProfile(currentUser)
      
      const enhancedData = []
      for (const exp of data) {
        let canDelete = false
        if (exp.user_id === currentUser.id) {
          canDelete = true
        } else if (currentUserProfile.role === 'coordinator' && currentUserProfile.school_id) {
          const { data: author } = await supabase
            .from('users')
            .select('school_id')
            .eq('id', exp.user_id)
            .maybeSingle()
          
          if (author?.school_id && author.school_id === currentUserProfile.school_id) {
            canDelete = true
          }
        }
        // Admin can delete any experience
        const isAdmin = currentUserProfile.role === 'admin' ||
          currentUser.user_metadata?.role === 'admin' ||
          currentUser.email === 'admin@bncc.local' ||
          currentUser.email === process.env.ADMIN_EMAIL
        if (isAdmin) {
          canDelete = true
        }
        enhancedData.push({
          ...exp,
          can_delete: canDelete
        })
      }
      data = enhancedData
    }

    return NextResponse.json({
      success: true,
      data,
      experiences: data,
      total: data.length,
    })
  } catch (error) {
    console.error('Error in GET /api/experiences:', error)
    return NextResponse.json({ error: 'Erro ao obter experiências' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request)
    await ensureUserProfile(user)
    const body = await request.json()
    const teacher = {
      user_id: user.id,
      teacher:
        (user.user_metadata?.name as string | undefined) ||
        (user.user_metadata?.full_name as string | undefined) ||
        user.email ||
        'Professor(a)',
    }
    const experience = await createExperience(body, teacher)

    return NextResponse.json({ success: true, data: experience, experience }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Login obrigatorio' }, { status: 401 })
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dados invalidos' }, { status: 400 })
    }

    console.error('Error in POST /api/experiences:', error)
    return NextResponse.json({ error: 'N?o foi possivel cadastrar a experi?ncia' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request)
    const userProfile = await ensureUserProfile(user)
    
    const { searchParams } = new URL(request.url)
    const experienceId = searchParams.get('id')
    
    if (!experienceId) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })
    }
    
    const supabase = getSupabaseAdmin()
    const { data: experience, error: fetchError } = await supabase
      .from('successful_experiences')
      .select('*')
      .eq('id', experienceId)
      .maybeSingle()
      
    if (fetchError || !experience) {
      return NextResponse.json({ error: 'Experiência não encontrada' }, { status: 404 })
    }
    
    let canDelete = false
    if (experience.user_id === user.id) {
      canDelete = true
    } else if (userProfile.role === 'coordinator' && userProfile.school_id) {
      const { data: author } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', experience.user_id)
        .maybeSingle()
        
      if (author?.school_id && author.school_id === userProfile.school_id) {
        canDelete = true
      }
    }
    // Admin can delete any experience
    const isAdmin = userProfile.role === 'admin' ||
      user.user_metadata?.role === 'admin' ||
      user.email === 'admin@bncc.local' ||
      user.email === process.env.ADMIN_EMAIL
    if (isAdmin) {
      canDelete = true
    }
    
    if (!canDelete) {
      return NextResponse.json({ error: 'Não autorizado a deletar esta experiência' }, { status: 403 })
    }
    
    const { error: deleteError } = await supabase
      .from('successful_experiences')
      .delete()
      .eq('id', experienceId)
      
    if (deleteError) {
      throw deleteError
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting experience:', error)
    return NextResponse.json({ error: 'Erro ao deletar experiência' }, { status: 500 })
  }
}
