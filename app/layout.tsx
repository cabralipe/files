import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Portal BNCC · Referencial Curricular Municipal',
  description: 'Portal público para pesquisar habilidades da BNCC e criar planos de aula, PEIs e PAEEs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
