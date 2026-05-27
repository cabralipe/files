# 🔧 Setup Completo do Supabase - Passo a Passo

## ⏱️ Tempo Estimado: 30 minutos

---

## 🎯 Passo 1: Criar Projeto no Supabase

### 1.1 Acessar Supabase
1. Acesse [supabase.com](https://supabase.com)
2. Clique em **"Sign Up"** (ou faça login se já tem conta)
3. Use seu email do GitHub ou Gmail

### 1.2 Criar Novo Projeto
1. Clique em **"New Project"**
2. Preencha:
   - **Project Name:** `bncc-platform` (ou seu nome)
   - **Database Password:** Guarde bem! (Salve em .env)
   - **Region:** Escolha a mais próxima de você (ex: `South America (São Paulo)`)
3. Clique **"Create new project"**
4. Aguarde a criação (2-3 minutos)

### 1.3 Obter Credenciais
Após criado, vá para **Settings > API**:

```
Project URL: https://xxxxxxxxxxxxx.supabase.co
Anon Key: eyJ... (público)
Service Role Key: eyJ... (secreto)
Database Password: (que você definiu)
```

---

## 🎯 Passo 2: Criar Tabelas e Schema

### 2.1 Abrir SQL Editor
1. No Supabase, clique em **"SQL Editor"** (lado esquerdo)
2. Clique em **"New Query"**
3. Cole o arquivo completo SQL abaixo

### 2.2 Executar Script SQL

```sql
-- ===== TABELAS PRINCIPAIS =====

-- 1. Usuários (estendido do auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  bio TEXT,
  phone TEXT,
  avatar_url TEXT,
  school_id UUID REFERENCES schools(id),
  is_teacher BOOLEAN DEFAULT true,
  points INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Escolas
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  code TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Skills BNCC
CREATE TABLE IF NOT EXISTS skills (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  axis TEXT,
  grade_level TEXT,
  category TEXT,
  detailed_description TEXT,
  example_activities TEXT[],
  assessment_methods TEXT[],
  related_skills TEXT[],
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Planos de Aula
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  grade_level TEXT,
  duration INT, -- em minutos
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Associação Plano-Skills
CREATE TABLE IF NOT EXISTS plan_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  skill_code TEXT NOT NULL REFERENCES skills(code),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(plan_id, skill_code)
);

-- 6. Experiências Exitosas
CREATE TABLE IF NOT EXISTS successful_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  category TEXT,
  published BOOLEAN DEFAULT false,
  likes_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Associação Experiência-Skills
CREATE TABLE IF NOT EXISTS experience_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id UUID NOT NULL REFERENCES successful_experiences(id) ON DELETE CASCADE,
  skill_code TEXT NOT NULL REFERENCES skills(code),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(experience_id, skill_code)
);

-- 8. Likes em Experiências
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id UUID NOT NULL REFERENCES successful_experiences(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(experience_id, user_id)
);

-- 9. Comentários
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id UUID NOT NULL REFERENCES successful_experiences(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Transações de Pontos
CREATE TABLE IF NOT EXISTS points_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INT NOT NULL,
  reason TEXT NOT NULL,
  related_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Rankings
CREATE TABLE IF NOT EXISTS rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position INT,
  total_points INT,
  month TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Interesses em Newsletter
CREATE TABLE IF NOT EXISTS newsletter_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  plan_title TEXT,
  interested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== ÍNDICES PARA PERFORMANCE =====

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_school_id ON users(school_id);
CREATE INDEX IF NOT EXISTS idx_plans_user_id ON plans(user_id);
CREATE INDEX IF NOT EXISTS idx_plans_grade_level ON plans(grade_level);
CREATE INDEX IF NOT EXISTS idx_experiences_user_id ON successful_experiences(user_id);
CREATE INDEX IF NOT EXISTS idx_experiences_category ON successful_experiences(category);
CREATE INDEX IF NOT EXISTS idx_experiences_published ON successful_experiences(published);
CREATE INDEX IF NOT EXISTS idx_likes_experience_id ON likes(experience_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_experience_id ON comments(experience_id);
CREATE INDEX IF NOT EXISTS idx_points_user_id ON points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_points_created ON points_transactions(created_at);

-- ===== ROW LEVEL SECURITY (RLS) =====

-- Habilitar RLS em todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE successful_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;

-- Policies para Users
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Public profiles are viewable"
  ON users FOR SELECT
  USING (true);

-- Policies para Plans
CREATE POLICY "Users can view own plans"
  ON plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create plans"
  ON plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plans"
  ON plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own plans"
  ON plans FOR DELETE
  USING (auth.uid() = user_id);

-- Policies para Experiências
CREATE POLICY "Public experiences are viewable"
  ON successful_experiences FOR SELECT
  USING (published = true);

CREATE POLICY "Users can view own experiences"
  ON successful_experiences FOR SELECT
  USING (auth.uid() = user_id OR published = true);

CREATE POLICY "Users can create experiences"
  ON successful_experiences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own experiences"
  ON successful_experiences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own experiences"
  ON successful_experiences FOR DELETE
  USING (auth.uid() = user_id);

-- Policies para Likes
CREATE POLICY "Anyone can view likes"
  ON likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like experiences"
  ON likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike experiences"
  ON likes FOR DELETE
  USING (auth.uid() = user_id);

-- Policies para Comentários
CREATE POLICY "Anyone can view comments"
  ON comments FOR SELECT
  USING (true);

CREATE POLICY "Users can create comments"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policies para Pontos (somente leitura para usuários)
CREATE POLICY "Users can view own points"
  ON points_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- ===== FUNÇÕES AUXILIARES =====

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_plans_updated_at
BEFORE UPDATE ON plans
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_experiences_updated_at
BEFORE UPDATE ON successful_experiences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_skills_updated_at
BEFORE UPDATE ON skills
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ===== COMENTÁRIO FINAL =====
-- Schema criado com sucesso!
```

---

## 🎯 Passo 3: Importar Skills BNCC

### 3.1 Criar Script de Seed

Crie um novo SQL Query e cole:

```sql
-- Inserir Skills BNCC (amostra com as principais)
INSERT INTO skills (code, name, description, axis, grade_level, category, active)
VALUES
-- 6º Ano - Matemática
('EF06MA01', 'Contar coleções com até 1 bilhão de elementos', 'Contagem e representação', 'Conhecimentos', '6º Ano', 'Matemática', true),
('EF06MA02', 'Reconhecer o sistema de numeração decimal', 'Sistema de numeração', 'Conhecimentos', '6º Ano', 'Matemática', true),
('EF06MA03', 'Resolver e elaborar problemas que envolvam cálculos com números naturais', 'Operações', 'Habilidades', '6º Ano', 'Matemática', true),

-- 6º Ano - Ciências
('EF06CI01', 'Reconhecer e utilizar adequadamente notação científica para descrever distâncias entre astros', 'Astronomia', 'Conhecimentos', '6º Ano', 'Ciências', true),
('EF06CI02', 'Identificar as principais variáveis envolvidas na dinâmica do Planeta', 'Dinâmica do planeta', 'Conhecimentos', '6º Ano', 'Ciências', true),
('EF06CI03', 'Explicar a dinâmica das populações da Terra com base nos processos de natalidade, mortalidade e migrações', 'População', 'Habilidades', '6º Ano', 'Ciências', true),
('EF06CI10', 'Explicar o que causa mudanças no clima', 'Clima e mudanças climáticas', 'Habilidades', '6º Ano', 'Ciências', true),
('EF06CI11', 'Descrever as características de diferentes fontes de energia', 'Energia', 'Conhecimentos', '6º Ano', 'Ciências', true),
('EF06CI12', 'Identificar consequências do uso de combustíveis fósseis', 'Energia e sustentabilidade', 'Atitudes', '6º Ano', 'Ciências', true),

-- 6º Ano - Português
('EF06LP01', 'Reconhecer a função sociocomunicativa de textos que circulam em campo da vida social', 'Leitura', 'Conhecimentos', '6º Ano', 'Português', true),
('EF06LP02', 'Reconhecer a função sociocomunicativa de textos que circulam em campo jornalístico/midiático', 'Leitura', 'Conhecimentos', '6º Ano', 'Português', true),
('EF06LP03', 'Analisar diferenças de finalidade entre textos que circulam em diferentes campos', 'Leitura', 'Habilidades', '6º Ano', 'Português', true),

-- 6º Ano - História
('EF06HI01', 'Identificar diferentes formas de organização da sociedade e poder', 'Sociedade e organização', 'Conhecimentos', '6º Ano', 'História', true),
('EF06HI02', 'Identificar aspectos e processos específicos das sociedades medievais', 'Idade Média', 'Conhecimentos', '6º Ano', 'História', true),
('EF06HI03', 'Descrever sociedades mesoamericanas', 'Mesoamérica', 'Conhecimentos', '6º Ano', 'História', true),

-- 6º Ano - Geografia
('EF06GE01', 'Comparar modificações das paisagens nos lugares de vivência e vida escolar', 'Paisagem', 'Habilidades', '6º Ano', 'Geografia', true),
('EF06GE02', 'Analisar modificações de paisagens por diferentes tipos de sociedade', 'Modificação de paisagens', 'Habilidades', '6º Ano', 'Geografia', true),
('EF06GE03', 'Descrever os mecanismos naturais responsáveis pelo clima', 'Clima', 'Conhecimentos', '6º Ano', 'Geografia', true),

-- 6º Ano - Educação Física
('EF06EF01', 'Comparar sua aptidão física com a de seus colegas', 'Aptidão física', 'Conhecimentos', '6º Ano', 'Educação Física', true),
('EF06EF02', 'Experimentar e fruir diferentes lutas do contexto comunitário', 'Lutas', 'Habilidades', '6º Ano', 'Educação Física', true),

-- 6º Ano - Artes
('EF06AR01', 'Analisar diferentes formas de expressão artística', 'Artes', 'Conhecimentos', '6º Ano', 'Artes', true),
('EF06AR02', 'Experimentar diferentes formas de expressão artística', 'Artes', 'Habilidades', '6º Ano', 'Artes', true),

-- 6º Ano - Língua Inglesa
('EF06LI01', 'Descrever a si mesmo', 'Comunicação', 'Habilidades', '6º Ano', 'Inglês', true),
('EF06LI02', 'Identificar em textos informações específicas', 'Leitura', 'Habilidades', '6º Ano', 'Inglês', true)

ON CONFLICT (code) DO NOTHING;

-- Confirmar inserção
SELECT COUNT(*) as skills_inseridas FROM skills;
```

### 3.2 Executar Script

1. Cole o código acima
2. Clique em **"Run"** (ou Ctrl+Enter)
3. Deve retornar: `skills_inseridas: 24`

---

## 🎯 Passo 4: Configurar Storage

### 4.1 Criar Buckets

No Supabase, vá para **Storage**:

1. Clique em **"New bucket"** para cada um:
   - Nome: `avatars` → Marcar como **Public**
   - Nome: `experience-images` → Marcar como **Public**
   - Nome: `plan-attachments` → Marcar como **Private**
   - Nome: `backups` → Marcar como **Private**

### 4.2 Configurar Políticas de Acesso

Para cada bucket público, vá em **Policies**:

```sql
-- Para bucket avatars (public)
CREATE POLICY "Public Read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "User Upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## 🎯 Passo 5: Configurar Variáveis de Ambiente

### 5.1 Criar .env.local

Na raiz do seu projeto Next.js:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_DB_PASSWORD=sua-senha-aqui

# Email (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-app (gerar em myaccount.google.com/apppasswords)
SMTP_FROM=noreply@bncc-platform.com

# App
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# NVIDIA IA (opcional)
NVIDIA_API_KEY=seu-token-aqui

# JWT Secret (gerar com: openssl rand -hex 32)
JWT_SECRET=seu-token-aleatorio-aqui
```

### 5.2 Gerar JWT_SECRET (se usar)

```bash
openssl rand -hex 32
# Copiar o resultado para JWT_SECRET
```

---

## 🎯 Passo 6: Testar Conexão Localmente

### 6.1 Instalar Dependências

```bash
npm install @supabase/supabase-js
```

### 6.2 Criar Script de Teste

Crie `lib/test-supabase.ts`:

```typescript
import { supabaseAdmin } from './supabase';

export async function testConnection() {
  try {
    // Teste 1: Listar skills
    const { data: skills, error: skillsError } = await supabaseAdmin
      .from('skills')
      .select('*')
      .limit(5);

    if (skillsError) throw skillsError;
    console.log('✅ Skills encontradas:', skills?.length);

    // Teste 2: Verificar tabelas
    const tables = [
      'users',
      'plans',
      'successful_experiences',
      'skills',
      'likes',
      'comments',
      'points_transactions',
    ];

    for (const table of tables) {
      const { data, error } = await supabaseAdmin
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ Erro na tabela ${table}:`, error.message);
      } else {
        console.log(`✅ Tabela ${table} OK`);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Erro na conexão:', error);
    return { success: false, error };
  }
}

