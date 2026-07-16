-- Remove autorizacao baseada em raw_user_meta_data editavel pelo usuario.
drop policy if exists analytics_select_admin on public.analytics_events;
create policy analytics_select_admin on public.analytics_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.users u
      where u.id = (select auth.uid())
        and u.role in ('admin', 'municipality_admin', 'super_admin')
        and u.blocked = false
    )
  );

-- A view passa a obedecer as permissoes/RLS do chamador.
alter view public.ranking_view set (security_invoker = true);

create index if not exists idx_user_role_audit_actor on public.user_role_audit(actor_user_id);
create index if not exists idx_user_role_audit_previous_school on public.user_role_audit(previous_school_id);
create index if not exists idx_user_role_audit_new_school on public.user_role_audit(new_school_id);
