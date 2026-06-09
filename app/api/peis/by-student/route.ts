import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/supabase-server'
import { resolveMunicipality } from '@/lib/municipality'
import { getUserRole, canGeneratePei } from '@/lib/pei'
import { getLatestPeiForStudent } from '@/lib/public-backend'

export const dynamic = 'force-dynamic'

// Retorna o PEI mais recente do aluno (preferindo o vigente) para o professor
// regente decidir entre usar o PEI do AEE ou gerar o seu, combinando os dois.
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
    const pei = await getLatestPeiForStudent(studentId, municipality?.id)

    return NextResponse.json({ success: true, data: pei })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Login obrigatorio' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'BLOCKED') {
      return NextResponse.json({ error: 'Conta bloqueada' }, { status: 403 })
    }
    console.error('[GET /api/peis/by-student]', error)
    return NextResponse.json({ error: 'Nao foi possivel carregar o PEI do aluno' }, { status: 500 })
  }
}
