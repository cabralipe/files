import { headers } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export type Municipality = {
  id: string
  slug: string
  name: string
  state: string
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
  contact_email: string | null
  is_active: boolean
  config: Record<string, unknown>
  created_at: string
}

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug)
}

export async function getMunicipalityBySlug(slug: string): Promise<Municipality | null> {
  if (!isValidSlug(slug)) return null
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('municipalities')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()
  if (error || !data) return null
  return data as Municipality
}

export async function getMunicipalityById(id: string): Promise<Municipality | null> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('municipalities')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null
  return data as Municipality
}

/**
 * Resolve o município a partir do request:
 *   1) header x-municipality-slug (injetado pelo middleware)
 *   2) header x-municipality-id (chamadas internas)
 *   3) query param ?municipality=<slug>
 *   4) primeiro segmento do Referer
 */
export async function resolveMunicipality(request: Request): Promise<Municipality | null> {
  const slugHeader = request.headers.get('x-municipality-slug')
  if (slugHeader) {
    const m = await getMunicipalityBySlug(slugHeader)
    if (m) return m
  }

  const idHeader = request.headers.get('x-municipality-id')
  if (idHeader) {
    const m = await getMunicipalityById(idHeader)
    if (m) return m
  }

  try {
    const url = new URL(request.url)
    const qp = url.searchParams.get('municipality')
    if (qp) {
      const m = await getMunicipalityBySlug(qp)
      if (m) return m
    }
  } catch {
    // ignore
  }

  const referer = request.headers.get('referer')
  if (referer) {
    try {
      const url = new URL(referer)
      const first = url.pathname.split('/').filter(Boolean)[0]
      if (first && isValidSlug(first)) {
        const m = await getMunicipalityBySlug(first)
        if (m) return m
      }
    } catch {
      // ignore
    }
  }

  return null
}

/**
 * Resolve o município de forma SEGURA para rotas administrativas:
 * - super_admin pode operar em qualquer município (via header/slug);
 * - demais papéis ficam presos ao município do seu contexto (banco),
 *   ignorando qualquer slug enviado pelo cliente.
 * Lança 'MUNICIPALITY_NOT_FOUND' quando não há município resolvível.
 */
export async function scopedMunicipalityId(
  request: Request,
  ctx: { role: string; municipalityId: string | null },
): Promise<string> {
  if (ctx.role === 'super_admin') {
    const m = await resolveMunicipality(request)
    if (!m) throw new Error('MUNICIPALITY_NOT_FOUND')
    return m.id
  }
  if (!ctx.municipalityId) throw new Error('MUNICIPALITY_NOT_FOUND')
  return ctx.municipalityId
}

/** Igual a scopedMunicipalityId, mas retorna o município completo. */
export async function scopedMunicipality(
  request: Request,
  ctx: { role: string; municipalityId: string | null },
): Promise<Municipality> {
  if (ctx.role === 'super_admin') {
    const m = await resolveMunicipality(request)
    if (!m) throw new Error('MUNICIPALITY_NOT_FOUND')
    return m
  }
  if (!ctx.municipalityId) throw new Error('MUNICIPALITY_NOT_FOUND')
  const m = await getMunicipalityById(ctx.municipalityId)
  if (!m) throw new Error('MUNICIPALITY_NOT_FOUND')
  return m
}

export async function requireMunicipality(request: Request): Promise<Municipality> {
  const m = await resolveMunicipality(request)
  if (!m) throw new Error('MUNICIPALITY_NOT_FOUND')
  return m
}

/**
 * Server Components: lê o slug do header injetado pelo middleware e busca o município.
 * Retorna null se o request não estiver dentro de um segmento de município.
 */
export async function getMunicipalityFromHeaders(): Promise<Municipality | null> {
  const h = headers()
  const slug = h.get('x-municipality-slug')
  if (!slug) return null
  return getMunicipalityBySlug(slug)
}

export async function listActiveMunicipalities(): Promise<Municipality[]> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('municipalities')
    .select('*')
    .eq('is_active', true)
    .order('state', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw error
  return (data || []) as Municipality[]
}