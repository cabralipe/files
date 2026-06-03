'use client'

import { supabase } from '@/lib/supabase-client'

import Link from '@/lib/m-link'
import { useParams } from 'next/navigation'
import { useRouter } from '@/lib/m-link'
import { useEffect, useState } from 'react'
import CommentsSection from '@/components/CommentsSection'
import LikesButton from '@/components/LikesButton'
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
  created_at: string
  can_delete?: boolean
}


export default function ExperienceDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user, loading: authLoading } = useAuth()
  const [experience, setExperience] = useState<Experience | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (authLoading) {
      return
    }

    void fetchExperience()
  }, [authLoading, params.id])

  async function fetchExperience() {
    try {
      setLoading(true)
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      const response = await fetch(`/api/experiences?id=${params.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const payload = await response.json()

      if (!response.ok || !payload.experiences?.length) {
        throw new Error(payload.error || 'Experiência não encontrada')
      }

      setExperience(payload.experiences[0])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar experiência')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteExperience() {
    if (!window.confirm('Tem certeza que deseja excluir esta experiência? Esta ação é irreversível.')) {
      return
    }

    try {
      setDeleting(true)
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      const response = await fetch(`/api/experiences?id=${experience?.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      const payload = await response.json()
      if (response.ok) {
        alert('Experiência excluída com sucesso!')
        router.push('/experiences')
      } else {
        alert(payload.error || 'Erro ao excluir experiência')
      }
    } catch (err) {
      console.error(err)
      alert('Erro de conexão ao tentar excluir')
    } finally {
      setDeleting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <main className="auth-state">
        <div className="spin" />
        <p>Carregando experiência...</p>
      </main>
    )
  }

  if (error || !experience) {
    return (
      <main className="auth-state">
        <p>{error || 'Experiência não encontrada'}</p>
        <button className="btn btn-pri" onClick={() => router.push('/experiences')} type="button">
          Voltar
        </button>
      </main>
    )
  }

  return (
    <main>
      <header id="hdr">
        <div className="hdr-in">
          <Link href="/experiences" className="logo">
            <div className="logo-ic">BN</div>
            <div>
              <div className="logo-t">Experiência exitosa</div>
              <div className="logo-s">{experience.teacher}</div>
            </div>
          </Link>
          <nav className="hdr-nav" aria-label="Acessos">
            <Link className="nb" href="/experiences">
              Lista de experiências
            </Link>
            <Link className="nb" href="/">
              Habilidades e planos
            </Link>
          </nav>
        </div>
      </header>

      <section className="pg">
        <article className="pc">
          <h1 className="pct">{experience.title}</h1>
          {experience.image_url && (
            <img className="experience-detail-image" src={experience.image_url} alt={experience.title} />
          )}
          <div className="pi-meta">
            <span className="tag ta">{experience.grade_level || 'Turma não informada'}</span>
            <span className="tag tcd">{experience.subject}</span>
            <span className="tag ta">{new Date(experience.created_at).toLocaleDateString('pt-BR')}</span>
          </div>
          <p className="exp-author">{experience.teacher} - {experience.school}</p>

          <h2 className="section-title">Resumo</h2>
          <p className="plan-preview">{experience.description}</p>

          {experience.content && (
            <>
              <h2 className="section-title">Como aconteceu</h2>
              <p className="plan-preview">{experience.content}</p>
            </>
          )}

          {experience.outcomes && (
            <>
              <h2 className="section-title">Resultados</h2>
              <p className="plan-preview">{experience.outcomes}</p>
            </>
          )}

          <div className="flex justify-between items-center mt-6 pt-4 border-t-2 border-black flex-wrap gap-4">
            {user && (
              <div>
                <LikesButton experienceId={experience.id} userId={user.id} />
              </div>
            )}
            {experience.can_delete && (
              <div>
                <button
                  onClick={handleDeleteExperience}
                  disabled={deleting}
                  className="btn text-xs font-bold bg-[#E5394B] text-[#FBF5E3] hover:bg-[#B82433] border-2 border-black active:translate-y-[2px] active:shadow-none"
                  style={{ borderRadius: '0px' }}
                >
                  {deleting ? 'Excluindo...' : 'Excluir Experiência'}
                </button>
              </div>
            )}
          </div>
        </article>

        {user && <CommentsSection experienceId={experience.id} userId={user.id} />}
      </section>
    </main>
  )
}
