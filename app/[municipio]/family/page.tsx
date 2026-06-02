'use client'

import { useEffect, useState } from 'react'
import Link from '@/lib/m-link'
import { createClient } from '@supabase/supabase-js'
import { useAuth } from '@/hooks/useAuth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
)

type FamilyPei = {
  id: string
  title: string
  content: string
  is_published: boolean
  plan_status?: string
  student_id?: string
  consulta_familia?: Record<string, string>
  created_at: string
}

type StudentLink = {
  student_id: string
  relationship: string
  students: {
    full_name: string
    school_name: string
    grade_level: string
  } | null
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token
}

export default function FamilyPage() {
  const { user, loading: authLoading } = useAuth()
  const [peis, setPeis] = useState<FamilyPei[]>([])
  const [studentMap, setStudentMap] = useState<Record<string, StudentLink>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }

    async function loadPeis() {
      try {
        setLoading(true)
        const token = await getAccessToken()
        const response = await fetch('/api/family/peis', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'Erro ao carregar PEIs')
        setPeis(payload.data || [])
        const links: StudentLink[] = payload.links || []
        const map: Record<string, StudentLink> = {}
        for (const link of links) {
          if (link.student_id) map[link.student_id] = link
        }
        setStudentMap(map)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar PEIs')
      } finally {
        setLoading(false)
      }
    }

    void loadPeis()
  }, [authLoading, user])

  function concordanciaLabel(value?: string) {
    if (value === 'aprovado') return 'Aprovado'
    if (value === 'ciencia_sem_aprovacao') return 'Ciencia sem aprovacao'
    return 'Pendente'
  }

  return (
    <main>
      <header id="hdr">
        <div className="hdr-in">
          <Link href="/" className="logo">
            <div className="logo-ic logo-ic--pei" />
            <div>
              <div className="logo-t">Acesso da familia</div>
              <div className="logo-s">Consulta e ciencia do PEI</div>
            </div>
          </Link>
        </div>
      </header>

      <section className="pg">
        <div className="saved-head">
          <div>
            <h1>PEIs vinculados</h1>
            <p>Area restrita para responsaveis legais.</p>
          </div>
        </div>

        <div className="pei-block pei-tutorial" style={{ marginBottom: 20 }}>
          <div className="pei-tutorial-title">Sobre o PEI — Plano Educacional Individualizado</div>
          <ol className="pei-tutorial-steps">
            <li><strong>O que e o PEI?</strong> — E um plano criado pela escola para apoiar o aprendizado do seu filho(a), respeitando as necessidades e potencialidades individuais.</li>
            <li><strong>O que aparece aqui?</strong> — Os PEIs vinculados ao(s) aluno(s) que a escola associou a sua conta de responsavel.</li>
            <li><strong>Status &quot;Vigente&quot;</strong> — O PEI esta ativo e sendo utilizado pela escola neste periodo.</li>
            <li><strong>Status &quot;Rascunho&quot;</strong> — O PEI ainda esta em elaboracao pela equipe pedagogica.</li>
          </ol>
          <p className="pei-note" style={{ marginTop: 8 }}>
            Em caso de duvidas sobre o PEI do seu filho(a), entre em contato diretamente com a escola ou com o professor AEE responsavel.
          </p>
        </div>

        {!user && <div className="al-error">Faca login com a conta de familia/responsavel.</div>}
        {error && <div className="al-error">{error}</div>}
        {loading && <div className="est">Carregando PEIs...</div>}

        {!loading && user && (
          <div className="plans-grid">
            {peis.length ? peis.map((pei) => {
              const link = pei.student_id ? studentMap[pei.student_id] : undefined
              const studentName = link?.students?.full_name
              const studentSchool = link?.students?.school_name
              const studentGrade = link?.students?.grade_level
              return (
                <article className="plan-item" key={pei.id}>
                  <div className="pi-header">
                    <div>
                      <h2 className="pi-title">{pei.title}</h2>
                      <div className="pi-date">{new Date(pei.created_at).toLocaleString('pt-BR')}</div>
                    </div>
                  </div>
                  {studentName && (
                    <p className="exp-author" style={{ marginBottom: 6 }}>
                      {studentName}
                      {studentGrade ? ` · ${studentGrade}` : ''}
                      {studentSchool ? ` · ${studentSchool}` : ''}
                    </p>
                  )}
                  <div className="pi-meta">
                    <span className="tag tcd">{pei.is_published ? 'Vigente' : 'Rascunho'}</span>
                    <span className="tag ta">{concordanciaLabel(pei.consulta_familia?.concordancia)}</span>
                  </div>
                  <p className="plan-preview">{pei.content?.slice(0, 260) || 'PEI sem conteudo disponivel.'}</p>
                </article>
              )
            }) : (
              <div className="est">Nenhum PEI vinculado a esta conta ainda.</div>
            )}
          </div>
        )}
      </section>
    </main>
  )
}
