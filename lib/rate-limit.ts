// Rate limiting simples em memória (janela fixa).
//
// Observação: este limitador é por instância. Em ambientes serverless com
// múltiplas instâncias (ex.: Vercel), ele é "best-effort" — para um limite
// global e robusto, troque o store por um backend compartilhado (Redis/Upstash).
// Ainda assim, mitiga abuso e picos de custo na geração com IA.

type Bucket = { count: number; resetAt: number }

const store = new Map<string, Bucket>()

export type RateLimitResult = {
  ok: boolean
  remaining: number
  retryAfterSeconds: number
}

/**
 * Consome 1 requisição para `key`. Retorna ok=false se o limite foi excedido
 * dentro da janela `windowMs`.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const bucket = store.get(key)

  if (!bucket || now >= bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    // Limpeza oportunista para evitar crescimento indefinido do Map.
    if (store.size > 5000) {
      for (const [k, b] of store) {
        if (now >= b.resetAt) store.delete(k)
      }
    }
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 }
  }

  if (bucket.count >= limit) {
    return { ok: false, remaining: 0, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) }
  }

  bucket.count += 1
  return { ok: true, remaining: limit - bucket.count, retryAfterSeconds: 0 }
}

/** Extrai o IP do cliente a partir dos headers de proxy. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}
