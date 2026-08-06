import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getMunicipalityBySlug } from '@/lib/municipality'
import { MunicipalityProvider } from '@/lib/municipality-context'
import AppHeader from '@/components/AppHeader'

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

  // --blue-wash é um token de design compartilhado (tags, chips, o card "Anos
  // Finais" etc.) — nao deve ser sobrescrito pela cor secundaria do municipio,
  // que pode ser um tom saturado (ex.: Colonia Leopoldina) e quebrar o
  // contraste em qualquer componente que use essa variavel.
  const styleVars: Record<string, string> = {}
  if (municipality.primary_color) styleVars['--red'] = municipality.primary_color

  return (
    <div style={styleVars as React.CSSProperties}>
      <MunicipalityProvider municipality={municipality}>
        <AppHeader />
        {children}
      </MunicipalityProvider>
    </div>
  )
}
