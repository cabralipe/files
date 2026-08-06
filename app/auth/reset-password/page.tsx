'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { useAuth } from '@/hooks/useAuth'
import { roleHomePath } from '@/lib/auth-navigation'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { profile, loading: authLoading, refreshProfile } = useAuth()
  const [ready, setReady] = useState<boolean | null>(null)
  const [firstAccess, setFirstAccess] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    setFirstAccess(new URLSearchParams(window.location.search).get('first') === '1')
    void supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!authLoading && firstAccess && profile && !profile.mustChangePassword) {
      router.replace(roleHomePath(profile))
    }
  }, [authLoading, firstAccess, profile, router])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (password.length < 8) {
      setError('A nova senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (password !== confirmation) {
      setError('As senhas não coincidem.')
      return
    }

    setSaving(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) throw new Error('Sessão expirada. Solicite um novo link.')
      const response = await fetch('/api/auth/password-changed', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Erro ao concluir a troca de senha')
      const nextProfile = await refreshProfile()
      setMessage('Senha atualizada com sucesso.')
      setTimeout(() => {
        window.location.replace(nextProfile ? roleHomePath(nextProfile) : '/auth/login')
      }, 700)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível atualizar a senha')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-box">
        <div className="auth-head">
          <span className="auth-eyebrow">Segurança da conta</span>
          <h1 className="auth-title">{firstAccess ? 'Crie sua senha pessoal' : 'Defina uma nova senha'}</h1>
          <p className="auth-sub">
            {firstAccess
              ? 'A senha entregue pela gestão é provisória. Escolha uma senha pessoal para continuar.'
              : 'Use uma senha com pelo menos 8 caracteres.'}
          </p>
        </div>
        <div className="auth-card">
          {error && <div className="al-error" style={{ marginBottom: 14 }}>{error}</div>}
          {message && <div className="al-ok" style={{ marginBottom: 14 }}>{message}</div>}
          {ready === null ? (
            <p>Validando sua sessão...</p>
          ) : !ready ? (
            <div>
              <p>O link é inválido, expirou ou a sessão não está disponível.</p>
              <Link className="auth-link" href="/auth/login">Voltar ao login</Link>
            </div>
          ) : (
            <form onSubmit={submit}>
              <label className="fgr">
                <span className="fl">Nova senha</span>
                <input type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
              </label>
              <label className="fgr">
                <span className="fl">Confirmar nova senha</span>
                <input type="password" autoComplete="new-password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />
              </label>
              <button className="btn btn-pri btn-lg" style={{ width: '100%' }} disabled={saving}>
                {saving ? 'Atualizando...' : 'Salvar nova senha'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
