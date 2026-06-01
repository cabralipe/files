'use client'

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import type { Municipality } from '@/lib/municipality'

type Ctx = {
  municipality: Municipality | null
  slug: string
  href: (path: string) => string
}

const MunicipalityContext = createContext<Ctx>({
  municipality: null,
  slug: '',
  href: (path) => path,
})

export function MunicipalityProvider({
  municipality,
  children,
}: {
  municipality: Municipality | null
  children: ReactNode
}) {
  const slug = municipality?.slug || ''
  const installedRef = useRef(false)

  // Patches global fetch ONCE so every /api/* request inside this segment
  // carries the x-municipality-slug header.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (installedRef.current) return
    installedRef.current = true

    const w = window as typeof window & { __nativeFetch?: typeof fetch }
    if (!w.__nativeFetch) w.__nativeFetch = window.fetch.bind(window)
    const nativeFetch = w.__nativeFetch!

    window.fetch = ((input: RequestInfo | URL, init: RequestInit = {}) => {
      try {
        const currentSlug = (window as any).__municipalitySlug || slug
        if (!currentSlug) return nativeFetch(input, init)

        let url: string
        if (typeof input === 'string') url = input
        else if (input instanceof URL) url = input.toString()
        else url = (input as Request).url

        const sameOrigin = url.startsWith('/') || url.startsWith(window.location.origin)
        const isApi = sameOrigin && /\/api\//.test(url)
        if (!isApi) return nativeFetch(input, init)

        const headers = new Headers(init.headers || (input as Request).headers || {})
        if (!headers.has('x-municipality-slug')) {
          headers.set('x-municipality-slug', currentSlug)
        }
        return nativeFetch(input, { ...init, headers })
      } catch {
        return nativeFetch(input, init)
      }
    }) as typeof fetch
  }, [slug])

  useEffect(() => {
    if (typeof window === 'undefined') return
    ;(window as any).__municipalitySlug = slug
  }, [slug])

  const value = useMemo<Ctx>(() => {
    const href = (path: string) => {
      if (!slug) return path
      if (!path.startsWith('/')) path = '/' + path
      if (
        path === '/' ||
        path.startsWith('/super-admin') ||
        path.startsWith('/auth') ||
        path.startsWith('/api')
      ) {
        return path
      }
      if (path.startsWith(`/${slug}/`) || path === `/${slug}`) return path
      return `/${slug}${path}`
    }
    return { municipality, slug, href }
  }, [municipality, slug])

  return <MunicipalityContext.Provider value={value}>{children}</MunicipalityContext.Provider>
}

export function useMunicipality() {
  return useContext(MunicipalityContext)
}
