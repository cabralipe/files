import { createClient, type User } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { ensureUserProfile, getSupabaseAdmin } from '@/lib/supabase-server'
import { municipalSchools, teacherSubjectOptions } from '@/lib/education-options'

const registerSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  name: z.string().trim().min(2, 'Informe o nome'),
  role: z.enum(['teacher', 'coordinator']).default('teacher'),
  school: z.string().trim().optional().default(''),
  subject: z.string().trim().optional().default(''),
}).superRefine((values, ctx) => {
  if (!municipalSchools.includes(values.school)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Selecione uma escola da rede municipal',
      path: ['school'],
    })
  }

  if (values.role === 'teacher' && !teacherSubjectOptions.includes(values.subject)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Selecione a disciplina que leciona',
      path: ['subject'],
    })
  }
})

export async function POST(request: Request) {
  try {
    const values = registerSchema.parse(await request.json())
    const metadata = {
      name: values.name,
      role: values.role,
      school: values.school,
      subject: values.role === 'teacher' ? values.subject : '',
    }
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
    let user: User | null = null

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = getSupabaseAdmin()
      const { data: existingAuthUsers, error: listError } = await admin.auth.admin.listUsers()

      if (listError) {
        throw listError
      }

      const existingUser = existingAuthUsers.users.find((item) => item.email === values.email)

      if (existingUser) {
        const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(existingUser.id, {
          password: values.password,
          email_confirm: true,
          user_metadata: metadata,
        })

        if (updateError) {
          throw updateError
        }

        user = updated.user
      } else {
        const { data: created, error: createError } = await admin.auth.admin.createUser({
          email: values.email,
          password: values.password,
          email_confirm: true,
          user_metadata: metadata,
        })

        if (createError) {
          throw createError
        }

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
      await ensureUserProfile(user)
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

    return NextResponse.json({ user: sessionData.user, session: sessionData.session }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dados invalidos' }, { status: 400 })
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao cadastrar' },
      { status: 500 },
    )
  }
}
