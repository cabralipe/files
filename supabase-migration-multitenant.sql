-- ============================================================================
-- MIGRATION MULTI-TENANT (MUNICÍPIOS)
-- ============================================================================
-- Rode no SQL Editor do Supabase em ordem. Idempotente — pode rodar de novo.
-- Estratégia:
--   1) Cria tabela `municipalities`
--   2) Cria município "Atalaia/AL" (default) para os dados existentes
--   3) Adiciona `municipality_id` nullable em todas as tabelas tenant-scoped
--   4) Faz backfill: tudo que existe hoje → município default
--   5) Torna `municipality_id` NOT NULL nas tabelas onde já há dados
--   6) Cria tabela de vínculo N:N user_municipalities (auth global, papel por município)
--   7) Cria funções/políticas RLS por município
-- ============================================================================

-- ---------- 1) Tabela municipalities ----------------------------------------
CREATE TABLE IF NOT EXISTS municipalities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  state           TEXT NOT NULL,
  logo_url        TEXT,
  primary_color   TEXT DEFAULT '#E5394B',
  secondary_color TEXT DEFAULT '#A6B0DD',
  contact_email   TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  config          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_municipalities_slug      ON municipalities(slug);
CREATE INDEX IF NOT EXISTS idx_municipalities_is_active ON municipalities(is_active);

-- Slug validation: kebab-case, ASCII lower, dígitos e hífens
ALTER TABLE municipalities DROP CONSTRAINT IF EXISTS municipalities_slug_format;
ALTER TABLE municipalities
  ADD CONSTRAINT municipalities_slug_format
  CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

-- ---------- 2) Município default (preserva dados atuais) --------------------
INSERT INTO municipalities (slug, name, state, contact_email)
VALUES ('atalaia-al', 'Atalaia', 'AL', NULL)
ON CONFLICT (slug) DO NOTHING;

-- ---------- 3) Adicionar municipality_id (nullable) -------------------------
ALTER TABLE users                  ADD COLUMN IF NOT EXISTS municipality_id UUID REFERENCES municipalities(id);
ALTER TABLE schools                ADD COLUMN IF NOT EXISTS municipality_id UUID REFERENCES municipalities(id);
ALTER TABLE plans                  ADD COLUMN IF NOT EXISTS municipality_id UUID REFERENCES municipalities(id);
ALTER TABLE successful_experiences ADD COLUMN IF NOT EXISTS municipality_id UUID REFERENCES municipalities(id);
ALTER TABLE points_transactions    ADD COLUMN IF NOT EXISTS municipality_id UUID REFERENCES municipalities(id);
ALTER TABLE likes                  ADD COLUMN IF NOT EXISTS municipality_id UUID REFERENCES municipalities(id);
ALTER TABLE comments               ADD COLUMN IF NOT EXISTS municipality_id UUID REFERENCES municipalities(id);

-- skills permanece global (municipality_id NULL = global, BNCC nacional).
-- Adicionamos a coluna mas sem NOT NULL — permite skills customizadas por município no futuro.
ALTER TABLE skills                 ADD COLUMN IF NOT EXISTS municipality_id UUID REFERENCES municipalities(id);

-- notifications (caso a tabela exista)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    EXECUTE 'ALTER TABLE notifications ADD COLUMN IF NOT EXISTS municipality_id UUID REFERENCES municipalities(id)';
  END IF;
END$$;

-- ---------- 4) Backfill: tudo que já existe vai para Atalaia/AL --------------
DO $$
DECLARE
  default_id UUID;
BEGIN
  SELECT id INTO default_id FROM municipalities WHERE slug = 'atalaia-al' LIMIT 1;

  UPDATE users                  SET municipality_id = default_id WHERE municipality_id IS NULL;
  UPDATE schools                SET municipality_id = default_id WHERE municipality_id IS NULL;
  UPDATE plans                  SET municipality_id = default_id WHERE municipality_id IS NULL;
  UPDATE successful_experiences SET municipality_id = default_id WHERE municipality_id IS NULL;
  UPDATE points_transactions    SET municipality_id = default_id WHERE municipality_id IS NULL;
  UPDATE likes                  SET municipality_id = default_id WHERE municipality_id IS NULL;
  UPDATE comments               SET municipality_id = default_id WHERE municipality_id IS NULL;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    EXECUTE 'UPDATE notifications SET municipality_id = $1 WHERE municipality_id IS NULL' USING default_id;
  END IF;
END$$;

-- ---------- 5) Tornar municipality_id NOT NULL nas tabelas tenant-scoped ----
ALTER TABLE users                  ALTER COLUMN municipality_id SET NOT NULL;
ALTER TABLE schools                ALTER COLUMN municipality_id SET NOT NULL;
ALTER TABLE plans                  ALTER COLUMN municipality_id SET NOT NULL;
ALTER TABLE successful_experiences ALTER COLUMN municipality_id SET NOT NULL;
ALTER TABLE points_transactions    ALTER COLUMN municipality_id SET NOT NULL;
ALTER TABLE likes                  ALTER COLUMN municipality_id SET NOT NULL;
ALTER TABLE comments               ALTER COLUMN municipality_id SET NOT NULL;

