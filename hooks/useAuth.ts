import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase-client'

export type AuthUser = User
export type UserRole = 'teacher' | 'aee_teacher' | 'coordinator' | 'family' | 'admin' | 'super_admin'

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Verificar usuário atual
    checkUser()

    // Escutar mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user as AuthUser | null)
      setLoading(false)
    })

    return () => subscription?.unsubscribe()
  }, [])

  const checkUser = async () => {
    try {
      const { data } = await supabase.auth.getSession()
      setUser(data.session?.user as AuthUser | null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: UserRole = 'teacher',
    school = '',
    subject = '',
  ) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name,
          role,
          school,
          subject,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao cadastrar')
      }

      if (data.session?.access_token && data.session?.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        })

        if (error) throw error
      }

      if (data.user) {
        setUser(data.user as AuthUser)
      }

      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      setUser(data.user as AuthUser)
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) throw error
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    user,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    resetPassword,
    isAuthenticated: !!user,
  }
}
