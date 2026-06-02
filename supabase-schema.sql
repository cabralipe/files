-- ============================================
-- 1. TABELA DE USUÁRIOS (PROFESSORES)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  school_id UUID REFERENCES schools(id),
  role TEXT NOT NULL DEFAULT 'teacher' CHECK (role IN ('teacher', 'coordinator')),
  subject TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. TABELA DE ESCOLAS
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
-- 3. TABELA DE COMPETÊNCIAS E HABILIDADES BNCC
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
-- 4. TABELA DE PLANOS DE AULA
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 5. RELAÇÃO ENTRE PLANOS E HABILIDADES
-- ============================================
CREATE TABLE IF NOT EXISTS plan_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(plan_id, skill_id)
);

-- ============================================
-- 6. TABELA DE EXPERIÊNCIAS EXITOSAS
-- ============================================
CREATE TABLE IF NOT EXISTS successful_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content TEXT, -- Descrição detalhada do projeto/case
  category TEXT, -- Projeto, Experimento, Case de Sucesso
  images JSONB, -- URLs das imagens
  outcomes TEXT, -- Resultados e impactos
  grade_level TEXT,
  likes_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
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
  points_amount INTEGER NOT NULL,
  reason TEXT NOT NULL, -- 'plano_criado', 'ia_suggestion', 'experiencia_publicada', etc
  related_item_id UUID, -- ID do plano, experiência, etc
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 9. VIEW PARA RANKING (cache de performance)
-- ============================================
CREATE OR REPLACE VIEW ranking_view AS
SELECT
  u.id,
  u.full_name,
  u.avatar_url,
  u.school_id,
  s.name as school_name,
  COALESCE(SUM(pt.points_amount), 0) as total_points,
  COUNT(DISTINCT p.id) as planos_criados,
  COUNT(DISTINCT se.id) as experiencias_compartilhadas,
  ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(pt.points_amount), 0) DESC) as ranking_position
FROM users u
LEFT JOIN schools s ON u.school_id = s.id
LEFT JOIN points_transactions pt ON u.id = pt.user_id
LEFT JOIN plans p ON u.id = p.user_id AND p.is_published = true
LEFT JOIN successful_experiences se ON u.id = se.user_id
GROUP BY u.id, u.full_name, u.avatar_url, u.school_id, s.name
ORDER BY total_points DESC;

-- ============================================
-- 10. TABELA DE LIKES/REAÇÕES
-- ============================================
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  experience_id UUID NOT NULL REFERENCES successful_experiences(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, experience_id)
);

-- ============================================
-- 11. TABELA DE COMENTÁRIOS
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  experience_id UUID NOT NULL REFERENCES successful_experiences(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX idx_plans_user_id ON plans(user_id);
CREATE INDEX idx_plans_grade_level ON plans(grade_level);
CREATE INDEX idx_plans_subject ON plans(subject);
CREATE INDEX idx_plans_is_published ON plans(is_published);
CREATE INDEX idx_plans_coordinator_viewed_at ON plans(coordinator_viewed_at);

CREATE INDEX idx_experiences_user_id ON successful_experiences(user_id);
CREATE INDEX idx_experiences_category ON successful_experiences(category);
CREATE INDEX idx_experiences_grade_level ON successful_experiences(grade_level);
CREATE INDEX idx_experiences_is_featured ON successful_experiences(is_featured);

CREATE INDEX idx_points_user_id ON points_transactions(user_id);
CREATE INDEX idx_points_reason ON points_transactions(reason);

CREATE INDEX idx_skills_grade_level ON skills(grade_level);
CREATE INDEX idx_skills_competency ON skills(competency);
CREATE INDEX idx_skills_subject ON skills(subject);

CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_likes_experience_id ON likes(experience_id);

-- MigraÃ§Ãµes idempotentes para bancos jÃ¡ criados
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'teacher';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS coordinator_viewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS coordinator_id UUID REFERENCES users(id);
ALTER TABLE plans ADD COLUMN IF NOT EXISTS coordinator_note TEXT;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS plan_status TEXT NOT NULL DEFAULT 'rascunho';
ALTER TABLE plans ADD COLUMN IF NOT EXISTS revisao_regente BOOLEAN DEFAULT false;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS colaboracao_aee JSONB DEFAULT '{}'::jsonb;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS consulta_familia JSONB DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_plans_coordinator_viewed_at ON plans(coordinator_viewed_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE successful_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Políticas para users
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::uuid = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::uuid = id);

-- Políticas para plans
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
CREATE POLICY "Users can view experiences" ON successful_experiences
  FOR SELECT USING (true);

CREATE POLICY "Users can create experiences" ON successful_experiences
  FOR INSERT WITH CHECK (auth.uid()::uuid = user_id);

CREATE POLICY "Users can update own experiences" ON successful_experiences
  FOR UPDATE USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can delete own experiences" ON successful_experiences
  FOR DELETE USING (auth.uid()::uuid = user_id);

-- Políticas para skills (apenas leitura)
CREATE POLICY "Skills are readable" ON skills
  FOR SELECT USING (true);

-- Políticas para points_transactions
CREATE POLICY "Users can view own points" ON points_transactions
  FOR SELECT USING (auth.uid()::uuid = user_id);

-- Políticas para likes
CREATE POLICY "Users can view likes" ON likes
  FOR SELECT USING (true);

CREATE POLICY "Users can create likes" ON likes
  FOR INSERT WITH CHECK (auth.uid()::uuid = user_id);

CREATE POLICY "Users can delete own likes" ON likes
  FOR DELETE USING (auth.uid()::uuid = user_id);

-- Políticas para comments
CREATE POLICY "Users can view comments" ON comments
  FOR SELECT USING (true);

CREATE POLICY "Users can create comments" ON comments
  FOR INSERT WITH CHECK (auth.uid()::uuid = user_id);

CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can delete own comments" ON comments
  FOR DELETE USING (auth.uid()::uuid = user_id);
