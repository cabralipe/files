'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type MunicipalityOption = {
  slug: string
  name: string
  state: string
}

// Porta de entrada do produto multitenant: em vez de adivinhar a rede do
// visitante, pergunta. Quem chega pelo link direto do município nunca vê esta
// página (cai direto em /<slug>).
export default function GlobalLanding() {
  const router = useRouter()
  const [municipalities, setMunicipalities] = useState<MunicipalityOption[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [state, setState] = useState('')
  const [slug, setSlug] = useState('')

  useEffect(() => {
    let active = true
    fetch('/api/municipalities')
      .then((r) => r.json())
      .then((payload) => {
        if (!active) return
        const list = (payload?.data || []) as MunicipalityOption[]
        setMunicipalities(list.filter((m) => m.slug && m.name))
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setLoadError('Não foi possível carregar as redes agora. Tente novamente em instantes.')
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const states = useMemo(
    () => Array.from(new Set(municipalities.map((m) => m.state).filter(Boolean))).sort(),
    [municipalities],
  )
  const options = useMemo(
    () =>
      municipalities
        .filter((m) => !state || m.state === state)
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [municipalities, state],
  )

  function go(e: React.FormEvent) {
    e.preventDefault()
    if (slug) router.push(`/${slug}`)
  }

  return (
    <div className="auth-shell">
      <div className="auth-box">
        <div className="auth-head">
          <div className="logo" style={{ justifyContent: 'center' }}>
            <div className="logo-ic">BN</div>
            <div style={{ textAlign: 'left' }}>
              <div className="logo-t">Portal BNCC</div>
              <div className="logo-s">Referencial Curricular Municipal</div>
            </div>
          </div>
          <span className="auth-eyebrow">Bem-vindo(a)</span>
          <h1 className="auth-title">
            Encontre a sua <em>rede de ensino</em>
          </h1>
          <p className="auth-sub">
            Cada município parceiro tem um portal próprio, com o referencial curricular
            adaptado à realidade local. Escolha abaixo para começar.
          </p>
        </div>

        <div className="auth-card">
          {loadError && <div className="al-error" style={{ marginBottom: 14 }}>{loadError}</div>}

          <form onSubmit={go}>
            <label className="fgr">
              <span className="fl">Estado</span>
              <select
                value={state}
                onChange={(e) => {
                  setState(e.target.value)
                  setSlug('')
                }}
                disabled={loading}
              >
                <option value="">{loading ? 'Carregando…' : 'Todos os estados'}</option>
                {states.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </label>

            <label className="fgr">
              <span className="fl">Município</span>
              <select value={slug} onChange={(e) => setSlug(e.target.value)} disabled={loading}>
                <option value="">
                  {loading ? 'Carregando…' : options.length ? 'Selecione o município' : 'Nenhuma rede disponível'}
                </option>
                {options.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.name}{m.state ? ` / ${m.state}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={!slug}
              className="btn btn-pri btn-lg"
              style={{ width: '100%', marginTop: 8 }}
            >
              Ir para o portal da minha rede →
            </button>
          </form>

          <p className="auth-alt">
            Sua rede ainda não é parceira?{' '}
            <Link href="/bncc-nacional" className="auth-link">
              Explore a BNCC Nacional
            </Link>
          </p>
        </div>

        <div style={{ textAlign: 'center' }}>
          <Link href="/auth/login" className="auth-back">Já tenho conta — entrar</Link>
        </div>
      </div>
    </div>
  )
}
