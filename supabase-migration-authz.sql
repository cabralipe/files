-- ============================================================
-- MIGRAÇÃO DE AUTORIZAÇÃO (Bloco 1 — segurança emergencial)
-- ------------------------------------------------------------
-- Objetivo: tornar a tabela public.users a ÚNICA fonte de verdade
-- de papel (role), bloqueio (blocked), município e escola — em vez
-- de user_metadata (que o próprio usuário pode editar pelo client)
-- ou do JWT.
--
-- Rode este arquivo UMA VEZ no SQL Editor do Supabase.
-- É idempotente: pode ser reexecutado sem efeitos colaterais.
-- ============================================================

-- 1) Colunas de autorização na tabela de perfis (users) ------
alter table public.users
  add column if not exists blocked boolean not null default false;

-- school_name (texto) faz a ponte com o modelo atual, em que planos
-- (plans.school) e alunos (students.school_name) são identificados por
-- NOME de escola em texto, não por school_id. O escopo de escola passa
-- a ser lido daqui (servidor), nunca de user_metadata.school.
alter table public.users
  add column if not exists school_name text;

-- 2) Ampliar o CHECK de role para incluir municipality_admin ---
alter table public.users drop constraint if exists users_role_check;
alter table public.users
  add constraint users_role_check
  check (role in (
    'teacher',
    'aee_teacher',
    'coordinator',
    'family',
    'admin',
    'municipality_admin',
    'super_admin'
  ));

-- 3) Backfill (uma vez, confiável) a partir do metadata legado -
-- Como até aqui o papel real vivia em auth.users.raw_user_meta_data
-- (gravado no cadastro via service role), semeamos users a partir dele.
-- A partir de agora a autorização lê SOMENTE public.users.
update public.users u set
  role = coalesce(nullif(au.raw_user_meta_data->>'role', ''), u.role, 'teacher'),
  blocked = coalesce((au.raw_user_meta_data->>'blocked')::boolean, u.blocked, false),
  municipality_id = coalesce(u.municipality_id, nullif(au.raw_user_meta_data->>'municipality_id', '')::uuid),
  school_name = coalesce(u.school_name, nullif(au.raw_user_meta_data->>'school', ''))
from auth.users au
where au.id = u.id;

-- Normaliza qualquer role fora do CHECK para 'teacher' (evita quebra).
update public.users
set role = 'teacher'
where role is null
   or role not in ('teacher','aee_teacher','coordinator','family','admin','municipality_admin','super_admin');

-- 4) FECHAR o furo de escalonamento no próprio banco -----------
-- A policy "Users can update own profile" permitia UPDATE em qualquer
-- coluna da própria linha, inclusive role/blocked. Revogamos o UPDATE
-- das colunas privilegiadas para os papéis anon/authenticated: mesmo
-- pelo client anon exposto, o usuário NÃO consegue se promover.
-- O service_role (usado só no backend) não é afetado por este REVOKE.
revoke update (role, blocked, municipality_id, school_id, school_name)
  on public.users from authenticated, anon;

-- 5) Papel confiável para RLS (defesa em profundidade) ---------
-- Deriva o papel da tabela users (não do JWT/metadata). Usado pelas
-- policies abaixo caso algum acesso passe a usar client autenticado.
create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text from public.users where id = auth.uid()
$$;

create or replace function public.current_app_municipality()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select municipality_id from public.users where id = auth.uid()
$$;

-- 6) Reescrever policies de students/AEE para NÃO confiar no JWT -
-- Antes: (auth.jwt() -> 'user_metadata' ->> 'role') — forjável.
-- Agora: public.current_app_role() — vem da tabela users.
drop policy if exists "Pedagogical users can view students" on students;
drop policy if exists "AEE and coordination can manage students" on students;
drop policy if exists "Pedagogical users can view AEE profiles" on student_aee_profiles;
drop policy if exists "AEE and coordination can manage AEE profiles" on student_aee_profiles;

create policy "Pedagogical users can view students" on students
  for select using (
    public.current_app_role() in ('teacher','aee_teacher','coordinator','admin','municipality_admin','super_admin')
    and (
      public.current_app_role() in ('super_admin')
      or municipality_id = public.current_app_municipality()
    )
  );
create policy "AEE and coordination can manage students" on students
  for all using (
    public.current_app_role() in ('aee_teacher','coordinator','admin','municipality_admin','super_admin')
    and (
      public.current_app_role() in ('super_admin')
      or municipality_id = public.current_app_municipality()
    )
  ) with check (
    public.current_app_role() in ('aee_teacher','coordinator','admin','municipality_admin','super_admin')
  );
create policy "Pedagogical users can view AEE profiles" on student_aee_profiles
  for select using (
    public.current_app_role() in ('aee_teacher','coordinator','admin','municipality_admin','super_admin')
  );
create policy "AEE and coordination can manage AEE profiles" on student_aee_profiles
  for all using (
    public.current_app_role() in ('aee_teacher','coordinator','admin','municipality_admin','super_admin')
  ) with check (
    public.current_app_role() in ('aee_teacher','coordinator','admin','municipality_admin','super_admin')
  );

-- 7) Índices de apoio ------------------------------------------
create index if not exists idx_users_municipality on public.users(municipality_id);
create index if not exists idx_users_role on public.users(role);
create index if not exists idx_users_school_name on public.users(school_name);
