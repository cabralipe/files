'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from '@/lib/m-link'
import { useRouter } from '@/lib/m-link'
import { useAuth } from '@/hooks/useAuth'
import { useMunicipality } from '@/lib/municipality-context'

type NavItem = { href: string; label: string; cta?: boolean }

// Papeis com acesso a paineis especificos.
const ROLE_LINKS: Record<string, NavItem> = {
  aee_teacher: { href: '/aee', label: 'Painel AEE' },
  coordinator: { href: '/coordinator', label: 'Coordenação' },
  family: { href: '/family', label: 'Família' },
  admin: { href: '/admin', label: 'Administração' },
  municipality_admin: { href: '/admin', label: 'Administração' },
  super_admin: { href: '/admin', label: 'Administração' },
}

export default function AppHeader() {
  const { user, profile, signOut, loading } = useAuth()
  const { municipality, slug } = useMunicipality()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const name = municipality?.name || 'Município'
  const uf = municipality?.state ? `/${municipality.state}` : ''
  const role = profile?.role || 'teacher'
  const displayName = profile?.fullName || user?.email || ''
  const accountSlug = profile?.municipality?.slug || ''

  // Caminho relativo ao municipio, para destacar a secao ativa.
  const rel = slug && pathname?.startsWith(`/${slug}`) ? pathname.slice(slug.length + 1) || '/' : pathname || '/'
  const isActive = (href: string) =>
    href === '/' ? rel === '/' : rel === href || rel.startsWith(href + '/')

  // Fecha o menu mobile ao trocar de rota.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const links: NavItem[] = [{ href: '/', label: 'Portais' }]
  if (user) {
    links.push(
      { href: '/dashboard', label: 'Painel' },
      { href: '/experiences', label: 'Experiências' },
      { href: '/ranking', label: 'Ranking' },
    )
    const roleLink = ROLE_LINKS[role]
    if (roleLink) links.push(roleLink)
    links.push({ href: '/profile', label: 'Meu perfil' })
  }

  async function handleSignOut() {
    await signOut()
    router.push('/')
  }

  return (
    <header id="hdr" className="app-hdr">
      <div className="hdr-in">
        <Link href="/" className="logo" aria-label={`Portal BNCC de ${name}`}>
          <div className="logo-ic" />
          <div style={{ minWidth: 0 }}>
            <div className="logo-t">Portal BNCC</div>
            <div className="logo-s">
              {name}
              {uf}
            </div>
          </div>
        </Link>

        <button
          type="button"
          className="app-hdr-burger"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
          aria-controls="app-hdr-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav
          id="app-hdr-nav"
          className={`hdr-nav app-hdr-nav${open ? ' is-open' : ''}`}
          aria-label="Navegação principal"
        >
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={`nb${isActive(l.href) ? ' on' : ''}`}>
              {l.label}
            </Link>
          ))}

          {!loading && (
            user ? (
              <span className="app-hdr-user">
                <span className="app-hdr-name" title={displayName}>
                  {displayName}
                </span>
                <button type="button" className="nb" onClick={handleSignOut}>
                  Sair
                </button>
              </span>
            ) : (
              <a
                href={`/auth/login?next=${encodeURIComponent(pathname || '/')}`}
                className="nb nb-cta"
              >
                Entrar
              </a>
            )
          )}
        </nav>
      </div>

      {/* Conta de outra rede: avisa e oferece o caminho certo. */}
      {user && accountSlug && slug && accountSlug !== slug && (
        <div className="app-hdr-tenant-warn" role="status">
          Sua conta pertence à rede <strong>{accountSlug}</strong>, mas você está no portal de{' '}
          <strong>{name}</strong>.{' '}
          <a href={`/${accountSlug}`}>Ir para a minha rede →</a>
        </div>
      )}

      <style>{`
        .app-hdr-burger {
          display: none;
          margin-left: auto;
          flex-direction: column;
          justify-content: center;
          gap: 5px;
          width: 44px;
          height: 40px;
          border: 2px solid var(--ink);
          background: var(--paper-soft);
          box-shadow: var(--stamp);
          cursor: pointer;
          flex-shrink: 0;
        }
        .app-hdr-burger span {
          display: block;
          height: 3px;
          width: 22px;
          margin: 0 auto;
          background: var(--ink);
        }
        .app-hdr-user {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-left: 6px;
          padding-left: 10px;
          border-left: 2px dashed var(--ink-faint);
        }
        .app-hdr-tenant-warn {
          background: var(--mustard-wash);
          border-top: 2px solid var(--ink);
          padding: 8px 18px;
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--ink-soft);
          text-align: center;
        }
        .app-hdr-tenant-warn strong { color: var(--ink); }
        .app-hdr-tenant-warn a { color: var(--ink); font-weight: 700; }
        .app-hdr-name {
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 600;
          color: var(--ink-soft);
          max-width: 160px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        @media (max-width: 820px) {
          .app-hdr-burger { display: flex; }
          .app-hdr .hdr-in { flex-wrap: wrap; }
          .app-hdr-nav {
            display: none;
            flex-basis: 100%;
            width: 100%;
            flex-direction: column;
            align-items: stretch;
            margin-left: 0;
            gap: 4px;
            padding: 8px 0 6px;
            border-top: 2px solid var(--ink-faint);
          }
          .app-hdr-nav.is-open { display: flex; }
          .app-hdr-nav .nb { justify-content: flex-start; width: 100%; }
          .app-hdr-user {
            width: 100%;
            margin-left: 0;
            padding-left: 0;
            border-left: 0;
            border-top: 2px dashed var(--ink-faint);
            margin-top: 4px;
            padding-top: 8px;
            justify-content: space-between;
          }
          .app-hdr-name { max-width: none; }
        }
      `}</style>
    </header>
  )
}
