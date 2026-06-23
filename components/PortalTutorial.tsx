'use client'

/**
 * PortalTutorial — tour guiado compartilhado entre os portais.
 *
 * - Abre automaticamente na primeira visita (controlado por localStorage).
 * - Pode ser reaberto a qualquer momento pelo botão "? Como usar" no menu.
 * - Passos com `selector` destacam o elemento real da tela (spotlight);
 *   passos sem `selector` aparecem como modal centralizado.
 * - Reusa as classes visuais `tut-*` do globals.css.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export type TutorialStep = {
  icon: string
  iconStyle: React.CSSProperties
  title: string
  body: string
  /** Texto do botão do menu a destacar (ex.: 'Plano') */
  tip?: string | null
  /** Seletor CSS do elemento a destacar na tela (spotlight) */
  selector?: string
}

export function usePortalTutorial(storageKey: string) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(storageKey)) {
        // pequeno atraso para a tela montar antes do tour
        const t = setTimeout(() => setOpen(true), 600)
        return () => clearTimeout(t)
      }
    } catch { /* empty */ }
  }, [storageKey])

  const openTutorial = useCallback(() => setOpen(true), [])
  const closeTutorial = useCallback(() => {
    try { localStorage.setItem(storageKey, '1') } catch { /* empty */ }
    setOpen(false)
  }, [storageKey])

  return { open, openTutorial, closeTutorial }
}

type Rect = { top: number; left: number; width: number; height: number }

export function PortalTutorial({
  open,
  onClose,
  steps,
  masthead = 'PORTAL · TUTORIAL',
}: {
  open: boolean
  onClose: () => void
  steps: TutorialStep[]
  masthead?: string
}) {
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  // Reinicia no primeiro passo sempre que abre
  useEffect(() => { if (open) setStep(0) }, [open])

  const current = steps[step]

  // Calcula o spotlight do passo atual
  useEffect(() => {
    if (!open) { setRect(null); return }
    const sel = current?.selector
    if (!sel) { setRect(null); return }

    let raf = 0
    const measure = () => {
      const el = document.querySelector(sel)
      if (!el) { setRect(null); return }
      const r = el.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) { setRect(null); return }
      setRect({ top: r.top - 8, left: r.left - 8, width: r.width + 16, height: r.height + 16 })
    }

    const el = document.querySelector(sel)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // espera o scroll suave assentar antes de medir
      const t = setTimeout(measure, 420)
      const onMove = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure) }
      window.addEventListener('resize', onMove)
      window.addEventListener('scroll', onMove, true)
      return () => {
        clearTimeout(t)
        cancelAnimationFrame(raf)
        window.removeEventListener('resize', onMove)
        window.removeEventListener('scroll', onMove, true)
      }
    }
    setRect(null)
  }, [open, step, current?.selector])

  // Fecha com ESC / navega com setas
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && step < steps.length - 1) setStep(s => s + 1)
      if (e.key === 'ArrowLeft' && step > 0) setStep(s => s - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, step, steps.length, onClose])

  if (!open || !current) return null

  const spot = Boolean(rect)

  // Posição do cartão no modo spotlight: abaixo do elemento se couber, senão acima
  let cardStyle: React.CSSProperties = {}
  if (spot && rect) {
    const vh = window.innerHeight
    const estH = 420
    const below = rect.top + rect.height + 18
    const top = below + estH < vh ? below : Math.max(12, rect.top - estH - 18)
    cardStyle = { position: 'fixed', top, left: '50%', transform: 'translateX(-50%)', margin: 0 }
  }

  return (
    <div className={`mbk tut-bk${spot ? ' tut-bk-spot' : ''}`} onClick={onClose}>
      {spot && rect && (
        <div
          className="tut-ring"
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
        />
      )}
      <div
        ref={cardRef}
        className={`mdl tut-mdl${spot ? ' tut-mdl-spot' : ''}`}
        style={{ ...cardStyle, ['--tut-masthead' as string]: `'${masthead}'` }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label="Tutorial de uso"
      >
        <button className="mdl-close" onClick={onClose} aria-label="Fechar tutorial">×</button>
        <div className="tut-dots">
          {steps.map((_, i) => (
            <button
              key={i}
              className={`tut-dot ${i === step ? 'on' : i < step ? 'done' : ''}`}
              onClick={() => setStep(i)}
              aria-label={`Ir ao passo ${i + 1}`}
            />
          ))}
        </div>
        <div className="tut-icon" style={current.iconStyle}>{current.icon}</div>
        <div className="tut-step">Passo {step + 1} de {steps.length}</div>
        <h2 className="tut-title">{current.title}</h2>
        <p className="tut-body">{current.body}</p>
        {current.tip && (
          <p className="tut-tip">
            Clique em <span className="tut-navmock">{current.tip}</span> no menu do topo
          </p>
        )}
        <div className="tut-actions">
          {step > 0 && (
            <button className="btn btn-out" onClick={() => setStep(step - 1)}>← Anterior</button>
          )}
          {step < steps.length - 1 ? (
            <button className="btn btn-pri" onClick={() => setStep(step + 1)}>Próximo →</button>
          ) : (
            <button className="btn btn-pri" onClick={onClose}>Entendido! ✓</button>
          )}
        </div>
        <button className="tut-skip" onClick={onClose}>Pular tutorial</button>
      </div>

      <style>{`
        .tut-bk-spot { background: transparent !important; }
        .tut-ring {
          position: fixed;
          z-index: 590;
          pointer-events: none;
          border: 3px dashed var(--red);
          box-shadow: 0 0 0 9999px rgba(27, 26, 31, .62);
          transition: top .25s, left .25s, width .25s, height .25s;
          animation: tut-ring-in .3s ease-out;
        }
        @keyframes tut-ring-in { from { opacity: 0; } to { opacity: 1; } }
        .tut-mdl-spot {
          max-width: 460px;
          padding-top: 48px;
          z-index: 601;
        }
        .tut-mdl-spot .tut-icon { width: 64px; height: 64px; font-size: 28px; margin-bottom: 16px; }
        .tut-mdl-spot .tut-title { font-size: 24px; }
        .tut-mdl-spot .tut-body { font-size: 13.5px; }
        @media (max-width: 640px) {
          .tut-mdl-spot {
            position: fixed !important;
            top: auto !important;
            bottom: 10px;
            left: 12px !important;
            right: 12px;
            transform: none !important;
            width: auto;
          }
        }
      `}</style>
    </div>
  )
}

