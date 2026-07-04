-- ============================================================
-- NORMALIZAÇÃO DA TABELA users (Bloco 4 — itens 17/18)
-- ------------------------------------------------------------
-- Alguns ambientes têm a coluna legada `name` (NOT NULL) além de `full_name`,
-- o que forçava o backend a tentar 3 formatos de INSERT (tentativa-e-erro).
-- Esta migração padroniza o schema para que `full_name` seja a coluna canônica
-- e `name` (se existir) fique opcional, permitindo um único INSERT no backend.
--
-- Rode UMA VEZ no SQL Editor do Supabase. Idempotente.
-- ============================================================

-- 1) Garante a coluna canônica.
alter table public.users add column if not exists full_name text;

-- 2) Backfill de full_name a partir de name/email quando vazio.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'users' and column_name = 'name'
  ) then
    execute $q$
      update public.users
      set full_name = coalesce(nullif(full_name, ''), nullif(name, ''), email, 'Professor(a)')
      where full_name is null or full_name = ''
    $q$;
    -- 3) Torna a coluna legada `name` opcional (não quebra inserts que a omitem).
    begin
      alter table public.users alter column name drop not null;
    exception when others then null;
    end;
  else
    update public.users
    set full_name = coalesce(nullif(full_name, ''), email, 'Professor(a)')
    where full_name is null or full_name = '';
  end if;
end $$;

-- 4) full_name passa a ser obrigatório (agora que está preenchido).
do $$
begin
  alter table public.users alter column full_name set not null;
exception when others then null;
end $$;
