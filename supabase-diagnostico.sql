-- =============================================================
-- DIAGNÓSTICO: verifica se o banco está alinhado com o sistema
-- Cole no Supabase SQL Editor e execute.
-- =============================================================

-- ------------------------------------------------------------
-- 1. TABELAS ESPERADAS
-- ------------------------------------------------------------
SELECT
  t.expected                        AS tabela,
  CASE WHEN c.relname IS NOT NULL THEN '✅ existe' ELSE '❌ FALTANDO' END AS status
FROM (VALUES
  ('users'),
  ('schools'),
  ('skills'),
  ('plans'),
  ('plan_skills'),
  ('students'),
  ('student_aee_profiles'),
  ('family_student_links'),
  ('successful_experiences'),
  ('experience_skills'),
  ('points_transactions'),
  ('likes'),
  ('comments'),
  ('notifications'),
  ('municipalities'),
  ('user_municipalities'),
  ('analytics_events')
) t(expected)
LEFT JOIN pg_class c
  ON c.relname = t.expected
  AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY status, tabela;

-- ------------------------------------------------------------
-- 2. VIEW ESPERADA
-- ------------------------------------------------------------
SELECT
  'ranking_view' AS view_name,
  CASE WHEN viewname IS NOT NULL THEN '✅ existe' ELSE '❌ FALTANDO' END AS status
FROM (SELECT viewname FROM pg_views WHERE schemaname = 'public' AND viewname = 'ranking_view') v
RIGHT JOIN (SELECT 1) dummy ON true;

-- ------------------------------------------------------------
-- 3. COLUNAS CRÍTICAS POR TABELA
-- ------------------------------------------------------------
SELECT
  e.tabela,
  e.coluna,
  CASE WHEN a.attname IS NOT NULL THEN '✅' ELSE '❌ FALTANDO' END AS status,
  COALESCE(pg_catalog.format_type(a.atttypid, a.atttypmod), '—') AS tipo_atual
FROM (VALUES
  -- users
  ('users', 'id'),
  ('users', 'email'),
  ('users', 'full_name'),
  ('users', 'avatar_url'),
  ('users', 'role'),
  ('users', 'subject'),
  ('users', 'school_id'),
  ('users', 'municipality_id'),
  -- schools
  ('schools', 'id'),
  ('schools', 'name'),
  -- skills
  ('skills', 'id'),
  ('skills', 'code'),
  ('skills', 'name'),
  ('skills', 'grade_level'),
  ('skills', 'competency'),
  ('skills', 'subject'),
  -- plans
  ('plans', 'id'),
  ('plans', 'user_id'),
  ('plans', 'title'),
  ('plans', 'grade_level'),
  ('plans', 'subject'),
  ('plans', 'content'),
  ('plans', 'is_published'),
  ('plans', 'plan_status'),
  ('plans', 'municipality_id'),
  ('plans', 'coordinator_viewed_at'),
  ('plans', 'coordinator_id'),
  ('plans', 'coordinator_note'),
  ('plans', 'revisao_regente'),
  ('plans', 'colaboracao_aee'),
  ('plans', 'consulta_familia'),
  ('plans', 'is_pei'),
  ('plans', 'student_id'),
  ('plans', 'pei_snapshot'),
  -- students
  ('students', 'id'),
  ('students', 'municipality_id'),
  ('students', 'school_name'),
  ('students', 'full_name'),
  ('students', 'grade_level'),
  ('students', 'active'),
  ('students', 'created_by'),
  -- student_aee_profiles
  ('student_aee_profiles', 'student_id'),
  ('student_aee_profiles', 'public_target'),
  ('student_aee_profiles', 'learning_barriers'),
  ('student_aee_profiles', 'privacy_level'),
  -- family_student_links
  ('family_student_links', 'family_user_id'),
  ('family_student_links', 'student_id'),
  ('family_student_links', 'relationship'),
  -- successful_experiences
  ('successful_experiences', 'id'),
  ('successful_experiences', 'user_id'),
  ('successful_experiences', 'grade_level'),
  ('successful_experiences', 'category'),
  ('successful_experiences', 'is_featured'),
  ('successful_experiences', 'municipality_id'),
  -- points_transactions
  ('points_transactions', 'user_id'),
  ('points_transactions', 'points_amount'),
  ('points_transactions', 'reason'),
  ('points_transactions', 'municipality_id'),
  -- likes
  ('likes', 'user_id'),
  ('likes', 'experience_id'),
  ('likes', 'municipality_id'),
  -- comments
  ('comments', 'user_id'),
  ('comments', 'experience_id'),
  ('comments', 'content'),
  ('comments', 'municipality_id'),
  -- municipalities
  ('municipalities', 'id'),
  ('municipalities', 'slug'),
  ('municipalities', 'name'),
  ('municipalities', 'is_active'),
  -- user_municipalities
  ('user_municipalities', 'user_id'),
  ('user_municipalities', 'municipality_id'),
  ('user_municipalities', 'role'),
  -- analytics_events
  ('analytics_events', 'event_type'),
  ('analytics_events', 'page'),
  ('analytics_events', 'school')
) e(tabela, coluna)
LEFT JOIN pg_attribute a
  ON a.attrelid = (
    SELECT oid FROM pg_class
    WHERE relname = e.tabela
      AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  )
  AND a.attname = e.coluna
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY status, e.tabela, e.coluna;

