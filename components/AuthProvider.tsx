'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase-client'
import type { AppRole, RolePermissions } from '@/lib/authz-rules'

export type AuthProfile = {
  id: string
  email: string
  fullName: string
  role: AppRole
  blocked: boolean
  mustChangePassword: boolean
  municipality: { id: string; slug: string; name: string; state: string } | null
  school: { id: string; name: string } | null
  permissions: RolePermissions
}

type AuthContextValue = {
  user: User | null
  profile: AuthProfile | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  refreshProfile: () => Promise<AuthProfile | null>
  signUp: (email: string, password: string, name: string, schoolId: string, subject: string, municipalityId: string) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchProfile(accessToken: string): Promise<AuthProfile> {
  const response = await fetch('/api/auth/whoami', {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error || 'Erro ao carregar perfil')
  return payload as AuthProfile
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const profileRequestId = useRef(0)

  const applySession = useCallback(async (session: Session | null) => {
    const requestId = ++profileRequestId.current
    if (!session) {
      setUser(null)
      setProfile(null)
      setLoading(false)
      return null
    }
    try {
      const nextProfile = await fetchProfile(session.access_token)
      // Eventos do Supabase e refreshProfile podem consultar o perfil em
      // paralelo. Uma resposta antiga não pode restaurar, por exemplo, o
      // mustChangePassword=true depois que a troca de senha já foi concluída.
      if (requestId === profileRequestId.current) {
        setUser(session.user)
        setProfile(nextProfile)
        setError(null)
      }
      return nextProfile
    } catch (err) {
      if (requestId === profileRequestId.current) {
        setUser(null)
        setProfile(null)
        setError(err instanceof Error ? err.message : 'Erro ao carregar perfil')
        window.setTimeout(() => { void supabase.auth.signOut({ scope: 'local' }) }, 0)
      }
      return null
    } finally {
      if (requestId === profileRequestId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (active) void applySession(data.session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) void applySession(session)
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [applySession])

  useEffect(() => {
    if (profile?.mustChangePassword && pathname !== '/auth/reset-password') {
      router.replace('/auth/reset-password?first=1')
    }
  }, [pathname, profile?.mustChangePassword, router])

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    return applySession(data.session)
  }, [applySession])

  const signUp = useCallback(async (
    email: string,
    password: string,
    name: string,
    schoolId: string,
    subject: string,
    municipalityId: string,
  ) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, school_id: schoolId, subject, municipality_id: municipalityId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erro ao cadastrar')
      if (data.session?.access_token && data.session?.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        })
        if (sessionError) throw sessionError
      }
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      if (!data.session) throw new Error('Sessão não criada')
      try {
        const trustedProfile = await fetchProfile(data.session.access_token)
        setUser(data.user)
        setProfile(trustedProfile)
        return { ...data, profile: trustedProfile }
      } catch (profileError) {
        await supabase.auth.signOut()
        setUser(null)
        setProfile(null)
        throw profileError
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    setLoading(true)
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      setLoading(false)
      throw signOutError
    }
    setUser(null)
    setProfile(null)
    setLoading(false)
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (resetError) throw resetError
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user, profile, loading, error, isAuthenticated: Boolean(user && profile),
    refreshProfile, signUp, signIn, signOut, resetPassword,
  }), [user, profile, loading, error, refreshProfile, signUp, signIn, signOut, resetPassword])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return value
}
