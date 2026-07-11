-- Tipo de documento gerado por IA na tabela de planos.
-- 'plano'      = plano de aula (padrão, retrocompatível com linhas existentes)
-- 'exercicios' = lista de exercícios
-- 'avaliacao'  = atividade avaliativa (prova)
--
-- Aditiva e segura: coluna NOT NULL com DEFAULT 'plano', então todas as linhas
-- atuais passam a valer 'plano' automaticamente. O backend (lib/public-backend.ts)
-- envia a coluna e degrada com o fallback PGRST204 caso ela ainda não exista.

alter table public.plans
  add column if not exists kind text not null default 'plano';

alter table public.plans
  drop constraint if exists plans_kind_check;

alter table public.plans
  add constraint plans_kind_check
  check (kind in ('plano', 'exercicios', 'avaliacao'));

comment on column public.plans.kind is 'Tipo de documento gerado: plano | exercicios | avaliacao';