-- ------------------------------------------------------------
-- 4. FOREIGN KEYS CRÍTICAS
-- ------------------------------------------------------------
SELECT
  e.descricao,
  CASE WHEN fk.constraint_name IS NOT NULL THEN '✅ existe' ELSE '❌ FALTANDO' END AS status
FROM (VALUES
  ('student_aee_profiles → students',  'student_aee_profiles', 'students'),
  ('family_student_links → students',  'family_student_links',  'students'),
  ('family_student_links → users',     'family_student_links',  'users'),
  ('plans → users',                    'plans',                 'users'),
  ('students → users (created_by)',    'students',              'users'),
  ('user_municipalities → users',      'user_municipalities',   'users'),
  ('user_municipalities → municipalities', 'user_municipalities','municipalities')
) e(descricao, from_table, to_table)
LEFT JOIN (
  SELECT
    tc.constraint_name,
    tc.table_name AS from_table,
    ccu.table_name AS to_table
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = 'public'
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
) fk ON fk.from_table = e.from_table AND fk.to_table = e.to_table
ORDER BY status, e.descricao;

-- ------------------------------------------------------------
-- 5. ÍNDICES CRÍTICOS
-- ------------------------------------------------------------
SELECT
  e.index_name,
  CASE WHEN i.indexname IS NOT NULL THEN '✅ existe' ELSE '❌ FALTANDO' END AS status
FROM (VALUES
  ('idx_plans_user_id'),
  ('idx_plans_subject'),
  ('idx_plans_grade_level'),
  ('idx_plans_is_published'),
  ('idx_plans_municipality'),
  ('idx_students_municipality_id'),
  ('idx_students_school_name'),
  ('idx_skills_subject'),
  ('idx_skills_grade_level'),
  ('idx_experiences_municipality'),
  ('idx_users_municipality'),
  ('idx_points_user_id'),
  ('idx_likes_user_id'),
  ('idx_family_student_links_user')
) e(index_name)
LEFT JOIN pg_indexes i
  ON i.indexname = e.index_name
  AND i.schemaname = 'public'
ORDER BY status, e.index_name;

-- ------------------------------------------------------------
-- 6. RLS HABILITADO NAS TABELAS SENSÍVEIS
-- ------------------------------------------------------------
SELECT
  relname AS tabela,
  CASE WHEN relrowsecurity THEN '✅ RLS ON' ELSE '❌ RLS OFF' END AS rls
FROM pg_class
WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND relname IN (
    'users','plans','students','student_aee_profiles',
    'family_student_links','successful_experiences',
    'points_transactions','likes','comments','municipalities'
  )
ORDER BY rls, relname;