-- Índices
CREATE INDEX IF NOT EXISTS idx_users_municipality       ON users(municipality_id);
CREATE INDEX IF NOT EXISTS idx_schools_municipality     ON schools(municipality_id);
CREATE INDEX IF NOT EXISTS idx_plans_municipality       ON plans(municipality_id);
CREATE INDEX IF NOT EXISTS idx_experiences_municipality ON successful_experiences(municipality_id);
CREATE INDEX IF NOT EXISTS idx_points_municipality      ON points_transactions(municipality_id);
CREATE INDEX IF NOT EXISTS idx_likes_municipality       ON likes(municipality_id);
CREATE INDEX IF NOT EXISTS idx_comments_municipality    ON comments(municipality_id);
CREATE INDEX IF NOT EXISTS idx_skills_municipality      ON skills(municipality_id);

-- ---------- 6) Tabela N:N user_municipalities (auth global) -----------------
-- Um usuário pode pertencer a vários municípios, com papel distinto em cada.
CREATE TABLE IF NOT EXISTS user_municipalities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  municipality_id UUID NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'teacher'
                  CHECK (role IN ('teacher','coordinator','municipality_admin')),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, municipality_id)
);

CREATE INDEX IF NOT EXISTS idx_user_municipalities_user  ON user_municipalities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_municipalities_muni  ON user_municipalities(municipality_id);

-- Backfill: cada usuário existente entra como teacher (ou role atual) em Atalaia/AL
INSERT INTO user_municipalities (user_id, municipality_id, role)
SELECT u.id, u.municipality_id, COALESCE(u.role, 'teacher')
FROM users u
ON CONFLICT (user_id, municipality_id) DO NOTHING;

-- ---------- 7) Função helper p/ obter municipality_id atual do request ------
-- O backend Next.js injeta o municipality_id via JWT claim "municipality_id"
-- OU via header x-municipality-id (validado pelo middleware).
-- Em ausência do claim, RLS bloqueia.
CREATE OR REPLACE FUNCTION current_municipality_id()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.municipality_id', true), '')::uuid
$$;

-- ---------- 8) Helper: super_admin? -----------------------------------------
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.is_super_admin', true)::boolean,
    false
  )
$$;

-- ---------- 9) Políticas RLS por município ----------------------------------
-- Drop políticas legadas e recria com filtro por município (mantendo a regra "own")
DROP POLICY IF EXISTS "Users can view own profile"     ON users;
DROP POLICY IF EXISTS "Users can update own profile"   ON users;
DROP POLICY IF EXISTS "Users can view own plans"       ON plans;
DROP POLICY IF EXISTS "Users can view published plans" ON plans;
DROP POLICY IF EXISTS "Users can create plans"         ON plans;
DROP POLICY IF EXISTS "Users can update own plans"     ON plans;
DROP POLICY IF EXISTS "Users can delete own plans"     ON plans;
DROP POLICY IF EXISTS "Users can view experiences"     ON successful_experiences;
DROP POLICY IF EXISTS "Users can create experiences"   ON successful_experiences;
DROP POLICY IF EXISTS "Users can update own experiences" ON successful_experiences;
DROP POLICY IF EXISTS "Users can delete own experiences" ON successful_experiences;
DROP POLICY IF EXISTS "Users can view likes"           ON likes;
DROP POLICY IF EXISTS "Users can create likes"         ON likes;
DROP POLICY IF EXISTS "Users can delete own likes"     ON likes;
DROP POLICY IF EXISTS "Users can view comments"        ON comments;
DROP POLICY IF EXISTS "Users can create comments"      ON comments;
DROP POLICY IF EXISTS "Users can update own comments"  ON comments;
DROP POLICY IF EXISTS "Users can delete own comments"  ON comments;
DROP POLICY IF EXISTS "Users can view own points"      ON points_transactions;

-- USERS
CREATE POLICY "tenant_users_select" ON users
  FOR SELECT USING (
    is_super_admin() OR municipality_id = current_municipality_id()
  );
CREATE POLICY "tenant_users_update" ON users
  FOR UPDATE USING (
    auth.uid()::uuid = id AND municipality_id = current_municipality_id()
  );

-- PLANS
CREATE POLICY "tenant_plans_select" ON plans
  FOR SELECT USING (
    is_super_admin() OR municipality_id = current_municipality_id()
  );
CREATE POLICY "tenant_plans_insert" ON plans
  FOR INSERT WITH CHECK (
    auth.uid()::uuid = user_id AND municipality_id = current_municipality_id()
  );
CREATE POLICY "tenant_plans_update" ON plans
  FOR UPDATE USING (
    auth.uid()::uuid = user_id AND municipality_id = current_municipality_id()
  );
CREATE POLICY "tenant_plans_delete" ON plans
  FOR DELETE USING (
    auth.uid()::uuid = user_id AND municipality_id = current_municipality_id()
  );

