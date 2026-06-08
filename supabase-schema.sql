-- ============================================
-- 0. ESCOLAS (sem dependências — deve vir antes de users)
-- ============================================
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 1. TABELA DE USUÁRIOS (PROFESSORES)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  school_id UUID REFERENCES schools(id),
  role TEXT NOT NULL DEFAULT 'teacher' CHECK (role IN ('teacher', 'aee_teacher', 'coordinator', 'family', 'admin', 'super_admin')),
  subject TEXT,
  bio TEXT,
  municipality_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. TABELA DE COMPETÊNCIAS E HABILIDADES BNCC
-- ============================================
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- EF01CP01, EF02CO05, etc
  name TEXT NOT NULL,
  description TEXT,
  grade_level TEXT NOT NULL, -- 1, 2, 3, 4, 5, etc
  competency TEXT, -- Pensamento Computacional, Mundo Digital, Cultura Digital
  subject TEXT, -- Português, Matemática, Ciências, etc
  axis TEXT, -- TECNOLOGIA, etc
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. TABELA DE PLANOS DE AULA
-- ============================================
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  grade_level TEXT NOT NULL, -- 1, 2, 3, etc
  subject TEXT NOT NULL, -- Português, Matemática, etc
  content TEXT, -- Conteúdo do plano em JSON ou texto
  duration INTEGER, -- em minutos
  materials TEXT, -- materiais necessários
  objectives TEXT, -- objetivos da aula
  pdf_url TEXT, -- URL do PDF gerado
  is_published BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0,
  coordinator_viewed_at TIMESTAMP WITH TIME ZONE,
  coordinator_id UUID REFERENCES users(id),
  coordinator_note TEXT,
  plan_status TEXT NOT NULL DEFAULT 'rascunho' CHECK (plan_status IN ('rascunho', 'vigente', 'arquivado', 'substituido')),
  revisao_regente BOOLEAN DEFAULT false,
  colaboracao_aee JSONB DEFAULT '{}'::jsonb,
  consulta_familia JSONB DEFAULT '{}'::jsonb,
  is_pei BOOLEAN DEFAULT false,
  student_id UUID,
  pei_snapshot JSONB DEFAULT '{}'::jsonb,
  municipality_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. RELAÇÃO ENTRE PLANOS E HABILIDADES
-- ============================================
CREATE TABLE IF NOT EXISTS plan_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(plan_id, skill_id)
);

-- ============================================
-- 5. ALUNOS E FICHA AEE/PEI
-- ============================================
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id UUID,
  school_id UUID REFERENCES schools(id),
  school_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  birth_date DATE,
  grade_level TEXT NOT NULL,
  class_name TEXT,
  shift TEXT NOT NULL DEFAULT 'manha' CHECK (shift IN ('manha', 'tarde', 'noite', 'integral')),
  enrollment_number TEXT,
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_aee_profiles (
  student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  public_target TEXT NOT NULL DEFAULT 'outro',
  diagnosis_report TEXT,
  cid_or_notes TEXT,
  educational_needs TEXT,
  learning_barriers TEXT[] DEFAULT '{}',
  communication_profile TEXT,
  autonomy_profile TEXT,
  social_interaction TEXT,
  sensory_aspects TEXT,
  motor_aspects TEXT,
  cognitive_aspects TEXT,
  reading_writing_level TEXT,
  math_level TEXT,
  interests TEXT[] DEFAULT '{}',
  strengths TEXT[] DEFAULT '{}',
  difficulties TEXT[] DEFAULT '{}',
  accessibility_resources TEXT[] DEFAULT '{}',
  assistive_technology TEXT[] DEFAULT '{}',
  curricular_adaptations TEXT[] DEFAULT '{}',
  evaluation_adaptations TEXT[] DEFAULT '{}',
  family_notes TEXT,
  external_supports TEXT,
  medication_notes TEXT,
  emergency_notes TEXT,
  privacy_level TEXT NOT NULL DEFAULT 'restrito',
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS family_student_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  relationship TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(family_user_id, student_id)
);

