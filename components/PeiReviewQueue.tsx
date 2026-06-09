'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'

export type PeiReviewMode = 'aee' | 'coordination'

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

const PIPELINE: Array<{ key: string; label: string }> = [
  { key: 'rascunho', label: 'Gerado' },
  { key: 'aguardando_aee', label: 'Validação AEE' },
  { key: 'aguardando_familia', label: 'Família' },
  { key: 'vigente', label: 'Vigente' },
]

async function token() {
  return (await supabase.auth.getSession()).data.session?.access_token
}

export default function PeiReviewQueue({ mode }: { mode: PeiReviewMode }) {
  const [plans, setPlans] = useState<Pei[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [open, setOpen] = useState<string>('')
  const [filter, setFilter] = useState<string>(mode === 'aee' ? 'aguardando_aee' : 'all')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const t = await token()
      const qs = filter && filter !== 'all' ? `?status=${encodeURIComponent(filter)}` : ''
      const res = await fetch(`/api/peis/review-queue${qs}`, {
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar PEIs')
      setPlans(data.data || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar PEIs')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  async function act(id: string, action: 'approve_aee' | 'reject_aee') {
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
    mode === 'aee'
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
        <div className="est">Carregando PEIs...</div>
      ) : plans.length === 0 ? (
        <div className="est">Nenhum PEI nesta categoria.</div>
      ) : (
        <div className="plans-grid">
          {plans.map((plan) => {
            const status = plan.plan_status || 'rascunho'
            const stageIdx = PIPELINE.findIndex((s) => s.key === status)
            return (
              <article className="plan-item" key={plan.id}>
                <div className="pi-header">
                  <h2 className="pi-title">{plan.title || 'PEI sem título'}</h2>
                  <div className="pi-date">{new Date(plan.created_at).toLocaleString('pt-BR')}</div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '4px 0 10px' }}>
                  {PIPELINE.map((s, i) => (
                    <span
                      key={s.key}
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '.06em',
                        padding: '3px 7px',
                        border: '1.5px solid var(--ink)',
                        background: i <= stageIdx && stageIdx >= 0 ? 'var(--teal)' : 'var(--paper)',
                        color: i <= stageIdx && stageIdx >= 0 ? 'white' : 'var(--ink-muted)',
                      }}
                    >
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
                  {mode === 'aee' && status === 'aguardando_aee' && (
                    <>
                      <button className="btn btn-suc" disabled={busy === plan.id} onClick={() => void act(plan.id, 'approve_aee')}>
                        {busy === plan.id ? 'Salvando...' : 'Aprovar'}
                      </button>
                      <button className="btn btn-out" disabled={busy === plan.id} onClick={() => void act(plan.id, 'reject_aee')}>
                        Devolver ao professor
                      </button>
                    </>
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
