'use client'

import NextLink, { type LinkProps as NextLinkProps } from 'next/link'
import { useRouter as useNextRouter } from 'next/navigation'
import { forwardRef, useMemo, type AnchorHTMLAttributes, type ForwardedRef, type ReactNode } from 'react'
import { useMunicipality } from '@/lib/municipality-context'

type MLinkProps = Omit<NextLinkProps, 'href'> &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof NextLinkProps | 'href'> & {
    href: string
    children?: ReactNode
  }

function MLinkInner(props: MLinkProps, ref: ForwardedRef<HTMLAnchorElement>) {
  const { href, ...rest } = props
  const { href: prefix } = useMunicipality()
  return <NextLink ref={ref} href={prefix(href)} {...rest} />
}

const MLink = forwardRef<HTMLAnchorElement, MLinkProps>(MLinkInner)
export default MLink

export function useRouter() {
  const router = useNextRouter()
  const { href } = useMunicipality()
  return useMemo(
    () => ({
      push: (path: string, options?: { scroll?: boolean }) => router.push(href(path), options),
      replace: (path: string, options?: { scroll?: boolean }) => router.replace(href(path), options),
      back: router.back.bind(router),
      forward: router.forward.bind(router),
      refresh: router.refresh.bind(router),
      prefetch: (path: string) => router.prefetch(href(path)),
    }),
    [router, href],
  )
}
