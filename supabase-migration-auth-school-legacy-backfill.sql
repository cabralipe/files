-- Materializa escolas legadas ja vinculadas a usuarios/alunos do mesmo municipio.
-- Nao usa aproximacao nem cruza municipios.
insert into public.schools (name, city, state, municipality_id)
select distinct legacy.name, m.name, m.state, m.id
from public.municipalities m
join (
  select municipality_id, btrim(school_name) as name
  from public.users
  where school_name is not null and btrim(school_name) <> ''
  union
  select municipality_id, btrim(school_name) as name
  from public.students
  where school_name is not null and btrim(school_name) <> ''
) legacy on legacy.municipality_id = m.id
where not exists (
  select 1 from public.schools s
  where s.municipality_id = m.id
    and lower(btrim(s.name)) = lower(legacy.name)
);

update public.users u
set school_id = s.id,
    school_name = s.name
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
