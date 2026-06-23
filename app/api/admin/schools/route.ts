import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { getSupabaseAdmin, requireAdminUser } from "@/lib/supabase-server";
import { requireMunicipality } from "@/lib/municipality";

export const dynamic = "force-dynamic";

const schoolSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Informe o nome da escola"),
  city: z.string().trim().min(2, "Informe a cidade"),
  state: z.string().trim().length(2, "Informe a UF com 2 letras"),
  cnpj: z.string().trim().max(18).optional().nullable(),
});

export async function GET(request: Request) {
  try {
    await requireAdminUser(request);
    const municipality = await requireMunicipality(request);
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("schools")
      .select("*")
      .eq("municipality_id", municipality.id)
      .order("name");

    if (error) throw error;
    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    return apiError(error, "Erro ao listar escolas");
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser(request);
    const municipality = await requireMunicipality(request);
    const values = schoolSchema.omit({ id: true }).parse(await request.json());
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("schools")
      .insert({
        ...values,
        state: values.state.toUpperCase(),
        cnpj: values.cnpj || null,
        municipality_id: municipality.id,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return apiError(error, "Erro ao cadastrar escola");
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdminUser(request);
    const municipality = await requireMunicipality(request);
    const values = schoolSchema
      .required({ id: true })
      .parse(await request.json());
    const supabase = getSupabaseAdmin();
    const { id, ...changes } = values;
    const { data, error } = await supabase
      .from("schools")
      .update({
        ...changes,
        state: changes.state.toUpperCase(),
        cnpj: changes.cnpj || null,
      })
      .eq("id", id)
      .eq("municipality_id", municipality.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return apiError(error, "Erro ao atualizar escola");
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdminUser(request);
    const municipality = await requireMunicipality(request);
    const id = new URL(request.url).searchParams.get("id");
    if (!id)
      return NextResponse.json(
        { error: "Escola obrigatória" },
        { status: 400 },
      );

    const supabase = getSupabaseAdmin();
    const [{ count: users }, { count: students }] = await Promise.all([
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("school_id", id),
      supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("school_id", id),
    ]);
    if ((users || 0) + (students || 0) > 0) {
      return NextResponse.json(
        {
          error:
            "A escola possui usuários ou alunos vinculados e não pode ser excluída",
        },
        { status: 409 },
      );
    }

    const { error } = await supabase
      .from("schools")
      .delete()
      .eq("id", id)
      .eq("municipality_id", municipality.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, "Erro ao excluir escola");
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
