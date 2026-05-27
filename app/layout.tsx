import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Portal BNCC Computação',
  description: 'Portal publico para pesquisar habilidades BNCC e criar planos de aula',
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
