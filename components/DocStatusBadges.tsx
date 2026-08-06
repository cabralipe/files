'use client'

export const PLAN_STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  aguardando_aee: 'Aguardando AEE',
  aguardando_familia: 'Aguardando família',
  vigente: 'Vigente',
  arquivado: 'Arquivado',
  substituido: 'Substituído',
}

export function StatusChip({ status, label }: { status?: string; label?: string }) {
  const key = status || 'rascunho'
  return <span className={`status-chip is-${key}`}>{label || PLAN_STATUS_LABEL[key] || key}</span>
}

/** Selo + ressalva da coordenação — aparece assim que coordinator_viewed_at existe, para o professor (regente ou AEE) que criou o documento. */
export function CoordinatorFeedback({
  viewedAt,
  name,
  note,
}: {
  viewedAt?: string
  name?: string
  note?: string
}) {
  if (!viewedAt) return null
  return (
    <div className="coord-feedback">
      <span className="coord-badge">Validado pela coordenação</span>
      <div style={{ marginTop: 6 }}>
        {name ? (
          <>
            Por <strong>{name}</strong> em {new Date(viewedAt).toLocaleDateString('pt-BR')}.{' '}
          </>
        ) : null}
        {note ? note : !name ? `Validado em ${new Date(viewedAt).toLocaleDateString('pt-BR')}.` : null}
      </div>
    </div>
  )
}
