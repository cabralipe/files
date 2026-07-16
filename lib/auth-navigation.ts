import type { AppRole } from '@/lib/authz-rules'

type NavigationProfile = {
  role: AppRole
  municipality: { slug: string } | null
}

export function roleHomePath(profile: NavigationProfile): string {
  if (profile.role === 'super_admin') return '/super-admin'
  const slug = profile.municipality?.slug
  if (!slug) return '/'
  const section = profile.role === 'coordinator'
    ? '/coordinator'
    : profile.role === 'aee_teacher'
      ? '/aee'
      : profile.role === 'family'
        ? '/family'
        : ['admin', 'municipality_admin'].includes(profile.role)
          ? '/admin'
          : ''
  return `/${slug}${section}`
}

export function postLoginPath(profile: NavigationProfile, requestedPath = ''): string {
  if (!requestedPath || !requestedPath.startsWith('/') || requestedPath.startsWith('//') || requestedPath.startsWith('/auth')) {
    return roleHomePath(profile)
  }
  if (profile.role === 'super_admin') return requestedPath
  const slug = profile.municipality?.slug
  return slug && (requestedPath === `/${slug}` || requestedPath.startsWith(`/${slug}/`))
    ? requestedPath
    : roleHomePath(profile)
}
