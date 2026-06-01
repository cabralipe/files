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

type Muni = {
  id: string
  slug: string
  name: string
  state: string
  is_active: boolean
  primary_color: string | null
  secondary_color: string | null
  contact_email: string | null
  created_at: string
}

type MuniStats = Record<string, { users: number; plans: number; experiences: number }>

function slugify(name: string) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token
}

function AnalyticsSection({
  title, accent, accentWash, visits, plansLabel, plans,
}: {
  title: string
  accent: string
  accentWash: string
  visits: { total: number; today: number; last7d: number; last30d: number }
  plansLabel: string
  plans: number
}) {
  const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--ink-muted)', marginBottom: 8 }
  return (
    <div style={{ borderLeft: `4px solid ${accent}`, paddingLeft: 14 }}>
      <div style={{ ...mono, fontSize: 12, color: 'var(--ink)', marginBottom: 12 }}>{title}</div>
      <div style={{ ...mono }}>Visitas</div>
      <div className="coord-stats" style={{ marginBottom: 16 }}>
        {[
          { label: 'Total', val: visits.total, bg: accentWash },
          { label: 'Hoje', val: visits.today, bg: 'var(--paper-soft)' },
          { label: 'Últimos 7 dias', val: visits.last7d, bg: 'var(--paper-soft)' },
          { label: 'Últimos 30 dias', val: visits.last30d, bg: 'var(--paper-soft)' },
        ].map((s) => (
          <div key={s.label} style={{ background: s.bg }}>
            <strong>{s.val.toLocaleString('pt-BR')}</strong>
            <span style={{ display: 'block', marginTop: 4 }}>{s.label}</span>
          </div>
        ))}
      </div>
      <div style={{ ...mono }}>Planos de aula gerados</div>
      <div className="coord-stats">
        <div style={{ background: accentWash }}>
          <strong>{plans.toLocaleString('pt-BR')}</strong>
          <span style={{ display: 'block', marginTop: 4 }}>{plansLabel}</span>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const router = useRouter()
  const { user, loading: authLoading, isAuthenticated, signOut } = useAuth()

  const [activeTab, setActiveTab] = useState<'users' | 'experiences' | 'analytics' | 'municipalities'>('users')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [analytics, setAnalytics] = useState<{
    computacao: {
      visits: { total: number; today: number; last7d: number; last30d: number }
      plans: number
    }
    nacional: {
      visits: { total: number; today: number; last7d: number; last30d: number }
      plans: number
    }
    topSchools: { school: string; count: number }[]
  } | null>(null)
  const [analyticsMigrationNeeded, setAnalyticsMigrationNeeded] = useState(false)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  // Municipality management (super admin only)
  const [munis, setMunis] = useState<Muni[]>([])
  const [muniStats, setMuniStats] = useState<MuniStats>({})
  const [showMuniForm, setShowMuniForm] = useState(false)
  const [creatingMuni, setCreatingMuni] = useState(false)
  const [muniForm, setMuniForm] = useState({
    name: '',
    slug: '',
    state: '',
    contact_email: '',
    primary_color: '#E5394B',
    secondary_color: '#A6B0DD',
    admin_name: '',
    admin_email: '',
    admin_password: '',
  })

  // Edit modal state
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [editForm, setEditForm] = useState({
    email: '',
    password: '',
    role: 'teacher',
    school: '',
    blocked: false,
  })

  const isSuperAdmin =
    user?.user_metadata?.role === 'super_admin' ||
    (typeof process !== 'undefined' &&
      !!process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL &&
      user?.email === process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL)

  const isAdmin =
    user?.user_metadata?.role === 'admin' ||
    user?.user_metadata?.role === 'municipality_admin' ||
    isSuperAdmin ||
    user?.email === 'admin@bncc.local'

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

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true)
    try {
      const token = await getAccessToken()
      const res = await fetch('/api/admin/analytics', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Erro ao carregar analytics')
      if (payload.needsMigration) {
        setAnalyticsMigrationNeeded(true)
      } else {
        setAnalytics(payload.data)
        setAnalyticsMigrationNeeded(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar analytics')
    } finally {
      setAnalyticsLoading(false)
    }
  }, [])

  const fetchMunicipalities = useCallback(async () => {
    try {
      const token = await getAccessToken()
      const res = await fetch('/api/super-admin/municipalities', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Erro ao carregar municípios')
      setMunis(payload.data || [])
      setMuniStats(payload.stats || {})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar municípios')
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
      try {
        const tasks: Promise<unknown>[] = [fetchUsers(), fetchExperiences()]
        if (isSuperAdmin) tasks.push(fetchMunicipalities())
        await Promise.all(tasks)
      } finally {
        setLoading(false)
      }
    })()
  }, [authLoading, isAuthenticated, isAdmin, isSuperAdmin, router, fetchUsers, fetchExperiences, fetchMunicipalities])

  // Load analytics lazily when tab is first opened
  useEffect(() => {
    if (activeTab === 'analytics' && !analytics && !analyticsLoading) {
      void fetchAnalytics()
    }
  }, [activeTab, analytics, analyticsLoading, fetchAnalytics])

  async function createMunicipality(e: React.FormEvent) {
    e.preventDefault()
    setCreatingMuni(true)
    setError('')
    try {
      const token = await getAccessToken()
      const slug = muniForm.slug || slugify(muniForm.name)
      const body: Record<string, unknown> = {
        name: muniForm.name,
        slug,
        state: muniForm.state.toUpperCase(),
        contact_email: muniForm.contact_email || undefined,
        primary_color: muniForm.primary_color,
        secondary_color: muniForm.secondary_color,
      }
      if (muniForm.admin_email && muniForm.admin_password && muniForm.admin_name) {
        body.admin_email = muniForm.admin_email
        body.admin_password = muniForm.admin_password
        body.admin_name = muniForm.admin_name
      }
      const res = await fetch('/api/super-admin/municipalities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Erro ao criar município')
      setMessage(`Município "${muniForm.name}" criado. Ambiente disponível em /${slug}`)
      setMuniForm({
        name: '', slug: '', state: '', contact_email: '',
        primary_color: '#E5394B', secondary_color: '#A6B0DD',
        admin_name: '', admin_email: '', admin_password: '',
      })
      setShowMuniForm(false)
      await fetchMunicipalities()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar município')
    } finally {
      setCreatingMuni(false)
    }
  }

  async function toggleMunicipality(m: Muni) {
    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/super-admin/municipalities/${m.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ is_active: !m.is_active }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Erro ao alterar município')
      setMessage(m.is_active ? 'Município desativado.' : 'Município ativado.')
      await fetchMunicipalities()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar município')
    }
  }

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
          {(['users', 'experiences', 'analytics', ...(isSuperAdmin ? ['municipalities'] as const : [])] as const).map((tab) => (
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
              {tab === 'users'
                ? 'Usuários'
                : tab === 'experiences'
                  ? 'Experiências'
                  : tab === 'analytics'
                    ? 'Analytics'
                    : 'Municípios'}
            </button>
          ))}
        </div>

        {/* ══════ ANALYTICS TAB ══════ */}
        {activeTab === 'analytics' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>Visão geral da plataforma</span>
              <button className="btn btn-gh" onClick={() => { setAnalytics(null); void fetchAnalytics() }} disabled={analyticsLoading} style={{ fontSize: 12 }}>
                {analyticsLoading ? '...' : '↺ Atualizar'}
              </button>
            </div>

            {analyticsLoading && !analytics && !analyticsMigrationNeeded && (
              <div style={{ textAlign: 'center', padding: '48px 0', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-muted)' }}>
                Carregando dados...
              </div>
            )}

            {analyticsMigrationNeeded && (
              <div style={{ padding: '20px 24px', background: 'var(--mustard-wash)', border: '2px solid var(--mustard)', marginBottom: 16 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 14, color: 'var(--ink)', marginBottom: 8 }}>
                  ⚠️ Tabela de analytics não encontrada
                </div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink)', margin: '0 0 12px' }}>
                  Para ativar o rastreamento de visitas e planos, rode o seguinte SQL no <strong>Supabase SQL Editor</strong>:
                </p>
                <pre style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '12px 16px', fontSize: 11, fontFamily: 'var(--font-mono)', overflowX: 'auto', margin: 0, lineHeight: 1.6 }}>{`CREATE TABLE IF NOT EXISTS analytics_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  page       TEXT,
  school     TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type_time
  ON analytics_events (event_type, created_at DESC);
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "analytics_insert_anon" ON analytics_events
  FOR INSERT WITH CHECK (true);
CREATE POLICY "analytics_select_admin" ON analytics_events
  FOR SELECT USING (
    auth.jwt() ->> 'email' = 'admin@bncc.local'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );`}</pre>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-muted)', margin: '10px 0 0' }}>
                  O arquivo completo está em <code>supabase-analytics-migration.sql</code> no repositório.
                </p>
              </div>
            )}

            {analytics && (
              <>
                {/* ── Portal Computação Atalaia ── */}
                <AnalyticsSection
                  title="🖥️ Portal Computação — Atalaia/AL"
                  accent="var(--teal)"
                  accentWash="var(--teal-wash)"
                  visits={analytics.computacao.visits}
                  plansLabel="Planos gerados"
                  plans={analytics.computacao.plans}
                />

                <div style={{ height: 32 }} />

                {/* ── BNCC Nacional ── */}
                <AnalyticsSection
                  title="📚 BNCC Nacional"
                  accent="var(--blue)"
                  accentWash="var(--blue-wash)"
                  visits={analytics.nacional.visits}
                  plansLabel="Planos gerados"
                  plans={analytics.nacional.plans}
                />

                <div style={{ height: 32 }} />

                {/* Top schools */}
                <div style={{ marginBottom: 8, fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                  🏫 Escolas que mais geraram planos (BNCC Nacional)
                </div>
                {analytics.topSchools.length === 0 ? (
                  <div style={{ padding: '24px 20px', background: 'var(--paper-soft)', border: '2px solid var(--ink-faint)', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-muted)', textAlign: 'center' }}>
                    Nenhuma escola identificada ainda. Os dados aparecerão conforme os professores informarem a escola no formulário do plano.
                  </div>
                ) : (
                  <div style={{ background: 'var(--paper-soft)', border: '2.5px solid var(--ink)', boxShadow: 'var(--stamp)', overflow: 'hidden' }}>
                    {analytics.topSchools.map((row, idx) => {
                      const max = analytics.topSchools[0]?.count || 1
                      const pct = Math.round((row.count / max) * 100)
                      return (
                        <div key={row.school} style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', alignItems: 'center', gap: '0 12px', padding: '10px 16px', borderBottom: idx < analytics.topSchools.length - 1 ? '1px solid var(--ink-faint)' : 'none', background: idx === 0 ? 'var(--mustard-wash)' : 'transparent' }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 15, color: idx === 0 ? 'var(--mustard-deep)' : 'var(--ink-muted)', textAlign: 'center' }}>
                            {idx + 1}
                          </span>
                          <div>
                            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13, color: 'var(--ink)', marginBottom: 4 }}>{row.school}</div>
                            <div style={{ height: 4, background: 'var(--ink-faint)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: idx === 0 ? 'var(--mustard-deep)' : 'var(--blue)', transition: 'width .4s' }} />
                            </div>
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                            {row.count} plano{row.count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}

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

        {/* ══════ MUNICIPALITIES TAB (super admin) ══════ */}
        {activeTab === 'municipalities' && isSuperAdmin && (
          <>
            <div className="saved-head" style={{ marginBottom: 16 }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, margin: 0 }}>
                  Ambientes de municípios
                </h2>
                <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 4 }}>
                  Cada município tem seu próprio ambiente em /&lt;slug&gt; com todas as funcionalidades.
                </p>
              </div>
              <button
                className="btn btn-pri"
                type="button"
                onClick={() => setShowMuniForm((s) => !s)}
              >
                {showMuniForm ? 'Cancelar' : '+ Novo município'}
              </button>
            </div>

            {showMuniForm && (
              <form
                onSubmit={createMunicipality}
                style={{
                  background: 'var(--paper-soft)',
                  border: '2.5px solid var(--ink)',
                  boxShadow: 'var(--stamp)',
                  borderRadius: 0,
                  padding: 16,
                  marginBottom: 20,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 12,
                }}
              >
                <MuniField label="Nome do município *">
                  <input
                    required
                    value={muniForm.name}
                    onChange={(e) =>
                      setMuniForm({
                        ...muniForm,
                        name: e.target.value,
                        slug: muniForm.slug || slugify(e.target.value),
                      })
                    }
                    placeholder="São Paulo"
                  />
                </MuniField>
                <MuniField label="Slug (URL) *">
                  <input
                    required
                    value={muniForm.slug}
                    onChange={(e) => setMuniForm({ ...muniForm, slug: slugify(e.target.value) })}
                    placeholder="sao-paulo"
                  />
                </MuniField>
                <MuniField label="UF *">
                  <input
                    required
                    maxLength={2}
                    value={muniForm.state}
                    onChange={(e) =>
                      setMuniForm({ ...muniForm, state: e.target.value.toUpperCase().slice(0, 2) })
                    }
                    placeholder="SP"
                  />
                </MuniField>
                <MuniField label="E-mail de contato">
                  <input
                    type="email"
                    value={muniForm.contact_email}
                    onChange={(e) => setMuniForm({ ...muniForm, contact_email: e.target.value })}
                    placeholder="contato@..."
                  />
                </MuniField>
                <MuniField label="Cor primária">
                  <input
                    type="color"
                    value={muniForm.primary_color}
                    onChange={(e) => setMuniForm({ ...muniForm, primary_color: e.target.value })}
                  />
                </MuniField>
                <MuniField label="Cor secundária">
                  <input
                    type="color"
                    value={muniForm.secondary_color}
                    onChange={(e) => setMuniForm({ ...muniForm, secondary_color: e.target.value })}
                  />
                </MuniField>
                <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--ink-faint)', paddingTop: 10, fontSize: 13, fontWeight: 700 }}>
                  Admin inicial do município (opcional)
                </div>
                <MuniField label="Nome do admin">
                  <input
                    value={muniForm.admin_name}
                    onChange={(e) => setMuniForm({ ...muniForm, admin_name: e.target.value })}
                  />
                </MuniField>
                <MuniField label="E-mail do admin">
                  <input
                    type="email"
                    value={muniForm.admin_email}
                    onChange={(e) => setMuniForm({ ...muniForm, admin_email: e.target.value })}
                  />
                </MuniField>
                <MuniField label="Senha do admin (mín. 6)">
                  <input
                    type="password"
                    value={muniForm.admin_password}
                    onChange={(e) => setMuniForm({ ...muniForm, admin_password: e.target.value })}
                  />
                </MuniField>
                <div style={{ gridColumn: '1 / -1' }}>
                  <button className="btn btn-pri" type="submit" disabled={creatingMuni}>
                    {creatingMuni ? 'Criando...' : 'Criar município'}
                  </button>
                </div>
              </form>
            )}

            <div style={{
              background: 'var(--paper-soft)',
              border: '2.5px solid var(--ink)',
              boxShadow: 'var(--stamp)',
              borderRadius: 0,
              overflow: 'hidden',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1.3fr 1.2fr 0.5fr 0.7fr 0.7fr 0.9fr 0.8fr 0.9fr',
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
                <span>URL</span>
                <span>UF</span>
                <span>Usuários</span>
                <span>Planos</span>
                <span>Experiências</span>
                <span>Status</span>
                <span>Ações</span>
              </div>

              {munis.length === 0 ? (
                <div className="est">Nenhum município ainda. Crie o primeiro!</div>
              ) : (
                munis.map((m, idx) => {
                  const s = muniStats[m.id] || { users: 0, plans: 0, experiences: 0 }
                  return (
                    <div
                      key={m.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.3fr 1.2fr 0.5fr 0.7fr 0.7fr 0.9fr 0.8fr 0.9fr',
                        gap: 12,
                        padding: '12px 14px',
                        background: idx % 2 === 0 ? 'var(--paper-soft)' : 'var(--paper)',
                        borderBottom: '1px solid var(--ink-faint)',
                        alignItems: 'center',
                        fontSize: 13,
                        fontFamily: 'var(--font-body)',
                        color: 'var(--ink)',
                      }}
                    >
                      <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          display: 'inline-block',
                          width: 14,
                          height: 14,
                          border: '1.5px solid var(--ink)',
                          background: m.primary_color || 'var(--ink)',
                        }} />
                        {m.name}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        <Link href={`/${m.slug}`} style={{ color: 'var(--blue)' }}>/{m.slug}</Link>
                      </span>
                      <span>{m.state}</span>
                      <span>{s.users}</span>
                      <span>{s.plans}</span>
                      <span>{s.experiences}</span>
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
                          background: m.is_active ? 'var(--teal)' : 'var(--ink-faint)',
                          color: m.is_active ? 'var(--paper-soft)' : 'var(--ink)',
                        }}>
                          {m.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </span>
                      <span>
                        <button
                          type="button"
                          onClick={() => toggleMunicipality(m)}
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontWeight: 600,
                            fontSize: 11,
                            padding: '6px 10px',
                            border: '2px solid var(--ink)',
                            borderRadius: 0,
                            background: m.is_active ? 'var(--paper)' : 'var(--teal)',
                            color: m.is_active ? 'var(--ink)' : 'var(--paper-soft)',
                            cursor: 'pointer',
                            boxShadow: '2px 2px 0 var(--ink)',
                          }}
                        >
                          {m.is_active ? 'Desativar' : 'Ativar'}
                        </button>
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </>
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

function MuniField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
      <span style={{ fontWeight: 700, fontFamily: 'var(--font-body)' }}>{label}</span>
      {children}
    </label>
  )
}
