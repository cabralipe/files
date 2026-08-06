import { NextResponse } from 'next/server'
import { requireUserContext } from '@/lib/supabase-server'
import { getMunicipalityById } from '@/lib/municipality'
import { getRolePermissions } from '@/lib/authz-rules'
import { getSupabaseAdmin, getUserSchools } from '@/lib/supabase-server'

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

    let schoolName = ctx.school
    if (ctx.schoolId) {
      const { data: school } = await getSupabaseAdmin()
        .from('schools')
        .select('name')
        .eq('id', ctx.schoolId)
        .maybeSingle()
      schoolName = school?.name || schoolName
    }
    const schools = await getUserSchools(ctx.userId, ctx.municipalityId)
    // Fallback: usuarios sem school_id legado (ex.: vinculados so via
    // user_schools) ainda precisam de uma "escola padrao" para os forms
    // pre-preencherem school_id corretamente — sem isso o documento e criado
    // sem escola e some da fila do AEE/coordenacao.
    const primarySchoolId = ctx.schoolId || schools[0]?.id || null
    const primarySchoolName = ctx.schoolId ? schoolName : schools[0]?.name || schoolName

    return NextResponse.json({
      id: ctx.userId,
      email: ctx.email,
      fullName: ctx.fullName,
      role: ctx.role,
      blocked: ctx.blocked,
      mustChangePassword: ctx.mustChangePassword,
      municipality: municipality ? {
        id: municipality.id,
        slug: municipality.slug,
        name: municipality.name,
        state: municipality.state,
      } : null,
      school: primarySchoolId ? { id: primarySchoolId, name: primarySchoolName || 'Escola' } : null,
      schools: schools.map((school) => ({ id: school.id, name: school.name, municipality_id: school.municipality_id })),
      permissions: getRolePermissions(ctx.role),
      // Compatibilidade temporária com o redirecionamento antigo.
      municipality_slug: municipality?.slug || null,
      municipality_name: municipality?.name || null,
    }, { headers: { 'Cache-Control': 'private, no-store' } })
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
