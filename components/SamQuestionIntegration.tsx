'use client'

import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { samCompatibility, type SamDraftQuestion } from '@/lib/sam-integration'

type Props = {
  content: string
  subject: string
  gradeLevel: string
  bnccCodes: string[]
  count: number
  sourceRef?: string
}

async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}
}

export default function SamQuestionIntegration({ content, subject, gradeLevel, bnccCodes, count, sourceRef }: Props) {
  const compatibility = useMemo(() => samCompatibility(subject, gradeLevel), [subject, gradeLevel])
  const [questions, setQuestions] = useState<SamDraftQuestion[]>([])
  const [requestId, setRequestId] = useState('')
  const [descriptors, setDescriptors] = useState<Array<{ code: string; label: string }>>([])
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  if (!compatibility || !content.trim() || !bnccCodes.length) return null

  async function generate() {
    setGenerating(true)
    setError('')
    setMessage('')
    try {
      const headers = await authHeaders()
      const response = await fetch('/api/integrations/sam/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          ...compatibility,
          content,
          bnccCodes: [...new Set(bnccCodes)],
          count: Math.min(count, 20),
          sourceRef,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Erro ao preparar questões para o SAM')
      setQuestions(payload.data || [])
      setRequestId(crypto.randomUUID())
      setDescriptors(payload.descriptors || [])
      setMessage('Questões estruturadas. Revise enunciados, alternativas e gabaritos antes de enviar.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao preparar questões para o SAM')
    } finally {
      setGenerating(false)
    }
  }

  function updateQuestion(index: number, patch: Partial<SamDraftQuestion>) {
    setQuestions((current) => current.map((question, position) => position === index ? { ...question, ...patch } : question))
  }

  function updateOption(questionIndex: number, optionIndex: number, value: string) {
    const nextOptions = [...questions[questionIndex].options] as SamDraftQuestion['options']
    nextOptions[optionIndex] = value
    updateQuestion(questionIndex, { options: nextOptions })
  }

  async function send() {
    setSending(true)
    setError('')
    setMessage('')
    try {
      const headers = await authHeaders()
      const response = await fetch('/api/integrations/sam/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ requestId, questions }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'O SAM recusou o lote')
      setMessage(payload.duplicate
        ? `Este lote já havia sido recebido pelo SAM. Nenhuma questão foi duplicada. Lote: ${payload.batchId}`
        : `${payload.created} questão(ões) enviada(s) ao SAM como rascunho. Lote: ${payload.batchId}`)
      setQuestions([])
      setRequestId('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar ao SAM')
    } finally {
      setSending(false)
    }
  }

  return (
    <section style={{ border: '2.5px solid var(--ink)', boxShadow: 'var(--stamp)', background: 'var(--blue-wash)', padding: 16, marginTop: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <strong style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: 18 }}>Enviar questões para o SAM</strong>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
            {compatibility.subject === 'LP' ? 'Língua Portuguesa' : 'Matemática'} · {compatibility.grade}º ano · entrada sempre como rascunho
          </span>
        </div>
        <button className="btn btn-pri" type="button" disabled={generating || sending} onClick={() => void generate()}>
          {generating ? 'Estruturando...' : questions.length ? 'Gerar novamente' : 'Preparar para o SAM'}
        </button>
      </div>

      {error && <div className="al-error" style={{ marginTop: 12 }}>{error}</div>}
      {message && <div className="al-ok" style={{ marginTop: 12 }}>{message}</div>}

      {questions.length > 0 && (
        <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
          {questions.map((question, index) => (
            <article key={`${question.descriptor}-${index}`} style={{ border: '2px solid var(--ink)', background: 'var(--paper)', padding: 13 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <strong>Questão {index + 1}</strong>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select aria-label={`Descritor da questão ${index + 1}`} value={question.descriptor} onChange={(event) => updateQuestion(index, { descriptor: event.target.value })}>
                    {descriptors.map((descriptor) => <option key={descriptor.code} value={descriptor.code}>{descriptor.code} — {descriptor.label}</option>)}
                  </select>
                  <select aria-label={`Dificuldade da questão ${index + 1}`} value={question.difficulty} onChange={(event) => updateQuestion(index, { difficulty: event.target.value as SamDraftQuestion['difficulty'] })}>
                    <option value="facil">Fácil</option>
                    <option value="medio">Médio</option>
                    <option value="dificil">Difícil</option>
                  </select>
                  <button className="btn btn-gh" type="button" onClick={() => setQuestions((current) => current.filter((_item, position) => position !== index))}>Remover</button>
                </div>
              </div>
              <label className="fgr" style={{ marginTop: 10 }}>
                <span className="fl">Enunciado</span>
                <textarea value={question.statement} onChange={(event) => updateQuestion(index, { statement: event.target.value })} />
              </label>
              <div style={{ display: 'grid', gap: 7 }}>
                {question.options.map((option, optionIndex) => (
                  <label key={optionIndex} style={{ display: 'grid', gridTemplateColumns: '30px 1fr', gap: 7, alignItems: 'center' }}>
                    <input type="radio" name={`sam-answer-${index}`} checked={question.answer === optionIndex} onChange={() => updateQuestion(index, { answer: optionIndex })} aria-label={`Alternativa ${String.fromCharCode(65 + optionIndex)} correta na questão ${index + 1}`} />
                    <input value={option} onChange={(event) => updateOption(index, optionIndex, event.target.value)} aria-label={`Alternativa ${String.fromCharCode(65 + optionIndex)} da questão ${index + 1}`} />
                  </label>
                ))}
              </div>
              <label className="fgr" style={{ marginTop: 10 }}>
                <span className="fl">Explicação do gabarito</span>
                <textarea value={question.explanation} onChange={(event) => updateQuestion(index, { explanation: event.target.value })} />
              </label>
            </article>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-suc" type="button" disabled={sending || !questions.length || !requestId} onClick={() => void send()}>
              {sending ? 'Enviando...' : `Enviar ${questions.length} rascunho(s) ao SAM`}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
