import Link from 'next/link'
import type { Metadata } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'BNCC Plataforma · Selecione seu município',
  description:
    'Plataforma de planos de aula alinhados à BNCC. Selecione seu município para começar.',
}

type MuniRow = {
  slug: string
  name: string
  state: string
  logo_url: string | null
  primary_color: string | null
}

async function listActiveMunicipalities(): Promise<MuniRow[]> {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('municipalities')
      .select('slug,name,state,logo_url,primary_color')
      .eq('is_active', true)
      .order('name', { ascending: true })
    if (error) return []
    return (data as MuniRow[]) || []
  } catch {
    return []
  }
}

export default async function GlobalLanding() {
  const municipalities = await listActiveMunicipalities()

  return (
    <main className="pg" style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="logo-ic">BN</div>
          <div>
            <div className="logo-t">BNCC Plataforma</div>
            <div className="logo-s">Selecione seu município para começar</div>
          </div>
        </div>
      </header>

      <section>
        <h1 style={{ fontSize: 28, marginBottom: 6 }}>Municípios disponíveis</h1>
        <p style={{ marginBottom: 20, color: 'var(--ink-soft, #555)' }}>
          Cada município tem seu próprio portal com planos, experiências, ranking e galeria.
        </p>

        {municipalities.length === 0 ? (
          <div className="est" style={{ padding: 24, border: '2px dashed #ccc' }}>
            Nenhum município ativo no momento. Procure o administrador da plataforma.
          </div>
        ) : (
          <ul
            className="muni-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 12,
              listStyle: 'none',
              padding: 0,
            }}
          >
            {municipalities.map((m) => (
              <li key={m.slug}>
                <Link
                  href={`/${m.slug}`}
                  className="scard"
                  style={{
                    display: 'block',
                    padding: 16,
                    border: '2px solid #000',
                    textDecoration: 'none',
                    color: 'inherit',
                    background: 'var(--paper-soft, #FAF5E3)',
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 0,
                      background: m.primary_color || '#E5394B',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      marginBottom: 10,
                    }}
                  >
                    {m.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{m.name}</div>
                  <div style={{ color: '#777', fontSize: 13 }}>{m.state}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div style={{ marginTop: 28, fontSize: 13 }}>
          <Link href="/super-admin" style={{ color: '#777' }}>
            Acesso administrativo
          </Link>
        </div>
      </section>
    </main>
  )
}
