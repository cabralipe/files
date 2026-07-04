import { NextResponse } from 'next/server'
import { listActiveMunicipalities } from '@/lib/municipality'

export const dynamic = 'force-dynamic'

function publicMunicipality(municipality: Awaited<ReturnType<typeof listActiveMunicipalities>>[number]) {
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
  }
}

export async function GET() {
  try {
    const municipalities = await listActiveMunicipalities()
    return NextResponse.json({
      success: true,
      data: municipalities.map(publicMunicipality),
    })
  } catch (error) {
    console.error('[GET /api/municipalities]', error)
    return NextResponse.json({ error: 'Nao foi possivel listar municipios' }, { status: 500 })
  }
}