import { NextResponse } from 'next/server'
import { requireUserContext } from '@/lib/supabase-server'
import { getMunicipalityById } from '@/lib/municipality'

export const dynamic = 'force-dynamic'

/**
 * Identidade mínima para o front decidir o destino pós-login.
 * O papel e o município vêm da tabela `users` (fonte de verdade de
 * autorização), NÃO do user_metadata — que pode estar desatualizado.
 */
export async function GET(request: Request) {
  try {
    const ctx = await requireUserContext(request)
    const municipality = ctx.municipalityId ? await getMunicipalityById(ctx.municipalityId) : null

    return NextResponse.json({
      role: ctx.role,
      municipality_slug: municipality?.slug || null,
      municipality_name: municipality?.name || null,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Login obrigatorio' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'BLOCKED') {
      return NextResponse.json({ error: 'Conta bloqueada' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Erro ao carregar identidade' }, { status: 500 })
  }
}
