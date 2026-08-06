import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createPlan, listPlans } from '@/lib/public-backend'
import { getSupabaseAdmin, getUserSchools, requireUserContext } from '@/lib/supabase-server'
import { resolveMunicipality } from '@/lib/municipality'
import { canGeneratePei } from '@/lib/pei'
import { canGeneratePaee } from '@/lib/paee'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const ctx = await requireUserContext(request)
    // Município do contexto (banco); super_admin pode inspecionar outro via header.
    const municipalityId =
      ctx.role === 'super_admin' ? (await resolveMunicipality(request))?.id : ctx.municipalityId || undefined
    const plans = await listPlans(ctx.userId, municipalityId ?? undefined)

    return NextResponse.json({
      success: true,
      data: plans,
      plans,
      total: plans.length,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Login obrigatorio' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'BLOCKED') {
      return NextResponse.json({ error: 'Conta bloqueada' }, { status: 403 })
    }
    console.error('[GET /api/plans]', error)
    return NextResponse.json({ error: 'Nao foi possivel listar os planos' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireUserContext(request)
    // Plano é sempre criado no município do próprio usuário (não do header).
    const municipalityId =
      ctx.role === 'super_admin' ? (await resolveMunicipality(request))?.id : ctx.municipalityId || undefined
    const body = await request.json()

    // PEI/PAEE sao documentos sensiveis do aluno: a criacao (nao so a geracao
    // por IA) precisa respeitar o mesmo fluxo — professor regente faz o PEI,
    // so o AEE/coordenacao/gestao pode autorar um PAEE.
    if (body.is_paee && !canGeneratePaee(ctx.role)) {
      return NextResponse.json({ error: 'Acesso restrito ao professor AEE, coordenacao ou administracao' }, { status: 403 })
    }
    if (body.is_pei && !canGeneratePei(ctx.role)) {
      return NextResponse.json({ error: 'Acesso restrito a usuarios pedagogicos autenticados' }, { status: 403 })
    }

    const memberships = await getUserSchools(ctx.userId, ctx.municipalityId)
    // string vazia ('') nao conta como "escola informada". Com mais de uma
    // escola vinculada a escolha precisa ser explicita (ambiguidade real);
    // com no maximo uma, cai com seguranca para a escola do proprio perfil —
    // sem isso, um form que ainda nao carregou a escola grava o plano com
    // school_id nulo e ele some da fila do AEE/coordenacao.
    const explicitSchoolId = typeof body.school_id === 'string' && body.school_id ? body.school_id : undefined
    const requestedSchoolId =
      explicitSchoolId || (memberships.length <= 1 ? ctx.schoolId || memberships[0]?.id || undefined : undefined)
    if (memberships.length > 1 && !requestedSchoolId) {
      return NextResponse.json({ error: 'Selecione a escola do documento' }, { status: 400 })
    }
    if (requestedSchoolId && memberships.length && !memberships.some((school) => school.id === requestedSchoolId)) {
      return NextResponse.json({ error: 'A escola selecionada nao esta associada ao seu usuario' }, { status: 403 })
    }
    if (requestedSchoolId) {
      const { data: selectedSchool } = await getSupabaseAdmin().from('schools').select('name').eq('id', requestedSchoolId).maybeSingle()
      if (selectedSchool?.name) body.school = selectedSchool.name
    }

    // PEI/PAEE são sempre de um aluno, que carrega escola e município corretos.
    // Quando o autor (ex.: professor regente sem escola/município no perfil) não
    // fornece esses campos, o documento herda do aluno — senão ele é gravado com
    // municipality_id/school_id nulos e some das filas (o filtro SQL por
    // municipality_id o exclui, e o escopo por escola nunca casa).
    let effectiveSchoolId = requestedSchoolId
    let effectiveMunicipalityId = municipalityId
    if ((body.is_pei || body.is_paee) && typeof body.student_id === 'string' && body.student_id) {
      const { data: student } = await getSupabaseAdmin()
        .from('students')
        .select('school_id, school_name, municipality_id')
        .eq('id', body.student_id)
        .maybeSingle()
      if (student) {
        if (!effectiveSchoolId && student.school_id) effectiveSchoolId = student.school_id
        if (!effectiveMunicipalityId && student.municipality_id) effectiveMunicipalityId = student.municipality_id
        if (!body.school && student.school_name) body.school = student.school_name
      }
    }

    const plan = await createPlan(body, ctx.userId, effectiveMunicipalityId ?? undefined, effectiveSchoolId)

    return NextResponse.json({ success: true, data: plan, plan }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar plano:', error)
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Login obrigatorio para salvar plano' }, { status: 401 })
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dados invalidos' }, { status: 400 })
    }

    if (error instanceof Error && error.message.startsWith('PUBLICATION_BLOCKED:')) {
      return NextResponse.json(
        { error: `Publicacao bloqueada. Pendencias: ${error.message.replace('PUBLICATION_BLOCKED:', '')}` },
        { status: 422 },
      )
    }

    return NextResponse.json({ error: 'Nao foi possivel criar o plano' }, { status: 500 })
  }
}
