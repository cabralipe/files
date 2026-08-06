'use client'

import { useEffect } from 'react'

export type PlanContentModalData = {
  title: string
  meta?: string
  content: string
  footer?: React.ReactNode
}

export default function PlanContentModal({
  data,
  onClose,
}: {
  data: PlanContentModalData | null
  onClose: () => void
}) {
  useEffect(() => {
    if (!data) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [data, onClose])

  if (!data) return null

  return (
    <div className="mbk" onClick={onClose}>
      <div className="mdl plan-read-mdl" onClick={(event) => event.stopPropagation()}>
        <div className="mdl-hdr">
          <div>
            <h2 className="mdl-title">{data.title}</h2>
            {data.meta && <div className="plan-read-meta">{data.meta}</div>}
          </div>
          <button className="mdl-close" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        {data.footer}
        <div className="plan-read-body">{data.content}</div>
      </div>
    </div>
  )
}
