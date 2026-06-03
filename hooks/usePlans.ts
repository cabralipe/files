import { useState } from 'react'
import { supabase } from '@/lib/supabase-client'

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token
}

interface Plan {
  id: string
  title: string
  description: string
  category: string
  difficulty_level: 'iniciante' | 'intermediario' | 'avancado'
  duration_hours: number
  created_at: string
  user_id: string
  creator?: {
    id: string
    name: string
    email: string
    avatar_url?: string
  }
}

export const usePlans = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const createPlan = async (
    userId: string,
    title: string,
    description: string,
    category: string,
    difficulty_level: string,
    duration_hours: number,
    skillIds?: string[]
  ) => {
    try {
      setLoading(true)
      setError('')
      const token = await getAccessToken()

      const response = await fetch('/api/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId,
          title,
          description,
          category,
          difficulty_level,
          duration_hours,
          skillIds,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Erro ao criar plano')
      }

      return data
    } catch (err: any) {
      const message = err.message || 'Erro ao criar plano'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const updatePlan = async (
    planId: string,
    userId: string,
    updates: Partial<Plan>
  ) => {
    try {
      setLoading(true)
      setError('')
      const token = await getAccessToken()

      const response = await fetch('/api/plans', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          planId,
          userId,
          ...updates,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Erro ao atualizar plano')
      }

      return data
    } catch (err: any) {
      const message = err.message || 'Erro ao atualizar plano'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const deletePlan = async (planId: string, userId: string) => {
    try {
      setLoading(true)
      setError('')
      const token = await getAccessToken()

      const response = await fetch('/api/plans', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          planId,
          userId,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Erro ao deletar plano')
      }

      return data
    } catch (err: any) {
      const message = err.message || 'Erro ao deletar plano'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const enrollPlan = async (userId: string, planId: string) => {
    try {
      setLoading(true)
      setError('')
      const token = await getAccessToken()

      const response = await fetch('/api/plans/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId,
          planId,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Erro ao inscrever no plano')
      }

      return data
    } catch (err: any) {
      const message = err.message || 'Erro ao inscrever no plano'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const unenrollPlan = async (userId: string, planId: string) => {
    try {
      setLoading(true)
      setError('')
      const token = await getAccessToken()

      const response = await fetch('/api/plans/enroll', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId,
          planId,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Erro ao desinscrever do plano')
      }

      return data
    } catch (err: any) {
      const message = err.message || 'Erro ao desinscrever do plano'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    createPlan,
    updatePlan,
    deletePlan,
    enrollPlan,
    unenrollPlan,
  }
}
