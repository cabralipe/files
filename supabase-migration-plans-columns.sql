-- ============================================================
-- MIGRAÇÃO DE COLUNAS FILTRÁVEIS EM plans (Bloco 3 — itens 14/15/16)
-- ------------------------------------------------------------
-- O plano é gravado como JSON em plans.content ({__publicPlan, plan}). Isso
-- impede filtro/índice por status, tipo (PAEE) e escola no banco, forçando
-- carregar TODOS os planos e filtrar em memória (O(n)).
--
-- Aqui adicionamos colunas ESPELHO (mantidas em sincronia pelo backend em
-- toPlanRow) para permitir filtro/índice em SQL. O JSON continua sendo o
-- registro de conteúdo; estas colunas são só para consulta/autorização.
--
-- Rode UMA VEZ no SQL Editor do Supabase. Idempotente.
-- ============================================================

alter table public.plans add column if not exists is_paee boolean not null default false;
alter table public.plans add column if not exists school_name text;
-- workflow_status carrega o status real do fluxo (rascunho, aguardando_aee,
-- aguardando_familia, vigente, arquivado, substituido). Sem CHECK para não
-- brigar com o CHECK legado da coluna plan_status.
alter table public.plans add column if not exists workflow_status text;

-- Backfill a partir do JSON, tolerando linhas com conteúdo não-JSON (legado).
do $$
declare r record;
begin
  for r in select id, content from public.plans loop
    begin
      if r.content is not null and left(btrim(r.content), 1) = '{' then
        update public.plans p set
          is_paee = coalesce((r.content::jsonb -> 'plan' ->> 'is_paee')::boolean, false),
          school_name = coalesce(nullif(r.content::jsonb -> 'plan' ->> 'school', ''), p.school_name),
          workflow_status = coalesce(
            nullif(r.content::jsonb -> 'plan' ->> 'plan_status', ''),
            p.workflow_status,
            case when p.is_published then 'vigente' else 'rascunho' end
          )
        where p.id = r.id;
      end if;
    exception when others then
      null; -- conteúdo não é JSON válido: ignora esta linha
    end;
  end loop;
end $$;

-- Índices para as consultas de fila/aluno/escola.
create index if not exists idx_plans_muni_pei on public.plans(municipality_id, is_pei);
create index if not exists idx_plans_muni_paee on public.plans(municipality_id, is_paee);
create index if not exists idx_plans_student on public.plans(student_id);
create index if not exists idx_plans_muni_school on public.plans(municipality_id, school_name);
create index if not exists idx_plans_workflow_status on public.plans(workflow_status);
