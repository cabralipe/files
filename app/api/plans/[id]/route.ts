import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { deletePlan, updatePlan } from '@/lib/public-backend'
import { requireAuthenticatedUser } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuthenticatedUser(request)
    const body = await request.json()
    const plan = await updatePlan(params.id, body)

    if (!plan) {
      return NextResponse.json({ error: 'Plano nao encontrado' }, { status: 404 })
}

    return NextResponse.json({ success: true, data: plan, plan })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Login obrigatorio' }, { status: 401 })
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

    return NextResponse.json({ error: 'Nao foi possivel atualizar o plano' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuthenticatedUser(request)
  } catch {
    return NextResponse.json({ error: 'Login obrigatorio' }, { status: 401 })
  }

  const deleted = await deletePlan(params.id)

  if (!deleted) {
    return NextResponse.json({ error: 'Plano nao encontrado' }, { status: 404 })
  }

  return NextResponse.json({ success: true, ok: true })
}
