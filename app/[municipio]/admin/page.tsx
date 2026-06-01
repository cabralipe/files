'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from '@/lib/m-link'
import { useRouter } from '@/lib/m-link'
import { createClient } from '@supabase/supabase-js'
import { useAuth } from '@/hooks/useAuth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
)

type AdminUser = {
  id: string
  email: string
  name?: string
  role?: string
  school?: string
  blocked?: boolean
  created_at?: string
}

type Experience = {
  id: string
  title: string
  author?: string
  author_name?: string
  created_at: string
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token
}

export default function AdminDashboard() {
  const router = useRouter()
  const { user, loading: authLoading, isAuthenticated, signOut } = useAuth()

  const [activeTab, setActiveTab] = useState<'users' | 'experiences'>('users')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')

  // Edit modal state
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [editForm, setEditForm] = useState({
    email: '',
    password: '',
    role: 'teacher',
    school: '',
    blocked: false,
  })

  const isAdmin =
    user?.user_metadata?.role === 'admin' || user?.email === 'admin@bncc.local'

  // Auto-dismiss messages
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(''), 3000)
    return () => clearTimeout(timer)
  }, [message])

  const stats = useMemo(() => {
    const teachers = users.filter((u) => u.role === 'teacher').length
    const coordinators = users.filter((u) => u.role === 'coordinator').length
    return {
      totalUsers: users.length,
      teachers,
      coordinators,
      experiences: experiences.length,
    }
  }, [users, experiences])

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users
    const q = search.toLowerCase()
    return users.filter(
      (u) =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q),
    )
  }, [users, search])

  const fetchUsers = useCallback(async () => {
    try {
      const token = await getAccessToken()
      const res = await fetch('/api/admin/users', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Erro ao carregar usuários')
      setUsers(payload.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar usuários')
    }
  }, [])

  const fetchExperiences = useCallback(async () => {
    try {
      const token = await getAccessToken()
      const res = await fetch('/api/admin/experiences', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Erro ao carregar experiências')
      setExperiences(payload.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar experiências')
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }
    if (!isAdmin) {
      setLoading(false)
      return
    }
    void (async () => {
      setLoading(true)
      setError('')
      await Promise.all([fetchUsers(), fetchExperiences()])
      setLoading(false)
    })()
  }, [authLoading, isAuthenticated, isAdmin, router, fetchUsers, fetchExperiences])

  // ─── User actions ───

  function openEditModal(u: AdminUser) {
    setEditingUser(u)
    setEditForm({
      email: u.email || '',
      password: '',
      role: u.role || 'teacher',
      school: u.school || '',
      blocked: !!u.blocked,
    })
  }

  async function saveUser() {
    if (!editingUser) return
    try {
      const token = await getAccessToken()
      const body: Record<string, unknown> = {
        userId: editingUser.id,
        email: editForm.email,
        role: editForm.role,
        school: editForm.school,
        blocked: editForm.blocked,
      }
      if (editForm.password.trim()) body.password = editForm.password
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Erro ao salvar usuário')
      setMessage('Usuário atualizado com sucesso.')
      setEditingUser(null)
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    }
  }

  async function toggleBlock(u: AdminUser) {
    try {
      const token = await getAccessToken()
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId: u.id, blocked: !u.blocked }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Erro ao alterar status')
      setMessage(u.blocked ? 'Usuário desbloqueado.' : 'Usuário bloqueado.')
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar status')
    }
  }

  async function deleteUser(u: AdminUser) {
    if (!window.confirm(`Deletar o usuário "${u.name || u.email}"? Esta ação é irreversível.`)) return
    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/admin/users?userId=${u.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Erro ao deletar')
      setMessage('Usuário deletado.')
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar')
    }
  }

  async function deleteExperience(exp: Experience) {
    if (!window.confirm(`Deletar a experiência "${exp.title}"? Esta ação é irreversível.`)) return
    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/admin/experiences?id=${exp.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Erro ao deletar experiência')
      setMessage('Experiência deletada.')
      await fetchExperiences()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar experiência')
    }
  }

  // ─── Role label helper ───
  function roleLabel(role?: string) {
    switch (role) {
      case 'admin': return 'Admin'
      case 'coordinator': return 'Coordenador'
      case 'teacher': return 'Professor'
      default: return role || '—'
    }
  }

  function roleBadgeColor(role?: string) {
    switch (role) {
      case 'admin': return { bg: 'var(--plum)', color: 'var(--paper-soft)' }
      case 'coordinator': return { bg: 'var(--blue)', color: 'var(--paper-soft)' }
      case 'teacher': return { bg: 'var(--teal)', color: 'var(--paper-soft)' }
      default: return { bg: 'var(--paper)', color: 'var(--ink)' }
    }
  }

  // ─── Loading state ───
  if (authLoading || loading) {
    return (
      <main className="auth-state">
        <div className="spin" />
        <p>Carregando painel de administração...</p>
      </main>
    )
  }

  // ─── Non-admin guard ───
  if (!isAdmin) {
    return (
      <main className="auth-state">
        <div style={{
          background: 'var(--red-wash)',
          border: '2px solid var(--red)',
          padding: '24px 32px',
          textAlign: 'center',
          maxWidth: 420,
          boxShadow: '3px 3px 0 var(--ink)',
          borderRadius: 0,
        }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: 48,
            color: 'var(--red)',
            marginBottom: 8,
            fontStyle: 'italic',
          }}>✕</div>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 20,
            marginBottom: 8,
            color: 'var(--ink)',
          }}>Acesso restrito</p>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--ink-soft)',
            marginBottom: 16,
          }}>Este painel é exclusivo para administradores.</p>
          <Link
            href="/"
            className="btn btn-pri"
          >
            Voltar ao Portal
          </Link>
        </div>
      </main>
    )
  }

  // ─── Main render ───
  return (
    <main>
      {/* ══════ HEADER ══════ */}
      <header id="hdr">
        <div className="hdr-in">
          <Link href="/" className="logo">
            <div className="logo-ic">BN</div>
            <div>
              <div className="logo-t">Painel do Superusuário</div>
              <div className="logo-s">Gerenciamento Global</div>
            </div>
          </Link>
          <nav className="hdr-nav" aria-label="Navegação admin">
            <Link className="nb" href="/">
              Portal
            </Link>
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
        {/* ══════ PAGE TITLE ══════ */}
        <div className="saved-head" style={{ marginBottom: 24 }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: 'clamp(26px, 5vw, 36px)',
              letterSpacing: '-.02em',
              color: 'var(--ink)',
              lineHeight: 1.1,
              marginBottom: 6,
              fontVariationSettings: '"opsz" 144',
            }}>
              Administração
            </h1>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              color: 'var(--ink-muted)',
              lineHeight: 1.5,
            }}>
              Gerencie usuários, experiências e configurações da plataforma.
            </p>
          </div>
        </div>

        {/* ══════ MESSAGES ══════ */}
        {error && (
          <div
            style={{
              background: 'var(--red-wash)',
              border: '2px solid var(--red)',
              padding: '10px 14px',
              fontSize: 13,
              color: 'var(--red-deep)',
              marginBottom: 16,
              borderRadius: 0,
              fontFamily: 'var(--font-body)',
            }}
          >
            {error}
            <button
              onClick={() => setError('')}
              style={{
                float: 'right',
                background: 'none',
                border: 'none',
                color: 'var(--red-deep)',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
              }}
            >
              ×
            </button>
          </div>
        )}
        {message && (
          <div
            style={{
              background: 'var(--teal-wash)',
              border: '2px solid var(--teal)',
              padding: '10px 14px',
              fontSize: 13,
              color: 'var(--teal-deep)',
              marginBottom: 16,
              borderRadius: 0,
              fontFamily: 'var(--font-body)',
            }}
          >
            {message}
          </div>
        )}

        {/* ══════ STATS BAR ══════ */}
        <div className="coord-stats">
          <div style={{ background: 'var(--red-wash)' }}>
            <strong>{stats.totalUsers}</strong>
            <span style={{ display: 'block', marginTop: 4 }}>Total Usuários</span>
          </div>
          <div style={{ background: 'var(--mustard-wash)' }}>
            <strong>{stats.teachers}</strong>
            <span style={{ display: 'block', marginTop: 4 }}>Professores</span>
          </div>
          <div style={{ background: 'var(--teal-wash)' }}>
            <strong>{stats.coordinators}</strong>
            <span style={{ display: 'block', marginTop: 4 }}>Coordenadores</span>
          </div>
          <div style={{ background: 'var(--blue-wash)' }}>
            <strong>{stats.experiences}</strong>
            <span style={{ display: 'block', marginTop: 4 }}>Experiências</span>
          </div>
        </div>

        {/* ══════ TAB BAR ══════ */}
        <div style={{
          display: 'flex',
          borderBottom: '3px solid var(--ink)',
          marginBottom: 24,
          gap: 0,
        }}>
          {(['users', 'experiences'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              type="button"
              style={{
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                fontSize: 13,
                padding: '12px 24px',
                border: '2px solid var(--ink)',
                borderBottom: activeTab === tab ? '3px solid var(--paper)' : '2px solid var(--ink)',
                background: activeTab === tab ? 'var(--ink)' : 'var(--paper-soft)',
                color: activeTab === tab ? 'var(--paper)' : 'var(--ink)',
                cursor: 'pointer',
                borderRadius: 0,
                marginBottom: -3,
                position: 'relative',
                transition: 'background .15s, color .15s',
                letterSpacing: '.01em',
              }}
            >
              {tab === 'users' ? 'Usuários' : 'Experiências'}
            </button>
          ))}
        </div>

        {/* ══════ USERS TAB ══════ */}
        {activeTab === 'users' && (
          <>
            {/* Search */}
            <div className="fbar" style={{ marginBottom: 20 }}>
              <div className="sw">
                <div className="sw-icon">?</div>
                <input
                  type="text"
                  placeholder="Buscar por nome ou email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <span className="fcount">{filteredUsers.length} usuário(s)</span>
            </div>

            {/* Users table */}
            <div style={{
              background: 'var(--paper-soft)',
              border: '2.5px solid var(--ink)',
              boxShadow: 'var(--stamp)',
              borderRadius: 0,
              overflow: 'hidden',
            }}>
              {/* Table header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1.4fr 0.7fr 0.9fr 0.6fr 1.2fr',
                gap: 12,
                padding: '12px 14px',
                background: 'var(--mustard)',
                borderBottom: '2px solid var(--ink)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 800,
                fontSize: 11,
                textTransform: 'uppercase' as const,
                letterSpacing: '.06em',
                color: 'var(--ink)',
              }}>
                <span>Nome</span>
                <span>Email</span>
                <span>Cargo</span>
                <span>Escola</span>
                <span>Status</span>
                <span>Ações</span>
              </div>

              {/* Table rows */}
              {filteredUsers.length === 0 ? (
                <div className="est">Nenhum usuário encontrado.</div>
              ) : (
                filteredUsers.map((u, idx) => (
                  <div
                    key={u.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.2fr 1.4fr 0.7fr 0.9fr 0.6fr 1.2fr',
                      gap: 12,
                      padding: '12px 14px',
                      background: idx % 2 === 0 ? 'var(--paper-soft)' : 'var(--paper)',
                      borderBottom: '1px solid var(--ink-faint)',
                      alignItems: 'center',
                      transition: 'background .12s',
                      fontSize: 13,
                      fontFamily: 'var(--font-body)',
                      color: 'var(--ink)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--paper-deep)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = idx % 2 === 0 ? 'var(--paper-soft)' : 'var(--paper)'
                    }}
                  >
                    {/* Nome */}
                    <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.name || '—'}
                    </span>

                    {/* Email */}
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: 'var(--ink-soft)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {u.email}
                    </span>

                    {/* Cargo badge */}
                    <span>
                      <span style={{
                        display: 'inline-block',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: 'uppercase' as const,
                        letterSpacing: '.08em',
                        padding: '3px 8px',
                        border: '1.5px solid var(--ink)',
                        borderRadius: 0,
                        background: roleBadgeColor(u.role).bg,
                        color: roleBadgeColor(u.role).color,
                      }}>
                        {roleLabel(u.role)}
                      </span>
                    </span>

                    {/* Escola */}
                    <span style={{
                      fontSize: 12,
                      color: 'var(--ink-muted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {u.school || '—'}
                    </span>

                    {/* Status */}
                    <span>
                      <span style={{
                        display: 'inline-block',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase' as const,
                        letterSpacing: '.06em',
                        padding: '2px 6px',
                        border: '1.5px solid var(--ink)',
                        borderRadius: 0,
                        background: u.blocked ? 'var(--red)' : 'var(--teal)',
                        color: 'var(--paper-soft)',
                      }}>
                        {u.blocked ? 'Bloqueado' : 'Ativo'}
                      </span>
                    </span>

                    {/* Actions */}
                    <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => openEditModal(u)}
                        type="button"
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontWeight: 600,
                          fontSize: 11,
                          padding: '6px 10px',
                          border: '2px solid var(--ink)',
                          borderRadius: 0,
                          background: 'var(--ink)',
                          color: 'var(--paper)',
                          cursor: 'pointer',
                          transition: 'transform .12s, box-shadow .12s',
                          boxShadow: '2px 2px 0 var(--ink)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translate(-1px, -1px)'
                          e.currentTarget.style.boxShadow = '3px 3px 0 var(--ink)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translate(0, 0)'
                          e.currentTarget.style.boxShadow = '2px 2px 0 var(--ink)'
                        }}
                        onMouseDown={(e) => {
                          e.currentTarget.style.transform = 'translate(2px, 2px)'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                        onMouseUp={(e) => {
                          e.currentTarget.style.transform = 'translate(-1px, -1px)'
                          e.currentTarget.style.boxShadow = '3px 3px 0 var(--ink)'
                        }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => toggleBlock(u)}
                        type="button"
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontWeight: 600,
                          fontSize: 11,
                          padding: '6px 10px',
                          border: '2px solid var(--ink)',
                          borderRadius: 0,
                          background: u.blocked ? 'var(--teal)' : 'var(--red)',
                          color: 'white',
                          cursor: 'pointer',
                          transition: 'transform .12s, box-shadow .12s',
                          boxShadow: '2px 2px 0 var(--ink)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translate(-1px, -1px)'
                          e.currentTarget.style.boxShadow = '3px 3px 0 var(--ink)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translate(0, 0)'
                          e.currentTarget.style.boxShadow = '2px 2px 0 var(--ink)'
                        }}
                        onMouseDown={(e) => {
                          e.currentTarget.style.transform = 'translate(2px, 2px)'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                        onMouseUp={(e) => {
                          e.currentTarget.style.transform = 'translate(-1px, -1px)'
                          e.currentTarget.style.boxShadow = '3px 3px 0 var(--ink)'
                        }}
                      >
                        {u.blocked ? 'Desbloquear' : 'Bloquear'}
                      </button>
                      <button
                        onClick={() => deleteUser(u)}
                        type="button"
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontWeight: 600,
                          fontSize: 11,
                          padding: '6px 10px',
                          border: '2px solid var(--ink)',
                          borderRadius: 0,
                          background: 'var(--paper)',
                          color: 'var(--red)',
                          cursor: 'pointer',
                          transition: 'transform .12s, box-shadow .12s',
                          boxShadow: '2px 2px 0 var(--ink)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translate(-1px, -1px)'
                          e.currentTarget.style.boxShadow = '3px 3px 0 var(--ink)'
                          e.currentTarget.style.background = 'var(--red)'
                          e.currentTarget.style.color = 'white'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translate(0, 0)'
                          e.currentTarget.style.boxShadow = '2px 2px 0 var(--ink)'
                          e.currentTarget.style.background = 'var(--paper)'
                          e.currentTarget.style.color = 'var(--red)'
                        }}
                        onMouseDown={(e) => {
                          e.currentTarget.style.transform = 'translate(2px, 2px)'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                        onMouseUp={(e) => {
                          e.currentTarget.style.transform = 'translate(-1px, -1px)'
                          e.currentTarget.style.boxShadow = '3px 3px 0 var(--ink)'
                        }}
                      >
                        Deletar
                      </button>
                    </span>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* ══════ EXPERIENCES TAB ══════ */}
        {activeTab === 'experiences' && (
          <div style={{
            background: 'var(--paper-soft)',
            border: '2.5px solid var(--ink)',
            boxShadow: 'var(--stamp)',
            borderRadius: 0,
            overflow: 'hidden',
          }}>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.5fr 1fr 0.8fr 0.6fr',
              gap: 12,
              padding: '12px 14px',
              background: 'var(--mustard)',
              borderBottom: '2px solid var(--ink)',
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
              fontSize: 11,
              textTransform: 'uppercase' as const,
              letterSpacing: '.06em',
              color: 'var(--ink)',
            }}>
              <span>Título</span>
              <span>Autor</span>
              <span>Data</span>
              <span>Ações</span>
            </div>

            {experiences.length === 0 ? (
              <div className="est">Nenhuma experiência encontrada.</div>
            ) : (
              experiences.map((exp, idx) => (
                <div
                  key={exp.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.5fr 1fr 0.8fr 0.6fr',
                    gap: 12,
                    padding: '12px 14px',
                    background: idx % 2 === 0 ? 'var(--paper-soft)' : 'var(--paper)',
                    borderBottom: '1px solid var(--ink-faint)',
                    alignItems: 'center',
                    transition: 'background .12s',
                    fontSize: 13,
                    fontFamily: 'var(--font-body)',
                    color: 'var(--ink)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--paper-deep)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = idx % 2 === 0 ? 'var(--paper-soft)' : 'var(--paper)'
                  }}
                >
                  {/* Title */}
                  <span style={{
                    fontWeight: 700,
                    fontFamily: 'var(--font-display)',
                    fontSize: 14,
                    letterSpacing: '-.01em',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {exp.title}
                  </span>

                  {/* Author */}
                  <span style={{
                    fontSize: 13,
                    color: 'var(--ink-soft)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {exp.author_name || exp.author || '—'}
                  </span>

                  {/* Date */}
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--ink-muted)',
                  }}>
                    {new Date(exp.created_at).toLocaleDateString('pt-BR')}
                  </span>

                  {/* Delete action */}
                  <span>
                    <button
                      onClick={() => deleteExperience(exp)}
                      type="button"
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontWeight: 600,
                        fontSize: 11,
                        padding: '6px 12px',
                        border: '2px solid var(--ink)',
                        borderRadius: 0,
                        background: 'var(--red)',
                        color: 'white',
                        cursor: 'pointer',
                        transition: 'transform .12s, box-shadow .12s',
                        boxShadow: '2px 2px 0 var(--ink)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translate(-1px, -1px)'
                        e.currentTarget.style.boxShadow = '3px 3px 0 var(--ink)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translate(0, 0)'
                        e.currentTarget.style.boxShadow = '2px 2px 0 var(--ink)'
                      }}
                      onMouseDown={(e) => {
                        e.currentTarget.style.transform = 'translate(2px, 2px)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                      onMouseUp={(e) => {
                        e.currentTarget.style.transform = 'translate(-1px, -1px)'
                        e.currentTarget.style.boxShadow = '3px 3px 0 var(--ink)'
                      }}
                    >
                      Deletar
                    </button>
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* ══════ DECORATIVE HALFTONE ══════ */}
        <div
          aria-hidden="true"
          style={{
            marginTop: 48,
            height: 8,
            background: 'linear-gradient(90deg, var(--red) 0 25%, var(--mustard) 25% 50%, var(--teal) 50% 75%, var(--blue) 75% 100%)',
            mixBlendMode: 'multiply' as const,
            opacity: 0.6,
          }}
        />
      </section>

      {/* ══════ EDIT MODAL ══════ */}
      {editingUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(27, 26, 31, 0.6)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            zIndex: 500,
            padding: '48px 16px',
            overflowY: 'auto',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingUser(null)
          }}
        >
          <div style={{
            background: 'var(--paper-soft)',
            border: '3px solid var(--ink)',
            boxShadow: '5px 5px 0 var(--ink)',
            maxWidth: 520,
            width: '100%',
            padding: '28px 24px',
            borderRadius: 0,
            position: 'relative',
            margin: 'auto 0',
          }}>
            {/* Modal header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 14,
              marginBottom: 18,
              paddingBottom: 14,
              borderBottom: '2px solid var(--ink)',
            }}>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: 22,
                lineHeight: 1.1,
                letterSpacing: '-.02em',
                color: 'var(--ink)',
                fontVariationSettings: '"opsz" 144',
              }}>
                Editar Usuário
              </h2>
              <button
                onClick={() => setEditingUser(null)}
                type="button"
                style={{
                  background: 'var(--paper)',
                  color: 'var(--ink)',
                  border: '2px solid var(--ink)',
                  width: 34,
                  height: 34,
                  fontSize: 16,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  flexShrink: 0,
                  borderRadius: 0,
                  display: 'grid',
                  placeItems: 'center',
                  transition: 'background .12s, color .12s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--red)'
                  e.currentTarget.style.color = 'var(--paper-soft)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--paper)'
                  e.currentTarget.style.color = 'var(--ink)'
                }}
              >
                ×
              </button>
            </div>

            {/* Halftone accent on top of modal */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 5,
                background: 'linear-gradient(90deg, var(--red) 0 40%, var(--blue) 40% 100%)',
              }}
            />

            {/* Edit user name display */}
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase' as const,
              letterSpacing: '.1em',
              color: 'var(--ink-muted)',
              marginBottom: 18,
            }}>
              Editando: {editingUser.name || editingUser.email}
            </div>

            {/* Form fields */}
            <div style={{ display: 'grid', gap: 16 }}>
              {/* Email */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '.08em',
                  color: 'var(--ink)',
                }}>
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  style={{
                    background: 'var(--paper)',
                    border: '2px solid var(--ink)',
                    padding: '10px 12px',
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                    color: 'var(--ink)',
                    borderRadius: 0,
                    outline: 'none',
                    minHeight: 42,
                  }}
                />
              </div>

              {/* Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '.08em',
                  color: 'var(--ink)',
                }}>
                  Nova Senha
                </label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="Deixe vazio para manter"
                  style={{
                    background: 'var(--paper)',
                    border: '2px solid var(--ink)',
                    padding: '10px 12px',
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                    color: 'var(--ink)',
                    borderRadius: 0,
                    outline: 'none',
                    minHeight: 42,
                  }}
                />
              </div>

              {/* Role + School in 2-col grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {/* Role */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '.08em',
                    color: 'var(--ink)',
                  }}>
                    Cargo
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    style={{
                      background: 'var(--paper)',
                      border: '2px solid var(--ink)',
                      padding: '10px 30px 10px 12px',
                      fontFamily: 'var(--font-body)',
                      fontSize: 14,
                      color: 'var(--ink)',
                      borderRadius: 0,
                      outline: 'none',
                      minHeight: 42,
                      cursor: 'pointer',
                      appearance: 'none' as const,
                      backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'><path d='M2 4 L6 9 L10 4' stroke='%231B1A1F' stroke-width='1.6' fill='none'/></svg>\")",
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 10px center',
                      backgroundSize: 11,
                    }}
                  >
                    <option value="teacher">Professor</option>
                    <option value="coordinator">Coordenador</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {/* School */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '.08em',
                    color: 'var(--ink)',
                  }}>
                    Escola
                  </label>
                  <input
                    type="text"
                    value={editForm.school}
                    onChange={(e) => setEditForm({ ...editForm, school: e.target.value })}
                    style={{
                      background: 'var(--paper)',
                      border: '2px solid var(--ink)',
                      padding: '10px 12px',
                      fontFamily: 'var(--font-body)',
                      fontSize: 14,
                      color: 'var(--ink)',
                      borderRadius: 0,
                      outline: 'none',
                      minHeight: 42,
                    }}
                  />
                </div>
              </div>

              {/* Blocked toggle */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                padding: '10px 14px',
                border: '2px solid var(--ink)',
                borderRadius: 0,
                background: editForm.blocked ? 'var(--red-wash)' : 'var(--paper)',
                transition: 'background .15s',
              }}>
                <div style={{
                  width: 22,
                  height: 22,
                  border: '2px solid var(--ink)',
                  borderRadius: 0,
                  background: editForm.blocked ? 'var(--red)' : 'var(--paper-soft)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  transition: 'background .12s',
                }}>
                  {editForm.blocked && (
                    <span style={{
                      color: 'white',
                      fontSize: 14,
                      fontWeight: 900,
                      lineHeight: 1,
                    }}>✓</span>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={editForm.blocked}
                  onChange={(e) => setEditForm({ ...editForm, blocked: e.target.checked })}
                  style={{ display: 'none' }}
                />
                <span style={{
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                  fontSize: 13,
                  color: editForm.blocked ? 'var(--red-deep)' : 'var(--ink)',
                }}>
                  {editForm.blocked ? 'Usuário Bloqueado' : 'Usuário Ativo'}
                </span>
              </label>
            </div>

            {/* Modal actions */}
            <div style={{
              display: 'flex',
              gap: 10,
              marginTop: 24,
              paddingTop: 18,
              borderTop: '2px dashed var(--ink-faint)',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setEditingUser(null)}
                type="button"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontWeight: 700,
                  fontSize: 13,
                  padding: '11px 18px',
                  border: '2px solid var(--ink)',
                  borderRadius: 0,
                  background: 'var(--paper-soft)',
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  boxShadow: '3px 3px 0 var(--ink)',
                  transition: 'transform .12s, box-shadow .12s',
                  minHeight: 44,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translate(-1px, -1px)'
                  e.currentTarget.style.boxShadow = '4px 4px 0 var(--ink)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translate(0, 0)'
                  e.currentTarget.style.boxShadow = '3px 3px 0 var(--ink)'
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translate(2px, 2px)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translate(-1px, -1px)'
                  e.currentTarget.style.boxShadow = '4px 4px 0 var(--ink)'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={saveUser}
                type="button"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontWeight: 700,
                  fontSize: 13,
                  padding: '11px 22px',
                  border: '2px solid var(--ink)',
                  borderRadius: 0,
                  background: 'var(--ink)',
                  color: 'var(--paper)',
                  cursor: 'pointer',
                  boxShadow: '3px 3px 0 var(--red)',
                  transition: 'transform .12s, box-shadow .12s',
                  minHeight: 44,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translate(-1px, -1px)'
                  e.currentTarget.style.boxShadow = '4px 4px 0 var(--red)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translate(0, 0)'
                  e.currentTarget.style.boxShadow = '3px 3px 0 var(--red)'
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translate(2px, 2px)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translate(-1px, -1px)'
                  e.currentTarget.style.boxShadow = '4px 4px 0 var(--red)'
                }}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
