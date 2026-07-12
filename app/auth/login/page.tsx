'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase-client'

// Aceita apenas caminhos internos ("/algo"), nunca URLs externas ("//x", "http:").
function sanitizeNext(raw: string | null): string {
  if (!raw) return ''
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/auth')) return ''
  return raw
}

// Papel -> painel inicial dentro do município.
function roleDest(role: string): string {
  return role === 'coordinator' ? 'coordinator' : role === 'aee_teacher' ? 'aee' : role === 'family' ? 'family' : ''
}

export default function Login() {
  const router = useRouter()
  const { signIn, resetPassword, loading, error: authError } = useAuth()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMessage, setForgotMessage] = useState('')
  const [forgotSending, setForgotSending] = useState(false)

  // Contexto de origem: ?next=/<municipio>/... mantém o professor na rede dele.
  const [nextPath, setNextPath] = useState('')
  const [tenantLabel, setTenantLabel] = useState('')

  useEffect(() => {
    // Lido no cliente (evita Suspense de useSearchParams no build).
    const params = new URLSearchParams(window.location.search)
    const next = sanitizeNext(params.get('next'))
    setNextPath(next)

    const slug = next.split('/').filter(Boolean)[0] || ''
    if (!slug) return
    let active = true
    fetch('/api/municipalities')
      .then((r) => r.json())
      .then((payload) => {
        if (!active) return
        const m = (payload?.data || []).find((x: { slug?: string }) => x.slug === slug)
        if (m?.name) setTenantLabel(`Rede de ${m.name}${m.state ? '/' + m.state : ''}`)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    if (!formData.email || !formData.password) {
      setError('Email e senha são obrigatórios')
      return
    }

    try {
      const data = await signIn(formData.email, formData.password)

      // Se o professor veio de uma página específica (?next=), volta para ela.
      if (nextPath) {
        router.push(nextPath)
        return
      }

      // Destino pela tabela `users` (fonte de verdade de papel/município);
      // user_metadata fica apenas como fallback para contas antigas.
      let role = ''
      let slug = ''
      try {
        const { data: sess } = await supabase.auth.getSession()
        const token = sess.session?.access_token
        const res = await fetch('/api/auth/whoami', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (res.ok) {
          const who = await res.json()
          role = String(who.role || '')
          slug = String(who.municipality_slug || '')
        }
      } catch { /* segue no fallback */ }

      const meta = data.user?.user_metadata
      if (!role) role = String(meta?.role || '')
      if (!slug) slug = String(meta?.municipality_slug || '')

      const dest = roleDest(role)
      // Rotas por papel vivem sob /[municipio]; sem o slug elas dao 404.
      router.push(slug ? `/${slug}${dest ? `/${dest}` : ''}` : '/')
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login')
    }
  }

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setForgotMessage('')

    if (!forgotEmail.trim()) {
      setError('Informe o email cadastrado para receber o link.')
      return
    }

    try {
      setForgotSending(true)
      await resetPassword(forgotEmail.trim())
      setForgotMessage('Pronto! Se o email estiver cadastrado, você receberá um link para redefinir a senha.')
    } catch (err: any) {
      setError(err.message || 'Não foi possível enviar o link. Tente novamente.')
    } finally {
      setForgotSending(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-box">
        <div className="auth-head">
          <Link href={nextPath || '/'} className="logo">
            <div className="logo-ic">BN</div>
            <div style={{ textAlign: 'left' }}>
              <div className="logo-t">Portal BNCC</div>
              <div className="logo-s">Referencial Curricular Municipal</div>
            </div>
          </Link>
          <span className="auth-eyebrow">{tenantLabel || 'Acesso à plataforma'}</span>
          <h1 className="auth-title">
            {showForgotPassword ? <>Redefinir <em>senha</em></> : <>Entrar na sua <em>rede de ensino</em></>}
          </h1>
          <p className="auth-sub">
            {showForgotPassword
              ? 'Digite o email cadastrado e enviaremos um link para você criar uma nova senha.'
              : 'Use a conta criada com o email da sua rede. Depois de entrar, você volta para onde estava.'}
          </p>
        </div>

        <div className="auth-card">
          {(error || authError) && (
            <div className="al-error" style={{ marginBottom: 14 }}>
              {error || authError}
            </div>
          )}
          {forgotMessage && (
            <div className="al-ok" style={{ marginBottom: 14 }}>
              {forgotMessage}
            </div>
          )}

          {!showForgotPassword ? (
            <>
              <form onSubmit={handleSubmit}>
                <label className="fgr">
                  <span className="fl">Email</span>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="seu@email.com"
                  />
                </label>

                <label className="fgr">
                  <span className="fl">Senha</span>
                  <input
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                  />
                </label>

                <div className="auth-row">
                  <button
                    type="button"
                    className="auth-ghost"
                    onClick={() => {
                      setShowForgotPassword(true)
                      setError('')
                      setForgotMessage('')
                      setForgotEmail(formData.email)
                    }}
                  >
                    Esqueceu a senha?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-pri btn-lg"
                  style={{ width: '100%', marginTop: 8 }}
                >
                  {loading ? 'Entrando...' : 'Fazer login →'}
                </button>
              </form>

              <p className="auth-alt">
                Não tem conta?{' '}
                <Link href="/auth/signup" className="auth-link">
                  Cadastre-se como professor
                </Link>
              </p>
            </>
          ) : (
            <form onSubmit={handleForgotPassword}>
              <label className="fgr">
                <span className="fl">Email cadastrado</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              </label>
              <button
                type="submit"
                disabled={forgotSending}
                className="btn btn-pri btn-lg"
                style={{ width: '100%', marginTop: 8 }}
              >
                {forgotSending ? 'Enviando...' : 'Enviar link de redefinição'}
              </button>
              <button
                type="button"
                className="btn btn-out"
                style={{ width: '100%', marginTop: 8 }}
                onClick={() => {
                  setShowForgotPassword(false)
                  setError('')
                  setForgotMessage('')
                }}
              >
                ← Voltar para o login
              </button>
            </form>
          )}
        </div>

        <div style={{ textAlign: 'center' }}>
          <Link href={nextPath || '/'} className="auth-back">
            {nextPath ? '← Voltar para onde eu estava' : '← Voltar aos portais'}
          </Link>
        </div>
      </div>
    </div>
  )
}
