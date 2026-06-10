'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'

export type PeiReviewMode = 'aee' | 'coordination'
export type PeiReviewKind = 'pei' | 'paee'

type Pei = {
  id: string
  title: string
  content: string
  created_at: string
  plan_status: string
  teacher?: string
  school?: string
  student_id?: string
}

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  aguardando_aee: 'Aguardando AEE',
  aguardando_familia: 'Aguardando família',
  vigente: 'Vigente',
  arquivado: 'Arquivado',
  substituido: 'Substituído',
}

const PIPELINE_PEI: Array<{ key: string; label: string }> = [
  { key: 'rascunho', label: 'Gerado' },
  { key: 'aguardando_aee', label: 'Validação AEE' },
  { key: 'aguardando_familia', label: 'Família' },
  { key: 'vigente', label: 'Vigente' },
]

// PAEE: o autor já é o professor AEE, então não há etapa de validação AEE.
const PIPELINE_PAEE: Array<{ key: string; label: string }> = [
  { key: 'rascunho', label: 'Elaborado' },
  { key: 'aguardando_familia', label: 'Família' },
  { key: 'vigente', label: 'Vigente' },
]

async function token() {
  return (await supabase.auth.getSession()).data.session?.access_token
}

export default function PeiReviewQueue({ mode, kind = 'pei' }: { mode: PeiReviewMode; kind?: PeiReviewKind }) {
  const [plans, setPlans] = useState<Pei[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [open, setOpen] = useState<string>('')
  const [filter, setFilter] = useState<string>(
    mode === 'aee' ? (kind === 'paee' ? 'rascunho' : 'aguardando_aee') : 'all',
  )

  const docLabel = kind === 'paee' ? 'PAEE' : 'PEI'
  const pipeline = kind === 'paee' ? PIPELINE_PAEE : PIPELINE_PEI

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const t = await token()
      const qs = filter && filter !== 'all' ? `?status=${encodeURIComponent(filter)}` : ''
      const endpoint = kind === 'paee' ? '/api/paees/review-queue' : '/api/peis/review-queue'
      const res = await fetch(`${endpoint}${qs}`, {
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Erro ao carregar ${docLabel}s`)
      setPlans(data.data || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : `Erro ao carregar ${docLabel}s`)
    } finally {
      setLoading(false)
    }
  }, [filter, kind, docLabel])

  useEffect(() => {
    void load()
  }, [load])

  async function act(id: string, action: 'approve_aee' | 'reject_aee' | 'submit_familia') {
    setBusy(id)
    setError('')
    try {
      const t = await token()
      const res = await fetch(`/api/plans/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar status')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao atualizar status')
    } finally {
      setBusy('')
    }
  }

  const filters =
    kind === 'paee'
      ? mode === 'aee'
        ? [
            { key: 'rascunho', label: 'Em elaboração' },
            { key: 'aguardando_familia', label: 'Com a família' },
            { key: 'vigente', label: 'Vigentes' },
            { key: 'all', label: 'Todos' },
          ]
        : [
            { key: 'all', label: 'Todos' },
            { key: 'rascunho', label: 'Em elaboração' },
            { key: 'aguardando_familia', label: 'Família' },
            { key: 'vigente', label: 'Vigentes' },
          ]
      : mode === 'aee'
      ? [
          { key: 'aguardando_aee', label: 'Aguardando minha validação' },
          { key: 'aguardando_familia', label: 'Com a família' },
          { key: 'vigente', label: 'Vigentes' },
          { key: 'all', label: 'Todos' },
        ]
      : [
          { key: 'all', label: 'Todos' },
          { key: 'rascunho', label: 'Gerados' },
          { key: 'aguardando_aee', label: 'Validação AEE' },
          { key: 'aguardando_familia', label: 'Família' },
          { key: 'vigente', label: 'Vigentes' },
        ]

  return (
    <div className="pei-queue">
      <div className="pei-queue-filters" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`btn ${filter === f.key ? 'btn-pri' : 'btn-out'}`}
            style={{ fontSize: 12, padding: '6px 12px' }}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
        <button type="button" className="btn btn-gh" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => void load()}>
          Atualizar
        </button>
      </div>

      {error && <p className="pei-note" style={{ color: 'var(--red)', marginBottom: 12 }}>{error}</p>}

      {loading ? (
        <div className="est">Carregando {docLabel}s...</div>
      ) : plans.length === 0 ? (
        <div className="est">Nenhum {docLabel} nesta categoria.</div>
      ) : (
        <div className="plans-grid">
          {plans.map((plan) => {
            const status = plan.plan_status || 'rascunho'
            const stageIdx = pipeline.findIndex((s) => s.key === status)
            return (
              <article className="plan-item" key={plan.id}>
                <div className="pi-header">
                  <h2 className="pi-title">{plan.title || `${docLabel} sem título`}</h2>
                  <div className="pi-date">{new Date(plan.created_at).toLocaleString('pt-BR')}</div>
                </div>

                <div className="pipe">
                  {pipeline.map((s, i) => (
                    <span key={s.key} className={`pipe-pill${i <= stageIdx && stageIdx >= 0 ? ' on' : ''}`}>
                      {s.label}
                    </span>
                  ))}
                </div>

                <div className="pei-note" style={{ fontSize: 12, marginBottom: 8 }}>
                  {plan.teacher ? <>Prof.: <strong>{plan.teacher}</strong> · </> : null}
                  {plan.school || ''} · {STATUS_LABEL[status] || status}
                </div>

                <p className="plan-preview">
                  {open === plan.id ? plan.content : `${plan.content.slice(0, 220)}…`}
                </p>

                <div className="pi-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-gh" onClick={() => setOpen(open === plan.id ? '' : plan.id)}>
                    {open === plan.id ? 'Recolher' : 'Ler completo'}
                  </button>
                  {kind === 'pei' && mode === 'aee' && status === 'aguardando_aee' && (
                    <>
                      <button className="btn btn-suc" disabled={busy === plan.id} onClick={() => void act(plan.id, 'approve_aee')}>
                        {busy === plan.id ? 'Salvando...' : 'Aprovar'}
                      </button>
                      <button className="btn btn-out" disabled={busy === plan.id} onClick={() => void act(plan.id, 'reject_aee')}>
                        Devolver ao professor
                      </button>
                    </>
                  )}
                  {kind === 'paee' && mode === 'aee' && status === 'rascunho' && (
                    <button className="btn btn-suc" disabled={busy === plan.id} onClick={() => void act(plan.id, 'submit_familia')}>
                      {busy === plan.id ? 'Enviando...' : 'Enviar para ciência da família'}
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
