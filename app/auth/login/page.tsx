'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

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
      const meta = data.user?.user_metadata
      const role = meta?.role
      const slug = meta?.municipality_slug
      const dest = role === 'coordinator' ? 'coordinator' : role === 'aee_teacher' ? 'aee' : role === 'family' ? 'family' : ''
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
          <Link href="/" className="logo">
            <div className="logo-ic">BN</div>
            <div style={{ textAlign: 'left' }}>
              <div className="logo-t">Portal BNCC Computação</div>
              <div className="logo-s">Secretaria Municipal de Educação · Atalaia/AL</div>
            </div>
          </Link>
          <span className="auth-eyebrow">Área do professor</span>
          <h1 className="auth-title">
            {showForgotPassword ? <>Redefinir <em>senha</em></> : <>Acesso à <em>plataforma</em></>}
          </h1>
          <p className="auth-sub">
            {showForgotPassword
              ? 'Digite o email cadastrado e enviaremos um link para você criar uma nova senha.'
              : 'Faça login para criar planos, PEIs e PAEEs, e acompanhar suas turmas.'}
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
          <Link href="/" className="auth-back">← Voltar aos portais</Link>
        </div>
      </div>
    </div>
  )
}
