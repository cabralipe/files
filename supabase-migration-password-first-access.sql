-- Obriga contas provisionadas pela gestão a trocar a senha provisória.
alter table public.users
  add column if not exists must_change_password boolean not null default false;

create index if not exists idx_users_must_change_password
  on public.users (municipality_id, must_change_password)
  where must_change_password = true;
