import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createPlan, listPlans } from '@/lib/public-backend'
import { requireUserContext } from '@/lib/supabase-server'
import { resolveMunicipality } from '@/lib/municipality'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const ctx = await requireUserContext(request)
    // Município do contexto (banco); super_admin pode inspecionar outro via header.
    const municipalityId =
      ctx.role === 'super_admin' ? (await resolveMunicipality(request))?.id : ctx.municipalityId || undefined
    const plans = await listPlans(ctx.userId, municipalityId ?? undefined)

    return NextResponse.json({
      success: true,
      data: plans,
      plans,
      total: plans.length,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Login obrigatorio' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'BLOCKED') {
      return NextResponse.json({ error: 'Conta bloqueada' }, { status: 403 })
    }
    console.error('[GET /api/plans]', error)
    return NextResponse.json({ error: 'Nao foi possivel listar os planos' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireUserContext(request)
    // Plano é sempre criado no município do próprio usuário (não do header).
    const municipalityId =
      ctx.role === 'super_admin' ? (await resolveMunicipality(request))?.id : ctx.municipalityId || undefined
    const body = await request.json()
    const plan = await createPlan(body, ctx.userId, municipalityId ?? undefined, ctx.schoolId)

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

    return NextResponse.json({ error: 'Nao foi possivel criar o plano' }, { status: 500 })
  }
}
