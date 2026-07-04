import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { getSupabaseAdmin, requireSuperAdmin, ensureUserProfile } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug deve estar em kebab-case (ex: sao-paulo)'),
  name: z.string().trim().min(2),
  state: z.string().trim().length(2),
  logo_url: z.string().trim().optional().nullable(),
  primary_color: z.string().trim().optional().nullable(),
  secondary_color: z.string().trim().optional().nullable(),
  contact_email: z.string().email().optional().nullable(),
  config: z.record(z.any()).optional(),
  admin_email: z.string().email().optional(),
  admin_password: z.string().min(6).optional(),
  admin_name: z.string().trim().min(2).optional(),
})

export async function GET(request: Request) {
  try {
    await requireSuperAdmin(request)
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('municipalities')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error

    const ids = (data || []).map((m) => m.id)
    let stats: Record<string, { users: number; plans: number; experiences: number }> = {}
    if (ids.length) {
      const [usersCounts, plansCounts, expCounts] = await Promise.all([
        supabase.from('users').select('municipality_id'),
        supabase.from('plans').select('municipality_id'),
        supabase.from('successful_experiences').select('municipality_id'),
      ])
      const count = (rows: any[] | null, id: string) =>
        (rows || []).filter((r) => r.municipality_id === id).length
      for (const id of ids) {
        stats[id] = {
          users: count(usersCounts.data, id),
          plans: count(plansCounts.data, id),
          experiences: count(expCounts.data, id),
        }
      }
    }

    return NextResponse.json({ success: true, data, stats })
  } catch (error) {
    return errorResponse(error, 'Erro ao listar municipios')
  }
}

export async function POST(request: Request) {
  try {
    const superUser = await requireSuperAdmin(request)
    const body = createSchema.parse(await request.json())
    const supabase = getSupabaseAdmin()

    const { data: existing } = await supabase
      .from('municipalities')
      .select('id')
      .eq('slug', body.slug)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Slug ja em uso' }, { status: 409 })
    }

    const { data: created, error: insertError } = await supabase
      .from('municipalities')
      .insert({
        slug: body.slug,
        name: body.name,
        state: body.state.toUpperCase(),
        logo_url: body.logo_url || null,
        primary_color: body.primary_color || '#E5394B',
        secondary_color: body.secondary_color || '#A6B0DD',
        contact_email: body.contact_email || null,
        config: body.config || {},
        created_by: superUser.userId,
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Cria admin inicial (opcional)
    if (body.admin_email && body.admin_password && body.admin_name) {
      const { data: created2, error: createErr } = await supabase.auth.admin.createUser({
        email: body.admin_email,
        password: body.admin_password,
        email_confirm: true,
        user_metadata: {
          name: body.admin_name,
          role: 'municipality_admin',
          municipality_id: created.id,
          municipality_slug: created.slug,
        },
      })
      if (!createErr && created2.user) {
        await ensureUserProfile(created2.user, created.id, { role: 'municipality_admin' })
        await supabase
          .from('user_municipalities')
          .upsert(
            { user_id: created2.user.id, municipality_id: created.id, role: 'municipality_admin' },
            { onConflict: 'user_id,municipality_id' },
          )
      }
    }

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dados invalidos' }, { status: 400 })
    }
    return errorResponse(error, 'Erro ao criar municipio')
  }
}

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof Error && error.message === 'UNAUTHORIZED') {
    return NextResponse.json({ error: 'Login obrigatorio' }, { status: 401 })
  }
  if (error instanceof Error && ['FORBIDDEN', 'BLOCKED'].includes(error.message)) {
    return NextResponse.json({ error: 'Acesso negado (super admin)' }, { status: 403 })
  }
  console.error(fallback, error)
  return NextResponse.json({ error: fallback }, { status: 500 })
}
