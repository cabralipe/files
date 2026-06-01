import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getMunicipalityBySlug } from '@/lib/municipality'
import { MunicipalityProvider } from '@/lib/municipality-context'

export async function generateMetadata({
  params,
}: {
  params: { municipio: string }
}): Promise<Metadata> {
  const m = await getMunicipalityBySlug(params.municipio)
  if (!m) return { title: 'BNCC Plataforma' }
  return {
    title: `Portal BNCC · ${m.name}/${m.state}`,
    description: `Portal de planos BNCC do município de ${m.name}/${m.state}`,
  }
}

export default async function MunicipalityLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { municipio: string }
}) {
  const municipality = await getMunicipalityBySlug(params.municipio)
  if (!municipality) notFound()

  const styleVars: Record<string, string> = {}
  if (municipality.primary_color) styleVars['--red'] = municipality.primary_color
  if (municipality.secondary_color) styleVars['--blue-wash'] = municipality.secondary_color

  return (
    <div style={styleVars as React.CSSProperties}>
      <MunicipalityProvider municipality={municipality}>{children}</MunicipalityProvider>
    </div>
  )
}