/**
 * SkillsHowTo — faixa didática no topo da tela de habilidades.
 * Mostra os 3 passos de uso e o botão para reabrir o tutorial.
 * Dispensável (localStorage).
 */
export function SkillsHowTo({
  storageKey,
  accentVar = 'var(--blue)',
  washVar = 'var(--blue-wash)',
  referencialLabel,
  itemLabel = 'habilidades',
  onOpenTutorial,
}: {
  storageKey: string
  accentVar?: string
  washVar?: string
  referencialLabel: string
  itemLabel?: string
  onOpenTutorial: () => void
}) {
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    try { setHidden(Boolean(localStorage.getItem(storageKey))) } catch { setHidden(false) }
  }, [storageKey])

  function dismiss() {
    try { localStorage.setItem(storageKey, '1') } catch { /* empty */ }
    setHidden(true)
  }

  if (hidden) return null

  return (
    <div className="howto" style={{ background: washVar }}>
      <button className="howto-x" onClick={dismiss} aria-label="Dispensar guia">×</button>
      <div className="howto-head">
        <span className="howto-stamp" style={{ background: accentVar }}>?</span>
        <div>
          <div className="howto-title">Como usar esta tela</div>
          <div className="howto-sub">
            Aqui você explora os itens ({itemLabel}) do {referencialLabel} e monta seu plano de aula em 3 passos:
          </div>
        </div>
      </div>
      <ol className="howto-steps">
        <li>
          <span className="howto-n">1</span>
          <div>
            <strong>Busque e filtre</strong>
            <span>Use a busca ou os filtros de disciplina e ano para encontrar {itemLabel} para sua aula.</span>
          </div>
        </li>
        <li>
          <span className="howto-n">2</span>
          <div>
            <strong>Selecione {itemLabel}</strong>
            <span>Clique em <em>Detalhes</em> para ver a referência completa e em <em>+ Plano</em> para adicionar ao seu plano.</span>
          </div>
        </li>
        <li>
          <span className="howto-n">3</span>
          <div>
            <strong>Gere o plano com IA</strong>
            <span>Na aba <em>Plano</em>, preencha os dados da aula e a IA escreve um plano completo — editável e em PDF.</span>
          </div>
        </li>
      </ol>
      <div className="howto-actions">
        <button className="btn btn-pri" style={{ fontSize: 12 }} onClick={onOpenTutorial}>▶ Ver tutorial guiado</button>
        <button className="btn btn-gh" style={{ fontSize: 12 }} onClick={dismiss}>Entendi, dispensar</button>
      </div>

      <style>{`
        .howto {
          position: relative;
          border: 3px solid var(--ink);
          box-shadow: var(--stamp-lg);
          padding: 20px 22px 18px;
          margin-bottom: 22px;
        }
        .howto-x {
          position: absolute; top: 8px; right: 10px;
          background: none; border: none; cursor: pointer;
          font-size: 20px; font-weight: 700; color: var(--ink-muted);
          line-height: 1; padding: 4px;
        }
        .howto-x:hover { color: var(--red); }
        .howto-head { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 14px; }
        .howto-stamp {
          width: 40px; height: 40px; flex-shrink: 0;
          display: grid; place-items: center;
          border: 2px solid var(--ink); box-shadow: var(--stamp);
          color: var(--paper-soft);
          font-family: var(--font-display); font-weight: 900; font-size: 20px;
          transform: rotate(-3deg);
        }
        .howto-title {
          font-family: var(--font-display); font-weight: 900;
          font-size: 19px; letter-spacing: -.02em; color: var(--ink);
        }
        .howto-sub { font-size: 13px; color: var(--ink-soft); margin-top: 2px; max-width: 70ch; }
        .howto-steps {
          list-style: none; margin: 0 0 14px; padding: 0;
          display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;
        }
        .howto-steps li {
          display: flex; gap: 10px; align-items: flex-start;
          background: var(--paper-soft);
          border: 2px solid var(--ink); box-shadow: 3px 3px 0 var(--ink);
          padding: 12px 14px;
        }
        .howto-n {
          width: 26px; height: 26px; flex-shrink: 0;
          display: grid; place-items: center;
          border: 2px solid var(--ink); background: var(--paper);
          font-family: var(--font-display); font-weight: 900; font-size: 14px;
        }
        .howto-steps strong {
          display: block; font-size: 13px; font-weight: 800;
          color: var(--ink); margin-bottom: 3px;
        }
        .howto-steps span:not(.howto-n) { font-size: 12px; line-height: 1.55; color: var(--ink-soft); }
        .howto-steps em { font-style: normal; font-weight: 700; color: var(--ink); }
        .howto-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        @media (max-width: 640px) {
          .howto { padding: 16px 14px 14px; }
          .howto-steps { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
