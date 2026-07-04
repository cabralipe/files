import { redirect } from 'next/navigation'

const DEFAULT_MUNICIPALITY_SLUG = process.env.NEXT_PUBLIC_DEFAULT_MUNICIPALITY_SLUG || ''

export const dynamic = 'force-dynamic'

export default function AdminShortcut() {
  if (DEFAULT_MUNICIPALITY_SLUG) {
    redirect(`/${DEFAULT_MUNICIPALITY_SLUG}/admin`)
  }
  redirect('/super-admin')
}