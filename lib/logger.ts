// Logger seguro: em produção NÃO registra conteúdo sensível (nome de aluno,
// diagnóstico, CID, texto de PEI/plano, dados familiares). Fora de produção,
// loga tudo para facilitar o debug.
//
// Regra: nunca passe conteúdo pedagógico/pessoal em `meta`. Use apenas campos
// de rastreio (route, userId, municipalityId, status, durationMs, code).

type SafeMeta = {
  route?: string
  userId?: string
  municipalityId?: string
  status?: number | string
  durationMs?: number
  code?: string
  count?: number
  [key: string]: unknown
}

const SAFE_KEYS = new Set([
  'route',
  'userId',
  'municipalityId',
  'status',
  'durationMs',
  'code',
  'count',
])

function pickSafe(meta?: SafeMeta) {
  if (!meta) return undefined
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(meta)) {
    if (SAFE_KEYS.has(k)) out[k] = v
  }
  return out
}

export function safeLog(event: string, meta?: SafeMeta) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(event, meta ?? '')
    return
  }
  console.log(event, pickSafe(meta) ?? {})
}

export function safeError(event: string, error: unknown, meta?: SafeMeta) {
  const code = error instanceof Error ? error.name : undefined
  if (process.env.NODE_ENV !== 'production') {
    console.error(event, error, meta ?? '')
    return
  }
  // Em produção: só a mensagem curta e metadados de rastreio, sem stack/PII.
  const message = error instanceof Error ? error.message.slice(0, 200) : 'unknown'
  console.error(event, { ...(pickSafe(meta) ?? {}), code, message })
}
