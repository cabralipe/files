import { createClient, type User } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { ensureUserProfile, getSupabaseAdmin } from '@/lib/supabase-server'
import { getMunicipalityById, resolveMunicipality } from '@/lib/municipality'

const registerSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  name: z.string().trim().min(2, 'Informe o nome'),
  role: z.enum(['teacher', 'aee_teacher', 'coordinator']).default('teacher'),
  school_id: z.string().uuid().optional(),
  school_ids: z.array(z.string().uuid()).min(1, 'Selecione ao menos uma escola').optional(),
  subject: z.string().trim().optional().default(''),
  municipality_id: z.string().trim().uuid('Selecione o municipio').optional().or(z.literal('')).default(''),
}).superRefine((values, ctx) => {
  if (!values.school_id && (!values.school_ids || values.school_ids.length === 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Selecione ao menos uma escola', path: ['school_ids'] })
  }
  if (!values.subject || values.subject.trim().length < 2) {
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
    const admin = getSupabaseAdmin()
    const schoolIds = Array.from(new Set(values.school_ids?.length ? values.school_ids : [values.school_id!]))
    const { data: schools, error: schoolError } = await admin
      .from('schools')
      .select('id, name, municipality_id')
      .in('id', schoolIds)
      .eq('municipality_id', municipality.id)
    if (schoolError) throw schoolError
    if (!schools || schools.length !== schoolIds.length) {
      return NextResponse.json({ error: 'Selecione uma escola válida do município.' }, { status: 400 })
    }
    const school = schools.find((item) => item.id === schoolIds[0]) || schools[0]
    const role = values.role
    const metadata = {
      name: values.name,
      role,
      school: school.name,
      school_id: school.id,
      subject: values.subject,
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
      // Try to create the user; if already registered, update instead
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: values.email,
        password: values.password,
        email_confirm: true,
        user_metadata: metadata,
        app_metadata: { role, municipality_id: municipality.id, school_id: school.id, must_change_password: false },
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
        await ensureUserProfile(user, municipality.id, { role, school: school.name, schoolId: school.id })
      } catch (profileError) {
        console.error('[register] ensureUserProfile failed:', profileError)
      }

      // Vincula usuário ao município (tabela user_municipalities)
      try {
        const admin = getSupabaseAdmin()
        await admin.from('user_schools').upsert(
          schoolIds.map((schoolId) => ({ user_id: user.id, school_id: schoolId })),
          { onConflict: 'user_id,school_id' },
        )
        await admin
          .from('user_municipalities')
          .upsert(
            { user_id: user.id, municipality_id: municipality.id, role },
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

    return NextResponse.json({ user: sessionData.user, session: sessionData.session, role, municipality: { id: municipality.id, slug: municipality.slug, name: municipality.name, state: municipality.state } }, { status: 201 })
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
