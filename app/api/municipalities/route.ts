import { NextResponse } from 'next/server'
import { listActiveMunicipalities } from '@/lib/municipality'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

function publicMunicipality(
  municipality: Awaited<ReturnType<typeof listActiveMunicipalities>>[number],
  schoolOptions: { id: string; name: string }[],
) {
  const config = (municipality.config || {}) as { schools?: unknown }
  const schools = Array.isArray(config.schools)
    ? config.schools.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []

  return {
    id: municipality.id,
    slug: municipality.slug,
    name: municipality.name,
    state: municipality.state,
    logo_url: municipality.logo_url,
    primary_color: municipality.primary_color,
    secondary_color: municipality.secondary_color,
    schools,
    school_options: schoolOptions,
  }
}

export async function GET() {
  try {
    const municipalities = await listActiveMunicipalities()
    const { data: schoolRows, error: schoolError } = await getSupabaseAdmin()
      .from('schools')
      .select('id, name, municipality_id')
      .order('name')
    if (schoolError) throw schoolError
    return NextResponse.json({
      success: true,
      data: municipalities.map((municipality) => publicMunicipality(
        municipality,
        (schoolRows || [])
          .filter((school) => school.municipality_id === municipality.id)
          .map((school) => ({ id: school.id, name: school.name })),
      )),
    })
  } catch (error) {
    console.error('[GET /api/municipalities]', error)
    return NextResponse.json({ error: 'Nao foi possivel listar municipios' }, { status: 500 })
  }
}
