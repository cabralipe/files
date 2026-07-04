-- ============================================================
-- MIGRAÇÃO DE PONTUAÇÃO IDEMPOTENTE (Bloco 3 — item 13)
-- ------------------------------------------------------------
-- Hoje like/comentário/enroll creditam pontos direto, sem idempotência:
-- curtir→descurtir→curtir farma +5 a cada ciclo; comentar em massa farma +2.
--
-- Esta tabela registra CADA evento de pontuação de forma única por
-- (user_id, source_type, source_id). O backend credita os pontos só quando
-- o evento é NOVO (anti-farming), com teto diário opcional por tipo.
--
-- Rode UMA VEZ no SQL Editor do Supabase. Idempotente.
-- ============================================================

create table if not exists public.score_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  source_type text not null,   -- ex.: 'like_recebido', 'comentario_criado'
  source_id text not null,     -- ex.: '<liker_id>:<experience_id>', comment_id, plan_id
  points integer not null,
  created_at timestamptz not null default now(),
  unique (user_id, source_type, source_id)
);

alter table public.score_events enable row level security;
-- Sem policies: apenas o service_role (backend) grava/lê.

create index if not exists idx_score_events_user_type_day
  on public.score_events(user_id, source_type, created_at);
