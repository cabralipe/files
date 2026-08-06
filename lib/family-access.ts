import { getSupabaseAdmin } from '@/lib/supabase-server'

export type FamilyAccessLink = {
  id: string
  student_id: string
  municipality_id: string
  school_id: string | null
  responsible_name: string
  relationship: string | null
  token: string
  status: 'pending_approval' | 'approved' | 'revoked'
  created_by: string
  approved_by: string | null
  approved_at: string | null
  created_at: string
}

// Token opaco de 32 bytes (256 bits) em base64url — o único segredo que
// protege o acesso da família (não há login). Precisa ser imprevisível.
export function generateFamilyToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Buffer.from(bytes).toString('base64url')
}

export async function getFamilyLinkByToken(token: string): Promise<FamilyAccessLink | null> {
  if (!token) return null
  const { data, error } = await getSupabaseAdmin()
    .from('family_access_links')
    .select('*')
    .eq('token', token)
    .maybeSingle()
  if (error) throw error
  return (data as FamilyAccessLink) || null
}
