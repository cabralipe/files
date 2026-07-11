'use client'

import { supabase } from '@/lib/supabase-client'

import Link from '@/lib/m-link'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

type Experience = {
  id: string
  title: string
  teacher: string
  school: string
  subject: string
  grade_level: string
  description: string
  content: string
  outcomes: string
  image_url: string
  skill_ids: string[]
  created_at: string
}


export default function ExperiencesPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading) return
    void loadExperiences()
  }, [authLoading])

  async function getAccessToken() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token
  }

  async function loadExperiences() {
    setLoading(true)
    setError('')

    try {
      const token = await getAccessToken()
      const response = await fetch('/api/experiences', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Erro ao carregar experiências')
      }

      setExperiences(payload.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar experiências')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <main className="auth-state">
        <div className="spin" />
        <p>Carregando experiências...</p>
      </main>
    )
  }

  return (
    <main>
      {/* Acoes da pagina (header global fica acima) */}
      <nav className="subnav" aria-label="Ações de experiências">
        {isAuthenticated ? (
          <Link className="nb nb-cta" href="/experiences/new">
            + Cadastrar experiência
          </Link>
        ) : (
          <a className="nb nb-cta" href="/auth/login">
            Entrar para cadastrar
          </a>
        )}
      </nav>

      <section className="pg">
        <div className="saved-head">
          <div>
            <h1>Experiências cadastradas</h1>
            <p>Experiências compartilhadas por professores da rede municipal.</p>
          </div>
          {isAuthenticated ? (
            <Link className="btn btn-pri" href="/experiences/new">
              + Cadastrar experiência
            </Link>
          ) : (
            <Link className="btn btn-pri" href="/auth/login">
              Login para cadastrar
            </Link>
          )}
        </div>

        {error && <div className="al-error">{error}</div>}

        <div className="plans-grid">
          {experiences.length ? (
            experiences.map((experience) => (
              <Link className="plan-item" href={`/experiences/${experience.id}`} key={experience.id}>
                {experience.image_url && (
                  <img className="experience-card-image" src={experience.image_url} alt={experience.title} />
                )}
                <div className="pi-header">
                  <div>
                    <h2 className="pi-title">{experience.title}</h2>
                    <div className="pi-date">{new Date(experience.created_at).toLocaleString('pt-BR')}</div>
                  </div>
                </div>
                <div className="pi-meta">
                  <span className="tag ta">{experience.grade_level || 'Turma não informada'}</span>
                  <span className="tag tcd">{experience.subject}</span>
                  <span className="tag ta">{experience.skill_ids.length} habilidades</span>
                </div>
                <p className="plan-preview">{experience.description}</p>
                <p className="exp-author">{experience.teacher || 'Professor(a)'} - {experience.school}</p>
              </Link>
            ))
          ) : (
            <div className="est">Nenhuma experiência cadastrada ainda.</div>
          )}
        </div>
      </section>
    </main>
  )
}
