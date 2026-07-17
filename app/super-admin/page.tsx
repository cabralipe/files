'use client'

import { supabase } from '@/lib/supabase-client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'


type Muni = {
  id: string
  slug: string
  name: string
  state: string
  is_active: boolean
  primary_color: string | null
  secondary_color: string | null
  contact_email: string | null
  logo_url: string | null
  created_at: string
}

type Stats = Record<string, { users: number; plans: number; experiences: number }>

async function token() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token
}

function slugify(name: string) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function SuperAdminPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const [list, setList] = useState<Muni[]>([])
  const [stats, setStats] = useState<Stats>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    state: '',
    contact_email: '',
    primary_color: '#E5394B',
    secondary_color: '#A6B0DD',
    admin_email: '',
    admin_name: '',
    admin_password: '',
  })

  const isSuper = profile?.permissions.managePlatform === true

  const load = useCallback(async () => {
    try {
      const t = await token()
      const res = await fetch('/api/super-admin/municipalities', {
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Erro ao carregar')
      setList(payload.data || [])
      setStats(payload.stats || {})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && user && isSuper) {
      void load()
    } else if (!authLoading) {
      setLoading(false)
    }
  }, [authLoading, user, isSuper, load])

  async function createMuni(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError('')
    try {
      const t = await token()
      const slug = form.slug || slugify(form.name)
      const payload: Record<string, unknown> = {
        name: form.name,
        slug,
        state: form.state.toUpperCase(),
        contact_email: form.contact_email || undefined,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
      }
      if (form.admin_email && form.admin_password && form.admin_name) {
        payload.admin_email = form.admin_email
        payload.admin_password = form.admin_password
        payload.admin_name = form.admin_name
      }
      const res = await fetch('/api/super-admin/municipalities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao criar')
      setForm({
        name: '',
        slug: '',
        state: '',
        contact_email: '',
        primary_color: '#E5394B',
        secondary_color: '#A6B0DD',
        admin_email: '',
        admin_name: '',
        admin_password: '',
      })
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar')
    } finally {
      setCreating(false)
    }
  }

  async function toggleActive(m: Muni) {
    const t = await token()
    await fetch(`/api/super-admin/municipalities/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
      body: JSON.stringify({ is_active: !m.is_active }),
    })
    void load()
  }

  if (authLoading || loading) {
    return <main style={{ padding: 24 }}>Carregando...</main>
  }

  if (!user) {
    return (
      <main style={{ padding: 24 }}>
        <p>É preciso estar autenticado como super admin.</p>
        <Link href="/auth/login">Entrar</Link>
      </main>
    )
  }

  if (!isSuper) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Acesso restrito</h1>
        <p>Sua conta não tem permissão de super admin.</p>
        <p style={{ fontSize: 13, color: '#777' }}>
          Solicite a concessão do papel de super administrador na gestão central da plataforma.
        </p>
      </main>
    )
  }

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>Super Admin</h1>
          <p style={{ marginTop: 4, color: '#666' }}>Gerencie os ambientes dos municípios</p>
        </div>
        <button
          className="btn btn-pri"
          onClick={() => setShowForm((s) => !s)}
          style={{ padding: '8px 16px' }}
        >
          {showForm ? 'Cancelar' : '+ Novo município'}
        </button>
      </header>

      {error && (
        <div style={{ padding: 10, background: '#ffe6e6', border: '1px solid #d33', marginBottom: 12 }}>
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={createMuni}
          style={{
            border: '2px solid #000',
            padding: 16,
            marginBottom: 20,
            background: 'var(--paper-soft, #FAF5E3)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          <Field label="Nome do município *">
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })}
              placeholder="São Paulo"
            />
          </Field>
          <Field label="Slug (URL) *">
            <input
              required
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
              placeholder="sao-paulo"
            />
          </Field>
          <Field label="UF *">
            <input
              required
              maxLength={2}
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase().slice(0, 2) })}
              placeholder="SP"
            />
          </Field>
          <Field label="E-mail de contato">
            <input
              type="email"
              value={form.contact_email}
              onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
              placeholder="contato@..."
            />
          </Field>
          <Field label="Cor primária">
            <input
              type="color"
              value={form.primary_color}
              onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
            />
          </Field>
          <Field label="Cor secundária">
            <input
              type="color"
              value={form.secondary_color}
              onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
            />
          </Field>
          <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #ccc', paddingTop: 10 }}>
            <strong>Admin inicial do município (opcional)</strong>
          </div>
          <Field label="Nome do admin">
            <input
              value={form.admin_name}
              onChange={(e) => setForm({ ...form, admin_name: e.target.value })}
            />
          </Field>
          <Field label="E-mail do admin">
            <input
              type="email"
              value={form.admin_email}
              onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
            />
          </Field>
          <Field label="Senha do admin (min. 6)">
            <input
              type="password"
              value={form.admin_password}
              onChange={(e) => setForm({ ...form, admin_password: e.target.value })}
            />
          </Field>
          <div style={{ gridColumn: '1 / -1' }}>
            <button className="btn btn-pri" type="submit" disabled={creating}>
              {creating ? 'Criando...' : 'Criar município'}
            </button>
          </div>
        </form>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', background: '#fff' }}>
        <thead style={{ background: '#000', color: '#fff' }}>
          <tr>
            <th style={th}>Nome</th>
            <th style={th}>Slug / URL</th>
            <th style={th}>UF</th>
            <th style={th}>Usuários</th>
            <th style={th}>Planos</th>
            <th style={th}>Experiências</th>
            <th style={th}>Status</th>
            <th style={th}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ padding: 16, textAlign: 'center' }}>
                Nenhum município. Crie o primeiro!
              </td>
            </tr>
          ) : (
            list.map((m) => {
              const s = stats[m.id] || { users: 0, plans: 0, experiences: 0 }
              return (
                <tr key={m.id} style={{ borderTop: '1px solid #ddd' }}>
                  <td style={td}>
                    <div
                      style={{
                        display: 'inline-block',
                        width: 14,
                        height: 14,
                        marginRight: 8,
                        verticalAlign: 'middle',
                        background: m.primary_color || '#000',
                      }}
                    />
                    {m.name}
                  </td>
                  <td style={td}>
                    <Link href={`/${m.slug}`} style={{ color: '#0070f3' }}>
                      /{m.slug}
                    </Link>
                  </td>
                  <td style={td}>{m.state}</td>
                  <td style={td}>{s.users}</td>
                  <td style={td}>{s.plans}</td>
                  <td style={td}>{s.experiences}</td>
                  <td style={td}>
                    <span
                      style={{
                        padding: '2px 8px',
                        background: m.is_active ? '#1e8e3e' : '#888',
                        color: '#fff',
                        fontSize: 12,
                      }}
                    >
                      {m.is_active ? 'ATIVO' : 'INATIVO'}
                    </span>
                  </td>
                  <td style={td}>
                    <button onClick={() => toggleActive(m)} className="btn btn-gh" style={{ marginRight: 4 }}>
                      {m.is_active ? 'Desativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </main>
  )
}

const th: React.CSSProperties = { padding: 10, textAlign: 'left', fontSize: 13 }
const td: React.CSSProperties = { padding: 10, fontSize: 14 }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
      <span style={{ fontWeight: 700 }}>{label}</span>
      {children}
    </label>
  )
}

