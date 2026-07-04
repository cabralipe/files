import { createClient, type User } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { ensureUserProfile, getSupabaseAdmin } from '@/lib/supabase-server'
import { getMunicipalityById, resolveMunicipality } from '@/lib/municipality'

const registerSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  name: z.string().trim().min(2, 'Informe o nome'),
  role: z.enum(['teacher', 'aee_teacher', 'coordinator', 'family']).default('teacher'),
  school: z.string().trim().optional().default(''),
  subject: z.string().trim().optional().default(''),
  municipality_id: z.string().trim().uuid('Selecione o municipio').optional().or(z.literal('')).default(''),
}).superRefine((values, ctx) => {
  // Lista de escolas é por município; aqui só rejeita string vazia.
  if (!values.school || values.school.trim().length < 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Informe a escola',
      path: ['school'],
    })
  }

  if (values.role === 'teacher' && (!values.subject || values.subject.trim().length < 2)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Informe a disciplina que leciona',
      path: ['subject'],
    })
  }
})

export async function POST(request: Request) {
  try {
    const values = registerSchema.parse(await request.json())
    const municipality = values.municipality_id
      ? await getMunicipalityById(values.municipality_id)
      : await resolveMunicipality(request)
    if (!municipality || !municipality.is_active) {
      return NextResponse.json(
        { error: 'Selecione um municipio ativo para vincular sua conta ao referencial curricular correto.' },
        { status: 400 },
      )
    }
    const metadata = {
      name: values.name,
      role: values.role,
      school: values.school,
      subject: values.role === 'teacher' ? values.subject : '',
      municipality_id: municipality.id,
      municipality_slug: municipality.slug,
      municipality_name: municipality.name,
      municipality_state: municipality.state,
    }
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
    let user: User | null = null

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = getSupabaseAdmin()

      // Try to create the user; if already registered, update instead
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: values.email,
        password: values.password,
        email_confirm: true,
        user_metadata: metadata,
      })

      if (createError) {
        const msg = createError.message?.toLowerCase() ?? ''
        const isAlreadyExists =
          msg.includes('already registered') ||
          msg.includes('already exists') ||
          msg.includes('database error finding users') ||
          (createError as any).code === 'email_exists' ||
          (createError as any).status === 422
        if (isAlreadyExists) {
          return NextResponse.json(
            { error: 'Este email já possui cadastro. Faça login ou use "Esqueceu a senha?" para recuperar o acesso.' },
            { status: 409 },
          )
        }
        throw createError
      } else {
        user = created.user
      }
    } else {
      const { data, error } = await authClient.auth.signUp({
        email: values.email,
        password: values.password,
        options: { data: metadata },
      })

      if (error) {
        throw error
      }

      user = data.user
    }

    if (user) {
      try {
        // Semeia papel e escola na tabela users (fonte de verdade de autorização),
        // a partir dos dados validados do formulário — não de user_metadata.
        await ensureUserProfile(user, municipality.id, { role: values.role, school: values.school })
      } catch (profileError) {
        console.error('[register] ensureUserProfile failed:', profileError)
      }

      // Vincula usuário ao município (tabela user_municipalities)
      try {
        const admin = getSupabaseAdmin()
        await admin
          .from('user_municipalities')
          .upsert(
            { user_id: user.id, municipality_id: municipality.id, role: values.role },
            { onConflict: 'user_id,municipality_id' },
          )
      } catch (linkError) {
        console.error('Falha ao vincular usuario ao municipio:', linkError)
      }
    }

    const { data: sessionData, error: loginError } = await authClient.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    if (loginError) {
      return NextResponse.json(
        {
          user,
          session: null,
          message: 'Cadastro criado. Faca login com email e senha.',
        },
        { status: 201 },
      )
    }

    return NextResponse.json({ user: sessionData.user, session: sessionData.session, municipality: { id: municipality.id, slug: municipality.slug, name: municipality.name, state: municipality.state } }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dados invalidos' }, { status: 400 })
    }

    console.error('[register] unhandled error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao cadastrar' },
      { status: 500 },
    )
  }
}
