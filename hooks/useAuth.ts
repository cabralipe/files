import { useAuthContext } from '@/components/AuthProvider'

export type { AuthProfile } from '@/components/AuthProvider'
export type { AppRole as UserRole } from '@/lib/authz-rules'

export function useAuth() {
  return useAuthContext()
}
