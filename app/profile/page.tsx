'use client'

import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
)

type UserProfile = {
  id: string
  full_name?: string
  name?: string
  email: string
  bio?: string | null
  total_points?: number
}

export default function Profile() {
  const router = useRouter()
  const { loading: authLoading, isAuthenticated, signOut } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({ full_name: '', bio: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
      return
    }

    if (isAuthenticated) {
      void fetchProfile()
    }
  }, [authLoading, isAuthenticated, router])

  async function getAccessToken() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token
  }

  async function fetchProfile() {
    try {
      setLoading(true)
      setError('')
      const token = await getAccessToken()
      const [profileResponse, pointsResponse] = await Promise.all([
        fetch('/api/profile', { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        fetch('/api/points', { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
      ])
      const profilePayload = await profileResponse.json()
      const pointsPayload = await pointsResponse.json()

      if (!profileResponse.ok) {
        throw new Error(profilePayload.error || 'Erro ao carregar perfil')
      }

      const nextProfile = {
        ...profilePayload.profile,
        total_points: pointsResponse.ok ? pointsPayload.total_points || 0 : 0,
      }

      setProfile(nextProfile)
      setFormData({
        full_name: nextProfile.full_name || nextProfile.name || '',
        bio: nextProfile.bio || '',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar perfil')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    try {
      setError('')
      setMessage('')
      const token = await getAccessToken()
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Erro ao salvar perfil')
      }

      setProfile((current) => ({
        ...(current || payload.profile),
        ...payload.profile,
        total_points: current?.total_points || 0,
      }))
      setEditing(false)
      setMessage('Perfil atualizado com sucesso.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar perfil')
    }
  }

  if (authLoading || loading) {
    return (
      <main className="auth-state">
        <div className="spin" />
        <p>Carregando perfil...</p>
      </main>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <main>
      <header id="hdr">
        <div className="hdr-in">
          <button className="logo" type="button" onClick={() => router.push('/')}>
            <div className="logo-ic">BN</div>
            <div>
              <div className="logo-t">Meu Perfil</div>
              <div className="logo-s">Dados do professor</div>
            </div>
          </button>
          <nav className="hdr-nav" aria-label="Acessos">
            <button
              className="nb"
              onClick={async () => {
                await signOut()
                router.push('/')
              }}
            >
              Sair
            </button>
          </nav>
        </div>
      </header>

      <section className="pg">
        {message && <div className="al-ok">{message}</div>}
        {error && <div className="al-error">{error}</div>}

        <div className="pc">
          <h1 className="pct">{profile?.full_name || profile?.name || 'Professor(a)'}</h1>
          <p className="muted">{profile?.email}</p>

          <div className="stat-row">
            <div>
              <strong>{profile?.total_points || 0}</strong>
              <span>Pontos</span>
            </div>
          </div>

          {editing ? (
            <div className="fg">
              <label className="fgr s2">
                <span className="fl">Nome</span>
                <input
                value={formData.full_name}
                  onChange={(event) => setFormData((current) => ({ ...current, full_name: event.target.value }))}
                />
              </label>
              <label className="fgr s2">
                <span className="fl">Bio</span>
                <textarea
                  value={formData.bio}
                  onChange={(event) => setFormData((current) => ({ ...current, bio: event.target.value }))}
                />
              </label>
              <div className="brow">
                <button className="btn btn-out" onClick={() => setEditing(false)} type="button">
                  Cancelar
                </button>
                <button className="btn btn-pri" onClick={handleSave} type="button">
                  Salvar
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="section-title">Bio</h2>
              <p className="plan-preview">{profile?.bio || 'Nenhuma bio adicionada ainda.'}</p>
              <button className="btn btn-pri" onClick={() => setEditing(true)} type="button">
                Editar perfil
              </button>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
