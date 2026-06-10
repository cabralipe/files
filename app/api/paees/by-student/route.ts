import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/supabase-server'
import { resolveMunicipality } from '@/lib/municipality'
import { getUserRole, canGeneratePei } from '@/lib/pei'
import { getLatestPaeeForStudent } from '@/lib/public-backend'

export const dynamic = 'force-dynamic'

// Retorna o PAEE mais recente do aluno (preferindo o vigente). Usado pelo
// painel AEE e pelos portais para sinalizar a articulacao PAEE <-> PEI.
export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request)
    const role = getUserRole(user)
    if (!canGeneratePei(role)) {
      return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })
    }

    const url = new URL(request.url)
    const studentId = url.searchParams.get('student_id') || ''
    if (!studentId) {
      return NextResponse.json({ error: 'student_id obrigatorio' }, { status: 400 })
    }

    const municipality = await resolveMunicipality(request)
    const paee = await getLatestPaeeForStudent(studentId, municipality?.id)

    return NextResponse.json({ success: true, data: paee })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Login obrigatorio' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'BLOCKED') {
      return NextResponse.json({ error: 'Conta bloqueada' }, { status: 403 })
    }
    console.error('[GET /api/paees/by-student]', error)
    return NextResponse.json({ error: 'Nao foi possivel carregar o PAEE do aluno' }, { status: 500 })
  }
}