-- EXPERIENCES
CREATE POLICY "tenant_exp_select" ON successful_experiences
  FOR SELECT USING (
    is_super_admin() OR municipality_id = current_municipality_id()
  );
CREATE POLICY "tenant_exp_insert" ON successful_experiences
  FOR INSERT WITH CHECK (
    auth.uid()::uuid = user_id AND municipality_id = current_municipality_id()
  );
CREATE POLICY "tenant_exp_update" ON successful_experiences
  FOR UPDATE USING (
    auth.uid()::uuid = user_id AND municipality_id = current_municipality_id()
  );
CREATE POLICY "tenant_exp_delete" ON successful_experiences
  FOR DELETE USING (
    auth.uid()::uuid = user_id AND municipality_id = current_municipality_id()
  );

-- POINTS
CREATE POLICY "tenant_points_select" ON points_transactions
  FOR SELECT USING (
    is_super_admin() OR municipality_id = current_municipality_id()
  );

-- LIKES
CREATE POLICY "tenant_likes_select" ON likes
  FOR SELECT USING (
    is_super_admin() OR municipality_id = current_municipality_id()
  );
CREATE POLICY "tenant_likes_insert" ON likes
  FOR INSERT WITH CHECK (
    auth.uid()::uuid = user_id AND municipality_id = current_municipality_id()
  );
CREATE POLICY "tenant_likes_delete" ON likes
  FOR DELETE USING (
    auth.uid()::uuid = user_id AND municipality_id = current_municipality_id()
  );

-- COMMENTS
CREATE POLICY "tenant_comments_select" ON comments
  FOR SELECT USING (
    is_super_admin() OR municipality_id = current_municipality_id()
  );
CREATE POLICY "tenant_comments_insert" ON comments
  FOR INSERT WITH CHECK (
    auth.uid()::uuid = user_id AND municipality_id = current_municipality_id()
  );
CREATE POLICY "tenant_comments_update" ON comments
  FOR UPDATE USING (
    auth.uid()::uuid = user_id AND municipality_id = current_municipality_id()
  );
CREATE POLICY "tenant_comments_delete" ON comments
  FOR DELETE USING (
    auth.uid()::uuid = user_id AND municipality_id = current_municipality_id()
  );

-- SKILLS continua público para leitura (BNCC nacional)
DROP POLICY IF EXISTS "Skills are readable" ON skills;
CREATE POLICY "skills_select_global_or_tenant" ON skills
  FOR SELECT USING (
    municipality_id IS NULL OR municipality_id = current_municipality_id()
  );

-- MUNICIPALITIES — apenas super_admin manipula; leitura é pública (slug → branding)
ALTER TABLE municipalities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "municipalities_select" ON municipalities;
DROP POLICY IF EXISTS "municipalities_admin_write" ON municipalities;

CREATE POLICY "municipalities_select" ON municipalities
  FOR SELECT USING (is_active = true OR is_super_admin());

CREATE POLICY "municipalities_admin_write" ON municipalities
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- USER_MUNICIPALITIES — usuário vê seus vínculos; super_admin vê todos
ALTER TABLE user_municipalities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "um_select" ON user_municipalities;
DROP POLICY IF EXISTS "um_admin_write" ON user_municipalities;
CREATE POLICY "um_select" ON user_municipalities
  FOR SELECT USING (
    is_super_admin() OR user_id = auth.uid()::uuid
  );
CREATE POLICY "um_admin_write" ON user_municipalities
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- ---------- 10) View de ranking por município --------------------------------
DROP VIEW IF EXISTS ranking_view;
CREATE OR REPLACE VIEW ranking_view AS
SELECT
  u.id,
  u.full_name,
  u.avatar_url,
  u.school_id,
  s.name as school_name,
  u.municipality_id,
  COALESCE(SUM(pt.points_amount), 0) as total_points,
  COUNT(DISTINCT p.id) as planos_criados,
  COUNT(DISTINCT se.id) as experiencias_compartilhadas,
  ROW_NUMBER() OVER (PARTITION BY u.municipality_id ORDER BY COALESCE(SUM(pt.points_amount), 0) DESC) as ranking_position
FROM users u
LEFT JOIN schools s ON u.school_id = s.id
LEFT JOIN points_transactions pt ON u.id = pt.user_id
LEFT JOIN plans p ON u.id = p.user_id AND p.is_published = true
LEFT JOIN successful_experiences se ON u.id = se.user_id
GROUP BY u.id, u.full_name, u.avatar_url, u.school_id, s.name, u.municipality_id;

-- ---------- 11) Como criar o super_admin inicial ----------------------------
-- Marque um usuário existente como super_admin via user_metadata do Supabase Auth.
-- No painel do Supabase: Authentication → Users → seu usuário → Raw user meta data:
--   { "role": "super_admin" }
-- Depois, faça com que seu backend inclua "is_super_admin: true" no JWT claim
-- (ver lib/supabase-server.ts — função setSessionMunicipalityClaims).

-- FIM DA MIGRATION
