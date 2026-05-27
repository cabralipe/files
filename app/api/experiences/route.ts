import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createExperience, listExperiences } from '@/lib/public-backend'
import { requireAuthenticatedUser } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const requestedId = searchParams.get('id')
    const mine = searchParams.get('mine') === 'true'
    const user = mine ? await requireAuthenticatedUser(request) : null
    const experiences = await listExperiences(user?.id)
    const data = requestedId
      ? experiences.filter((experience) => experience.id === requestedId)
      : experiences

    return NextResponse.json({
      success: true,
      data,
      experiences: data,
      total: data.length,
    })
  } catch {
    return NextResponse.json({ error: 'Login obrigatorio' }, { status: 401 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request)
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

    return NextResponse.json({ error: 'N?o foi possivel cadastrar a experi?ncia' }, { status: 500 })
  }
}
