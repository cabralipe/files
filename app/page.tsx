import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function GlobalLanding() {
  redirect('/bncc-nacional')
}