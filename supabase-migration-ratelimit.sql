-- ============================================================
-- MIGRAÇÃO DE RATE LIMIT COMPARTILHADO (Bloco 2)
-- ------------------------------------------------------------
-- O limitador em memória (lib/rate-limit.ts) não funciona bem em
-- serverless (cada instância tem seu próprio contador). Esta tabela +
-- função dão um limitador de JANELA FIXA atômico e global, usando a
-- própria infra do Supabase (sem Redis/Upstash).
--
-- Rode UMA VEZ no SQL Editor do Supabase. Idempotente.
-- ============================================================

create table if not exists public.rate_limits (
  key text primary key,
  count integer not null default 0,
  reset_at timestamptz not null
);

alter table public.rate_limits enable row level security;
-- Sem policies: apenas o service_role (backend) acessa; anon/authenticated não.

-- Consome 1 requisição para `p_key`. Retorna se foi permitida, quantas restam
-- e em quantos segundos a janela reseta. Atômico (lock de linha no upsert).
create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table(allowed boolean, remaining integer, retry_after integer)
language plpgsql
as $$
declare
  v_now timestamptz := now();
  v_count integer;
  v_reset timestamptz;
begin
  insert into public.rate_limits(key, count, reset_at)
    values (p_key, 1, v_now + make_interval(secs => p_window_seconds))
  on conflict (key) do update
    set count = case
                  when public.rate_limits.reset_at <= v_now then 1
                  else public.rate_limits.count + 1
                end,
        reset_at = case
                     when public.rate_limits.reset_at <= v_now
                       then v_now + make_interval(secs => p_window_seconds)
                     else public.rate_limits.reset_at
                   end
  returning public.rate_limits.count, public.rate_limits.reset_at
    into v_count, v_reset;

  if v_count > p_limit then
    return query select false, 0, greatest(0, ceil(extract(epoch from (v_reset - v_now)))::int);
  else
    return query select true, (p_limit - v_count), 0;
  end if;
end;
$$;

-- Limpeza oportunista de chaves expiradas (rode manualmente ou via cron).
-- delete from public.rate_limits where reset_at < now() - interval '1 hour';
