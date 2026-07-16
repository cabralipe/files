-- Identidade/autorizacao escolar por UUID.
-- Mantem school_name/school nos documentos como fotografia historica.

-- 1) Materializa as escolas que ainda vivem em municipalities.config.schools.
insert into public.schools (name, city, state, municipality_id)
select distinct school_name, m.name, m.state, m.id
from public.municipalities m
cross join lateral jsonb_array_elements_text(coalesce(m.config->'schools', '[]'::jsonb)) as school_name
where btrim(school_name) <> ''
  and not exists (
    select 1 from public.schools s
    where s.municipality_id = m.id
      and lower(btrim(s.name)) = lower(btrim(school_name))
  );

create unique index if not exists idx_schools_municipality_normalized_name
  on public.schools (municipality_id, lower(btrim(name)));

-- 2) Escopo escolar canonico nos documentos.
alter table public.plans add column if not exists school_id uuid;
alter table public.successful_experiences add column if not exists school_id uuid;

do $$ begin
  alter table public.plans
    add constraint plans_school_id_fkey foreign key (school_id) references public.schools(id);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.successful_experiences
    add constraint successful_experiences_school_id_fkey foreign key (school_id) references public.schools(id);
exception when duplicate_object then null; end $$;

create index if not exists idx_users_school_id on public.users(school_id);
create index if not exists idx_students_school_id on public.students(school_id);
create index if not exists idx_plans_school_id on public.plans(school_id);
create index if not exists idx_experiences_school_id on public.successful_experiences(school_id);

-- 3) Backfill seguro: somente correspondencia exata normalizada dentro do municipio.
update public.users u
set school_id = s.id,
    school_name = coalesce(u.school_name, s.name)
from public.schools s
where u.school_id is null
  and u.municipality_id = s.municipality_id
  and lower(btrim(u.school_name)) = lower(btrim(s.name));

update public.students st
set school_id = s.id,
    school_name = s.name
from public.schools s
where st.school_id is null
  and st.municipality_id = s.municipality_id
  and lower(btrim(st.school_name)) = lower(btrim(s.name));

update public.plans p
set school_id = u.school_id
from public.users u
where p.school_id is null and p.user_id = u.id and u.school_id is not null;

update public.successful_experiences e
set school_id = u.school_id
from public.users u
where e.school_id is null and e.user_id = u.id and u.school_id is not null;

-- 4) O vinculo usuario-municipio aceita todos os papeis oficiais.
alter table public.user_municipalities drop constraint if exists user_municipalities_role_check;
alter table public.user_municipalities add constraint user_municipalities_role_check
  check (role in ('teacher', 'aee_teacher', 'coordinator', 'family', 'admin', 'municipality_admin', 'super_admin'));

-- 5) Auditoria de concessoes administrativas.
create table if not exists public.user_role_audit (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references public.users(id) on delete cascade,
  actor_user_id uuid not null references public.users(id),
  municipality_id uuid references public.municipalities(id),
  previous_role text,
  new_role text not null,
  previous_school_id uuid references public.schools(id),
  new_school_id uuid references public.schools(id),
  action text not null check (action in ('created', 'role_changed', 'school_changed', 'blocked', 'unblocked')),
  created_at timestamptz not null default now()
);

create index if not exists idx_user_role_audit_target on public.user_role_audit(target_user_id, created_at desc);
create index if not exists idx_user_role_audit_municipality on public.user_role_audit(municipality_id, created_at desc);
alter table public.user_role_audit enable row level security;
revoke all on public.user_role_audit from anon, authenticated;
grant all on public.user_role_audit to service_role;
