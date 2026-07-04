import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { ensureUserProfile } from '@/lib/supabase-server'

const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(1, 'Informe a senha'),
})

export async function POST(request: Request) {
  try {
    const values = loginSchema.parse(await request.json())
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
    const { data, error } = await supabase.auth.signInWithPassword(values)

    if (error) {
      throw error
    }

    // Bloqueio é lido da tabela users (fonte de verdade), não de user_metadata.
    let profile: Record<string, any> | null = null
    if (data.user) {
      profile = (await ensureUserProfile(data.user)) as Record<string, any>
    }

    if (profile?.blocked === true) {
      return NextResponse.json(
        { error: 'Sua conta foi bloqueada. Entre em contato com o administrador.' },
        { status: 403 }
      )
    }

    return NextResponse.json({ user: data.user, session: data.session })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dados invalidos' }, { status: 400 })
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao fazer login' },
      { status: 401 },
    )
  }
}
