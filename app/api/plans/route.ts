import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createPlan, listPlans } from '@/lib/public-backend'
import { requireAuthenticatedUser } from '@/lib/supabase-server'
import { resolveMunicipality } from '@/lib/municipality'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request)
    const municipality = await resolveMunicipality(request)
    const plans = await listPlans(user.id, municipality?.id)

    return NextResponse.json({
      success: true,
      data: plans,
      plans,
      total: plans.length,
    })
  } catch {
    return NextResponse.json({ error: 'Login obrigatorio' }, { status: 401 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request)
    const municipality = await resolveMunicipality(request)
    const body = await request.json()
    const plan = await createPlan(body, user.id, municipality?.id)

    return NextResponse.json({ success: true, data: plan, plan }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar plano:', error)
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Login obrigatorio para salvar plano' }, { status: 401 })
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dados invalidos' }, { status: 400 })
    }

    if (error instanceof Error && error.message.startsWith('PUBLICATION_BLOCKED:')) {
      return NextResponse.json(
        { error: `Publicacao bloqueada. Pendencias: ${error.message.replace('PUBLICATION_BLOCKED:', '')}` },
        { status: 422 },
      )
    }

    return NextResponse.json({ error: 'N?o foi possivel criar o plano' }, { status: 500 })
  }
}