// Executar teste
testConnection();
```

### 6.3 Rodar Teste

```bash
npm run dev
# Em outro terminal:
npx ts-node lib/test-supabase.ts
```

---

## 🎯 Passo 7: Ativar Auth Email (Opcional)

### 7.1 Configurar Email

No Supabase, vá para **Authentication > Providers**:

1. Clique em **"Email"**
2. Marcar as opções:
   - ✅ Enable Email provider
   - ✅ Confirm email
3. Salvar

### 7.2 Configurar Email Customizado

Em **Authentication > Email Templates**:

1. Edite cada template com seu branding
2. Use variáveis como `{{ .ConfirmationURL }}`

---

## ✅ Checklist Final

- [ ] Projeto Supabase criado
- [ ] Credenciais copiadas para .env.local
- [ ] Schema SQL executado
- [ ] Skills BNCC importadas (24+)
- [ ] Buckets de storage criados
- [ ] Variáveis de ambiente configuradas
- [ ] Teste de conexão passou
- [ ] Auth email configurado (opcional)

---

## 🚀 Próximos Passos

Agora você tem:
1. ✅ Banco de dados pronto
2. ✅ Tabelas criadas
3. ✅ RLS configurado
4. ✅ Storage pronto
5. ✅ Skills BNCC inseridas

**Próximo:** Implementar os endpoints em `app/api/`

---

## 📞 Troubleshooting

### Erro: "Service Role Key inválida"
- Copie novamente de Settings > API
- Certifique-se de usar SERVICE_ROLE_KEY (não ANON_KEY)

### Erro: "RLS policy violation"
- Verifique se você está autenticado
- Alguns endpoints precisam do token JWT

### Erro: "Table does not exist"
- Copie novamente o script SQL completo
- Execute linha por linha se necessário

### Skills não aparecem
- Verifique se o INSERT foi executado com sucesso
- Query: `SELECT COUNT(*) FROM skills;` deve retornar > 20

---

**Status:** ✅ Setup Pronto!

Você agora tem um Supabase completamente configurado, com schema, RLS, storage e skills BNCC prontos para usar.

