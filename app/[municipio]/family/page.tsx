'use client'

import { useEffect, useState } from 'react'
import Link from '@/lib/m-link'
import { createClient } from '@supabase/supabase-js'
import { useAuth } from '@/hooks/useAuth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
)

type FamilyPei = {
  id: string
  title: string
  content: string
  is_published: boolean
  plan_status?: string
  consulta_familia?: Record<string, string>
  created_at: string
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token
}

export default function FamilyPage() {
  const { user, loading: authLoading } = useAuth()
  const [peis, setPeis] = useState<FamilyPei[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }

    async function loadPeis() {
      try {
        setLoading(true)
        const token = await getAccessToken()
        const response = await fetch('/api/family/peis', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'Erro ao carregar PEIs')
        setPeis(payload.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar PEIs')
      } finally {
        setLoading(false)
      }
    }

    void loadPeis()
  }, [authLoading, user])

  return (
    <main>
      <header id="hdr">
        <div className="hdr-in">
          <Link href="/" className="logo">
            <div className="logo-ic">PEI</div>
            <div>
              <div className="logo-t">Acesso da familia</div>
              <div className="logo-s">Consulta e ciencia do PEI</div>
            </div>
          </Link>
        </div>
      </header>

      <section className="pg">
        <div className="saved-head">
          <div>
            <h1>PEIs vinculados</h1>
            <p>Area restrita para responsaveis legais.</p>
          </div>
        </div>

        {!user && <div className="al-error">Faca login com a conta de familia/responsavel.</div>}
        {error && <div className="al-error">{error}</div>}
        {loading && <div className="est">Carregando PEIs...</div>}

        {!loading && user && (
          <div className="plans-grid">
            {peis.length ? peis.map((pei) => (
              <article className="plan-item" key={pei.id}>
                <div className="pi-header">
                  <div>
                    <h2 className="pi-title">{pei.title}</h2>
                    <div className="pi-date">{new Date(pei.created_at).toLocaleString('pt-BR')}</div>
                  </div>
                </div>
                <div className="pi-meta">
                  <span className="tag tcd">{pei.is_published ? 'Vigente' : 'Rascunho'}</span>
                  <span className="tag ta">{pei.consulta_familia?.concordancia || 'pendente'}</span>
                </div>
                <p className="plan-preview">{pei.content?.slice(0, 260) || 'PEI sem conteudo disponivel.'}</p>
              </article>
            )) : (
              <div className="est">Nenhum PEI vinculado a esta conta ainda.</div>
            )}
          </div>
        )}
      </section>
    </main>
  )
}