-- ============================================
-- 6. TABELA DE EXPERIÊNCIAS EXITOSAS
-- ============================================
CREATE TABLE IF NOT EXISTS successful_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content TEXT,
  category TEXT,
  images JSONB,
  outcomes TEXT,
  grade_level TEXT,
  likes_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  municipality_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 7. RELAÇÃO ENTRE EXPERIÊNCIAS E HABILIDADES
-- ============================================
CREATE TABLE IF NOT EXISTS experience_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id UUID NOT NULL REFERENCES successful_experiences(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(experience_id, skill_id)
);

-- ============================================
-- 8. TABELA DE SISTEMA DE PONTOS
-- ============================================
CREATE TABLE IF NOT EXISTS points_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points_amount INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  related_item_id UUID,
  municipality_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 9. TABELA DE LIKES/REAÇÕES
-- ============================================
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  experience_id UUID NOT NULL REFERENCES successful_experiences(id) ON DELETE CASCADE,
  municipality_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, experience_id)
);

-- ============================================
-- 10. TABELA DE COMENTÁRIOS
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  experience_id UUID NOT NULL REFERENCES successful_experiences(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  municipality_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- MIGRAÇÕES IDEMPOTENTES
-- Garante colunas em bancos já existentes ANTES
-- de qualquer VIEW ou INDEX que as referencie.
-- ============================================

-- users
ALTER TABLE users ADD COLUMN IF NOT EXISTS role         TEXT NOT NULL DEFAULT 'teacher';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('teacher', 'aee_teacher', 'coordinator', 'family', 'admin', 'municipality_admin', 'super_admin'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS subject      TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name    TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url   TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id    UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS municipality_id UUID;

-- schools
ALTER TABLE schools ADD COLUMN IF NOT EXISTS name TEXT;

-- plans
ALTER TABLE plans ADD COLUMN IF NOT EXISTS subject               TEXT;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS grade_level           TEXT;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_published          BOOLEAN DEFAULT false;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS plan_status           TEXT NOT NULL DEFAULT 'rascunho';
ALTER TABLE plans ADD COLUMN IF NOT EXISTS coordinator_viewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS coordinator_id        UUID REFERENCES users(id);
ALTER TABLE plans ADD COLUMN IF NOT EXISTS coordinator_note      TEXT;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS revisao_regente       BOOLEAN DEFAULT false;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS colaboracao_aee       JSONB DEFAULT '{}'::jsonb;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS consulta_familia      JSONB DEFAULT '{}'::jsonb;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_pei                BOOLEAN DEFAULT false;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS student_id            UUID;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS pei_snapshot          JSONB DEFAULT '{}'::jsonb;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS municipality_id       UUID;

-- skills
ALTER TABLE skills ADD COLUMN IF NOT EXISTS subject     TEXT;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS competency  TEXT;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS grade_level TEXT;

-- students
ALTER TABLE students ADD COLUMN IF NOT EXISTS grade_level     TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS municipality_id UUID;
ALTER TABLE students ADD COLUMN IF NOT EXISTS school_name     TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS full_name       TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS active          BOOLEAN DEFAULT true;

-- successful_experiences
ALTER TABLE successful_experiences ADD COLUMN IF NOT EXISTS grade_level    TEXT;
ALTER TABLE successful_experiences ADD COLUMN IF NOT EXISTS municipality_id UUID;
ALTER TABLE successful_experiences ADD COLUMN IF NOT EXISTS category        TEXT;
ALTER TABLE successful_experiences ADD COLUMN IF NOT EXISTS is_featured     BOOLEAN DEFAULT false;

-- points_transactions
ALTER TABLE points_transactions ADD COLUMN IF NOT EXISTS points_amount   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE points_transactions ADD COLUMN IF NOT EXISTS municipality_id UUID;

-- likes / comments
ALTER TABLE likes    ADD COLUMN IF NOT EXISTS municipality_id UUID;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS municipality_id UUID;

-- ============================================
-- 11. VIEW PARA RANKING
-- (vem DEPOIS dos ADD COLUMNs — nunca antes)
-- ============================================
DROP VIEW IF EXISTS ranking_view;
CREATE VIEW ranking_view AS
SELECT
  u.id,
  u.full_name,
  u.avatar_url,
  u.school_id,
  s.name AS school_name,
  u.municipality_id,
  COALESCE(SUM(pt.points_amount), 0) AS total_points,
  COUNT(DISTINCT p.id) AS planos_criados,
  COUNT(DISTINCT se.id) AS experiencias_compartilhadas,
  ROW_NUMBER() OVER (PARTITION BY u.municipality_id ORDER BY COALESCE(SUM(pt.points_amount), 0) DESC) AS ranking_position
FROM users u
LEFT JOIN schools s ON u.school_id = s.id
LEFT JOIN points_transactions pt ON u.id = pt.user_id
LEFT JOIN plans p ON u.id = p.user_id AND p.is_published = true
LEFT JOIN successful_experiences se ON u.id = se.user_id
GROUP BY u.id, u.full_name, u.avatar_url, u.school_id, s.name, u.municipality_id;

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- (vêm DEPOIS dos ADD COLUMNs)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_plans_user_id              ON plans(user_id);
CREATE INDEX IF NOT EXISTS idx_plans_grade_level          ON plans(grade_level);
CREATE INDEX IF NOT EXISTS idx_plans_subject              ON plans(subject);
CREATE INDEX IF NOT EXISTS idx_plans_is_published         ON plans(is_published);
CREATE INDEX IF NOT EXISTS idx_plans_coordinator_viewed_at ON plans(coordinator_viewed_at);
CREATE INDEX IF NOT EXISTS idx_plans_municipality         ON plans(municipality_id);

CREATE INDEX IF NOT EXISTS idx_students_school_name       ON students(school_name);
CREATE INDEX IF NOT EXISTS idx_students_municipality_id   ON students(municipality_id);
CREATE INDEX IF NOT EXISTS idx_family_student_links_user  ON family_student_links(family_user_id);

CREATE INDEX IF NOT EXISTS idx_experiences_user_id        ON successful_experiences(user_id);
CREATE INDEX IF NOT EXISTS idx_experiences_category       ON successful_experiences(category);
CREATE INDEX IF NOT EXISTS idx_experiences_grade_level    ON successful_experiences(grade_level);
CREATE INDEX IF NOT EXISTS idx_experiences_is_featured    ON successful_experiences(is_featured);
CREATE INDEX IF NOT EXISTS idx_experiences_municipality   ON successful_experiences(municipality_id);

CREATE INDEX IF NOT EXISTS idx_points_user_id             ON points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_points_reason              ON points_transactions(reason);
CREATE INDEX IF NOT EXISTS idx_points_municipality        ON points_transactions(municipality_id);

CREATE INDEX IF NOT EXISTS idx_skills_grade_level         ON skills(grade_level);
CREATE INDEX IF NOT EXISTS idx_skills_competency          ON skills(competency);
CREATE INDEX IF NOT EXISTS idx_skills_subject             ON skills(subject);

CREATE INDEX IF NOT EXISTS idx_users_municipality         ON users(municipality_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id              ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_experience_id        ON likes(experience_id);
CREATE INDEX IF NOT EXISTS idx_comments_municipality      ON comments(municipality_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE successful_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE students               ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_aee_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_student_links   ENABLE ROW LEVEL SECURITY;

-- Políticas para users
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::uuid = id);
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::uuid = id);

-- Políticas para plans
DROP POLICY IF EXISTS "Users can view own plans" ON plans;
DROP POLICY IF EXISTS "Users can view published plans" ON plans;
DROP POLICY IF EXISTS "Users can create plans" ON plans;
DROP POLICY IF EXISTS "Users can update own plans" ON plans;
DROP POLICY IF EXISTS "Users can delete own plans" ON plans;
CREATE POLICY "Users can view own plans" ON plans
  FOR SELECT USING (auth.uid()::uuid = user_id);
CREATE POLICY "Users can view published plans" ON plans
  FOR SELECT USING (is_published = true);
CREATE POLICY "Users can create plans" ON plans
  FOR INSERT WITH CHECK (auth.uid()::uuid = user_id);
CREATE POLICY "Users can update own plans" ON plans
  FOR UPDATE USING (auth.uid()::uuid = user_id);
CREATE POLICY "Users can delete own plans" ON plans
  FOR DELETE USING (auth.uid()::uuid = user_id);

-- Políticas para experiências exitosas
DROP POLICY IF EXISTS "Users can view experiences" ON successful_experiences;
DROP POLICY IF EXISTS "Users can create experiences" ON successful_experiences;
DROP POLICY IF EXISTS "Users can update own experiences" ON successful_experiences;
DROP POLICY IF EXISTS "Users can delete own experiences" ON successful_experiences;
CREATE POLICY "Users can view experiences" ON successful_experiences
  FOR SELECT USING (true);
CREATE POLICY "Users can create experiences" ON successful_experiences
  FOR INSERT WITH CHECK (auth.uid()::uuid = user_id);
CREATE POLICY "Users can update own experiences" ON successful_experiences
  FOR UPDATE USING (auth.uid()::uuid = user_id);
CREATE POLICY "Users can delete own experiences" ON successful_experiences
  FOR DELETE USING (auth.uid()::uuid = user_id);

-- Políticas para skills
DROP POLICY IF EXISTS "Skills are readable" ON skills;
CREATE POLICY "Skills are readable" ON skills
  FOR SELECT USING (true);

-- Políticas para points_transactions
DROP POLICY IF EXISTS "Users can view own points" ON points_transactions;
CREATE POLICY "Users can view own points" ON points_transactions
  FOR SELECT USING (auth.uid()::uuid = user_id);

-- Políticas para likes
DROP POLICY IF EXISTS "Users can view likes" ON likes;
DROP POLICY IF EXISTS "Users can create likes" ON likes;
DROP POLICY IF EXISTS "Users can delete own likes" ON likes;
CREATE POLICY "Users can view likes" ON likes
  FOR SELECT USING (true);
CREATE POLICY "Users can create likes" ON likes
  FOR INSERT WITH CHECK (auth.uid()::uuid = user_id);
CREATE POLICY "Users can delete own likes" ON likes
  FOR DELETE USING (auth.uid()::uuid = user_id);

-- Políticas para comments
DROP POLICY IF EXISTS "Users can view comments" ON comments;
DROP POLICY IF EXISTS "Users can create comments" ON comments;
DROP POLICY IF EXISTS "Users can update own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
CREATE POLICY "Users can view comments" ON comments
  FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON comments
  FOR INSERT WITH CHECK (auth.uid()::uuid = user_id);
CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE USING (auth.uid()::uuid = user_id);
CREATE POLICY "Users can delete own comments" ON comments
  FOR DELETE USING (auth.uid()::uuid = user_id);

-- Políticas para students / AEE / family
DROP POLICY IF EXISTS "Pedagogical users can view students" ON students;
DROP POLICY IF EXISTS "AEE and coordination can manage students" ON students;
DROP POLICY IF EXISTS "Pedagogical users can view AEE profiles" ON student_aee_profiles;
DROP POLICY IF EXISTS "AEE and coordination can manage AEE profiles" ON student_aee_profiles;
DROP POLICY IF EXISTS "Family can view own student links" ON family_student_links;

CREATE POLICY "Pedagogical users can view students" ON students
  FOR SELECT USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'aee_teacher', 'coordinator', 'admin', 'municipality_admin', 'super_admin')
  );
CREATE POLICY "AEE and coordination can manage students" ON students
  FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('aee_teacher', 'coordinator', 'admin', 'municipality_admin', 'super_admin')
  ) WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('aee_teacher', 'coordinator', 'admin', 'municipality_admin', 'super_admin')
  );
CREATE POLICY "Pedagogical users can view AEE profiles" ON student_aee_profiles
  FOR SELECT USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'aee_teacher', 'coordinator', 'admin', 'municipality_admin', 'super_admin')
  );
CREATE POLICY "AEE and coordination can manage AEE profiles" ON student_aee_profiles
  FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('aee_teacher', 'coordinator', 'admin', 'municipality_admin', 'super_admin')
  ) WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('aee_teacher', 'coordinator', 'admin', 'municipality_admin', 'super_admin')
  );
CREATE POLICY "Family can view own student links" ON family_student_links
  FOR SELECT USING (family_user_id = auth.uid()::uuid);
