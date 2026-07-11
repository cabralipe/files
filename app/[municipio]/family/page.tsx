'use client'

import { supabase } from '@/lib/supabase-client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'


type FamilyPei = {
  id: string
  title: string
  content: string
  is_published: boolean
  plan_status?: string
  is_paee?: boolean
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
  const [message, setMessage] = useState('')
  // Estado do formulario de ciencia/concordancia por documento.
  const [consentFor, setConsentFor] = useState<string>('')
  const [consentForm, setConsentForm] = useState({
    responsavel_nome: '',
    parentesco: '',
    concordancia: 'aprovado' as 'aprovado' | 'ciencia_sem_aprovacao',
    observacoes: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const loadPeis = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }
    void loadPeis()
  }, [authLoading, user, loadPeis])

  function openConsent(pei: FamilyPei) {
    const link = pei.student_id ? studentMap[pei.student_id] : undefined
    setConsentForm({
      responsavel_nome: String(user?.user_metadata?.name || user?.user_metadata?.full_name || ''),
      parentesco: link?.relationship || '',
      concordancia: 'aprovado',
      observacoes: '',
    })
    setMessage('')
    setError('')
    setConsentFor(pei.id)
  }

  async function submitConsent(peiId: string) {
    if (!consentForm.responsavel_nome.trim()) {
      setError('Informe o nome do responsavel que esta dando ciencia.')
      return
    }
    try {
      setSubmitting(true)
      setError('')
      setMessage('')
      const token = await getAccessToken()
      const response = await fetch(`/api/plans/${peiId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'family_consent',
          consulta_familia: {
            responsavel_nome: consentForm.responsavel_nome,
            parentesco: consentForm.parentesco,
            concordancia: consentForm.concordancia,
            observacoes: consentForm.observacoes,
            formato: 'portal',
          },
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Erro ao registrar ciencia')
      setConsentFor('')
      setMessage('Ciencia registrada. O documento passou a vigente.')
      await loadPeis()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar ciencia')
    } finally {
      setSubmitting(false)
    }
  }

  function concordanciaLabel(value?: string) {
    if (value === 'aprovado') return 'Aprovado'
    if (value === 'ciencia_sem_aprovacao') return 'Ciencia sem aprovacao'
    return 'Pendente'
  }

  return (
    <main>

      <section className="pg">
        <div className="saved-head">
          <div>
            <h1>PEIs e PAEEs vinculados</h1>
            <p>Area restrita para responsaveis legais.</p>
          </div>
        </div>

        <div className="pei-block pei-tutorial" style={{ marginBottom: 20 }}>
          <div className="pei-tutorial-title">Sobre o PEI e o PAEE</div>
          <ol className="pei-tutorial-steps">
            <li><strong>O que e o PEI?</strong> — E um plano criado pela escola para apoiar o aprendizado do seu filho(a) na sala regular, respeitando as necessidades e potencialidades individuais.</li>
            <li><strong>O que e o PAEE?</strong> — E o plano do Atendimento Educacional Especializado (AEE), feito pelo professor da Sala de Recursos: organiza os atendimentos, recursos de acessibilidade e estrategias para eliminar barreiras. Os dois planos trabalham juntos.</li>
            <li><strong>O que aparece aqui?</strong> — Os PEIs e PAEEs vinculados ao(s) aluno(s) que a escola associou a sua conta de responsavel.</li>
            <li><strong>Status &quot;Vigente&quot;</strong> — O PEI esta ativo e sendo utilizado pela escola neste periodo.</li>
            <li><strong>Status &quot;Rascunho&quot;</strong> — O PEI ainda esta em elaboracao pela equipe pedagogica.</li>
          </ol>
          <p className="pei-note" style={{ marginTop: 8 }}>
            Em caso de duvidas sobre o PEI do seu filho(a), entre em contato diretamente com a escola ou com o professor AEE responsavel.
          </p>
        </div>

        {!user && <div className="al-error">Faca login com a conta de familia/responsavel.</div>}
        {error && <div className="al-error">{error}</div>}
        {message && <div className="al-ok">{message}</div>}
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
                    <span className="tag">{pei.is_paee ? 'PAEE' : 'PEI'}</span>
                    <span className="tag tcd">{pei.plan_status === 'vigente' || pei.is_published ? 'Vigente' : pei.plan_status === 'aguardando_familia' ? 'Aguardando sua ciencia' : 'Em elaboracao'}</span>
                    <span className="tag ta">{concordanciaLabel(pei.consulta_familia?.concordancia)}</span>
                  </div>
                  <p className="plan-preview">{pei.content?.slice(0, 260) || 'PEI sem conteudo disponivel.'}</p>

                  {pei.plan_status === 'aguardando_familia' && (
                    consentFor === pei.id ? (
                      <div className="pei-source" style={{ marginTop: 10, padding: '12px 14px', border: '2px solid var(--ink)', background: 'var(--paper-soft)' }}>
                        <div className="pei-tutorial-title" style={{ marginBottom: 8 }}>Registrar ciencia do {pei.is_paee ? 'PAEE' : 'PEI'}</div>
                        <label className="fgr" style={{ display: 'block', marginBottom: 8 }}>
                          <span className="fl">Nome do responsavel</span>
                          <input
                            value={consentForm.responsavel_nome}
                            onChange={(e) => setConsentForm((c) => ({ ...c, responsavel_nome: e.target.value }))}
                            placeholder="Seu nome completo"
                          />
                        </label>
                        <label className="fgr" style={{ display: 'block', marginBottom: 8 }}>
                          <span className="fl">Parentesco / relacao</span>
                          <input
                            value={consentForm.parentesco}
                            onChange={(e) => setConsentForm((c) => ({ ...c, parentesco: e.target.value }))}
                            placeholder="Ex.: mae, pai, responsavel legal"
                          />
                        </label>
                        <label className="fgr" style={{ display: 'block', marginBottom: 8 }}>
                          <span className="fl">Manifestacao</span>
                          <select
                            value={consentForm.concordancia}
                            onChange={(e) => setConsentForm((c) => ({ ...c, concordancia: e.target.value as 'aprovado' | 'ciencia_sem_aprovacao' }))}
                          >
                            <option value="aprovado">Concordo com o plano</option>
                            <option value="ciencia_sem_aprovacao">Dou ciencia, mas tenho ressalvas</option>
                          </select>
                        </label>
                        <label className="fgr" style={{ display: 'block', marginBottom: 10 }}>
                          <span className="fl">Observacoes (opcional)</span>
                          <textarea
                            value={consentForm.observacoes}
                            onChange={(e) => setConsentForm((c) => ({ ...c, observacoes: e.target.value }))}
                            placeholder="Comentarios ou expectativas que queira registrar"
                          />
                        </label>
                        <div className="brow" style={{ margin: 0, gap: 8 }}>
                          <button className="btn btn-suc" type="button" disabled={submitting} onClick={() => void submitConsent(pei.id)}>
                            {submitting ? 'Registrando...' : 'Confirmar ciencia'}
                          </button>
                          <button className="btn btn-out" type="button" disabled={submitting} onClick={() => setConsentFor('')}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="pi-actions" style={{ marginTop: 10 }}>
                        <button className="btn btn-pri" type="button" onClick={() => openConsent(pei)}>
                          Dar ciencia / concordar
                        </button>
                      </div>
                    )
                  )}
                </article>
              )
            }) : (
              <div className="est">Nenhum PEI ou PAEE vinculado a esta conta ainda.</div>
            )}
          </div>
        )}
      </section>
    </main>
  )
}
