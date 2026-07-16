'use client'

type Props = {
  hidden: boolean
  available: boolean
  onChange: (hidden: boolean) => void
}

export default function AnswerKeyVisibility({ hidden, available, onChange }: Props) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', border: '2px solid var(--ink)', background: hidden ? 'var(--mustard-wash)' : 'var(--paper)', fontFamily: 'var(--font-body)', fontSize: 13, cursor: available ? 'pointer' : 'not-allowed', opacity: available ? 1 : 0.62, margin: '10px 0' }}>
      <input
        type="checkbox"
        checked={hidden}
        disabled={!available}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <strong>Ocultar gabarito</strong>
        {' — '}{hidden ? 'versão do aluno ativa; o PDF também sairá sem respostas.' : available ? 'ative para preparar a versão do aluno.' : 'gere o documento para habilitar.'}
      </span>
    </label>
  )
}
