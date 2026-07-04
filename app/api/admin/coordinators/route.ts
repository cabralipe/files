import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import {
  ensureUserProfile,
  getSupabaseAdmin,
  requireAdminUser,
} from "@/lib/supabase-server";
import { scopedMunicipality, scopedMunicipalityId } from "@/lib/municipality";

export const dynamic = "force-dynamic";

const coordinatorSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Informe o nome do coordenador"),
  email: z.string().trim().email("Informe um email válido"),
  password: z
    .string()
    .min(6, "A senha deve ter pelo menos 6 caracteres")
    .optional(),
  school_id: z.string().uuid("Selecione uma escola"),
  blocked: z.boolean().optional().default(false),
});

async function getMunicipalitySchool(schoolId: string, municipalityId: string) {
  const { data } = await getSupabaseAdmin()
    .from("schools")
    .select("id, name")
    .eq("id", schoolId)
    .eq("municipality_id", municipalityId)
    .maybeSingle();
  return data;
}

export async function GET(request: Request) {
  try {
    const ctx = await requireAdminUser(request);
    const municipalityId = await scopedMunicipalityId(request, ctx);
    const supabase = getSupabaseAdmin();
    const { data: profiles, error } = await supabase
      .from("users")
      .select("id, full_name, school_id, blocked, schools(name)")
      .eq("municipality_id", municipalityId)
      .eq("role", "coordinator")
      .order("full_name");
    if (error) throw error;

    const { data: authData, error: authError } =
      await supabase.auth.admin.listUsers();
    if (authError) throw authError;
    const authById = new Map(
      (authData.users || []).map((user) => [user.id, user]),
    );
    const data = (profiles || []).map((profile) => {
      const auth = authById.get(profile.id);
      const relation = profile.schools as unknown as
        | { name?: string }
        | { name?: string }[]
        | null;
      const school = Array.isArray(relation) ? relation[0] : relation;
      return {
        id: profile.id,
        name: profile.full_name || auth?.user_metadata?.name || "",
        email: auth?.email || "",
        school_id: profile.school_id,
        school_name: school?.name || "",
        blocked: (profile as { blocked?: boolean }).blocked === true,
      };
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return apiError(error, "Erro ao listar coordenadores");
  }
}

export async function POST(request: Request) {
  let createdUserId: string | null = null;
  try {
    const ctx = await requireAdminUser(request);
    const municipality = await scopedMunicipality(request, ctx);
    const municipalityId = municipality.id;
    const values = coordinatorSchema
      .required({ password: true })
      .omit({ id: true })
      .parse(await request.json());
    const school = await getMunicipalitySchool(
      values.school_id,
      municipalityId,
    );
    if (!school) {
      return NextResponse.json(
        { error: "Escola inválida para este município" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: created, error: createError } =
      await supabase.auth.admin.createUser({
        email: values.email,
        password: values.password,
        email_confirm: true,
        user_metadata: {
          name: values.name,
          role: "coordinator",
          blocked: values.blocked,
          municipality_id: municipalityId,
          municipality_slug: municipality.slug,
          school_id: values.school_id,
          school: school.name,
        },
      });
    if (createError || !created.user)
      throw createError || new Error("Usuário não criado");
    createdUserId = created.user.id;
    await ensureUserProfile(created.user, municipalityId, {
      role: "coordinator",
      school: school.name,
    });
    const { error: profileError } = await supabase
      .from("users")
      .update({
        full_name: values.name,
        role: "coordinator",
        school_id: values.school_id,
        school_name: school.name,
        blocked: values.blocked === true,
      })
      .eq("id", created.user.id);
    if (profileError) throw profileError;

    return NextResponse.json(
      { success: true, data: { id: created.user.id } },
      { status: 201 },
    );
  } catch (error) {
    if (createdUserId)
      await getSupabaseAdmin().auth.admin.deleteUser(createdUserId);
    return apiError(error, "Erro ao cadastrar coordenador");
  }
}

export async function PUT(request: Request) {
  try {
    const ctx = await requireAdminUser(request);
    const municipality = await scopedMunicipality(request, ctx);
    const municipalityId = municipality.id;
    const values = coordinatorSchema
      .required({ id: true })
      .parse(await request.json());
    const school = await getMunicipalitySchool(
      values.school_id,
      municipalityId,
    );
    if (!school) {
      return NextResponse.json(
        { error: "Escola inválida para este município" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: profile } = await supabase
      .from("users")
      .select("id")
      .eq("id", values.id)
      .eq("municipality_id", municipalityId)
      .eq("role", "coordinator")
      .maybeSingle();
    if (!profile)
      return NextResponse.json(
        { error: "Coordenador não encontrado" },
        { status: 404 },
      );

    const authChanges: Record<string, unknown> = {
      email: values.email,
      user_metadata: {
        name: values.name,
        role: "coordinator",
        blocked: values.blocked,
        municipality_id: municipalityId,
        municipality_slug: municipality.slug,
        school_id: values.school_id,
        school: school.name,
      },
    };
    if (values.password) authChanges.password = values.password;
    const { error: authError } = await supabase.auth.admin.updateUserById(
      values.id,
      authChanges,
    );
    if (authError) throw authError;

    const { error: profileError } = await supabase
      .from("users")
      .update({
        full_name: values.name,
        email: values.email,
        role: "coordinator",
        school_id: values.school_id,
        school_name: school.name,
        blocked: values.blocked === true,
      })
      .eq("id", values.id);
    if (profileError) throw profileError;
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, "Erro ao atualizar coordenador");
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await requireAdminUser(request);
    const admin = { id: ctx.userId };
    const municipalityId = await scopedMunicipalityId(request, ctx);
    const id = new URL(request.url).searchParams.get("id");
    if (!id)
      return NextResponse.json(
        { error: "Coordenador obrigatório" },
        { status: 400 },
      );
    if (id === admin.id)
      return NextResponse.json(
        { error: "Você não pode excluir sua própria conta" },
        { status: 409 },
      );

    const supabase = getSupabaseAdmin();
    const { data: profile } = await supabase
      .from("users")
      .select("id")
      .eq("id", id)
      .eq("municipality_id", municipalityId)
      .eq("role", "coordinator")
      .maybeSingle();
    if (!profile)
      return NextResponse.json(
        { error: "Coordenador não encontrado" },
        { status: 404 },
      );

    const detachResults = await Promise.all([
      supabase
        .from("plans")
        .update({ coordinator_id: null })
        .eq("coordinator_id", id),
      supabase
        .from("students")
        .update({ created_by: null })
        .eq("created_by", id),
      supabase
        .from("student_aee_profiles")
        .update({ updated_by: null })
        .eq("updated_by", id),
    ]);
    const detachError = detachResults.find((result) => result.error)?.error;
    if (detachError) throw detachError;
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) throw error;
    await supabase.from("users").delete().eq("id", id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, "Erro ao excluir coordenador");
  }
}

function apiError(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: error.issues[0]?.message || "Dados inválidos" },
      { status: 400 },
    );
  }
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Login obrigatório" }, { status: 401 });
  }
  if (
    error instanceof Error &&
    ["FORBIDDEN", "BLOCKED"].includes(error.message)
  ) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }
  if (error instanceof Error && error.message === "MUNICIPALITY_NOT_FOUND") {
    return NextResponse.json(
      { error: "Município não identificado" },
      { status: 400 },
    );
  }
  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
