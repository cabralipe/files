import { redirect } from 'next/navigation'

const DEFAULT_MUNICIPALITY_SLUG =
  process.env.NEXT_PUBLIC_DEFAULT_MUNICIPALITY_SLUG || 'atalaia-al'

export const dynamic = 'force-dynamic'

export default function AdminShortcut() {
  redirect(`/${DEFAULT_MUNICIPALITY_SLUG}/admin`)
}
