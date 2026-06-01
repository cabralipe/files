import { NextResponse, type NextRequest } from 'next/server'

// Rotas globais (sem município no path)
const GLOBAL_PREFIXES = [
  '/_next',
  '/api',
  '/favicon',
  '/static',
  '/assets',
  '/super-admin',
  '/auth',
]

const RESERVED_SLUGS = new Set([
  'api',
  'super-admin',
  'auth',
  '_next',
  'favicon',
  'static',
  'assets',
  'admin',
])

// slug kebab-case ASCII
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/' || GLOBAL_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const first = pathname.split('/').filter(Boolean)[0] || ''
  const isSlug = SLUG_RE.test(first) && !RESERVED_SLUGS.has(first)

  if (!isSlug) {
    return NextResponse.next()
  }

  const res = NextResponse.next()
  res.headers.set('x-municipality-slug', first)
  return res
}
