# 🔧 Análise: O Que Falta Construir no Backend

## 📊 Status Geral: 30% Documentado, 70% Por Implementar

---

## 📋 Checklist de Arquivos Backend Faltando

### Tier 1: CRÍTICO (Sem isso não funciona nada)

#### 🔐 Autenticação & Auth
- [ ] `lib/auth.ts` - Funções de autenticação
  - signUp()
  - signIn()
  - signOut()
  - getCurrentUser()
  - refreshToken()

- [ ] `middleware.ts` - Middleware de autenticação
  - Verificar JWT em rotas protegidas
  - Redirecionar não-autenticados

- [ ] `lib/supabase.ts` (Completar)
  - Cliente Supabase configurado
  - Admin client para operações de servidor

#### 🗄️ Database Helpers
- [ ] `lib/db/users.ts` - Operações com usuários
  - createUser()
  - updateUser()
  - getUserById()
  - getUserByEmail()
  - deleteUser()

- [ ] `lib/db/plans.ts` - Operações com planos
  - createPlan()
  - updatePlan()
  - getPlanById()
  - getPlansByUser()
  - deletePlan()
  - getPublicPlans()

- [ ] `lib/db/skills.ts` - Operações com skills
  - getAllSkills()
  - getSkillsByCompetency()
  - getSkillsById()

#### ✅ Validação
- [ ] `lib/schemas.ts` (Completar com Zod)
  - userSchema
  - planSchema
  - experienciaSchema
  - signupSchema
  - loginSchema
  - planPublicoSchema

### Tier 2: IMPORTANTE (Funcionalidades principais)

#### 🤖 Integração NVIDIA IA
- [ ] `lib/nvidia.ts` - Wrapper da API NVIDIA
  - generatePlanoWithAI()
  - generateSuggestions()
  - Cache de respostas
  - Rate limiting
  - Error handling

#### 📄 PDF Generation
- [ ] `lib/pdf-generator.ts` - Gerador de PDF
  - generatePlanoPDF()
  - Usar biblioteca (pdfkit ou puppeteer)
  - Templates HTML
  - Styling

#### 📊 Pontos & Ranking
- [ ] `lib/points.ts` - Sistema de pontos
  - addPoints()
  - getPoints()
  - getPointsHistory()
  - calculateRanking()

- [ ] `lib/db/rankings.ts` - Operações de ranking
  - getRanking()
  - getUserRank()
  - updateRankingCache()

#### 💬 Experiências
- [ ] `lib/db/experiences.ts` - Operações com experiências
  - createExperience()
  - updateExperience()
  - getExperienceById()
  - getAllExperiences()
  - deleteExperience()

- [ ] `lib/db/likes.ts` - Sistema de likes
  - addLike()
  - removeLike()
  - getLikesCount()
  - getUserLikes()

#### 📤 Upload de Arquivos
- [ ] `lib/storage.ts` - Supabase Storage wrapper
  - uploadImage()
  - deleteImage()
  - getImageUrl()
  - generateSignedUrl()

### Tier 3: COMPLEMENTAR (Melhorias)

#### 📧 Email
- [ ] `lib/email.ts` - Serviço de email
  - sendWelcomeEmail()
  - sendPasswordReset()
  - sendNotificationEmail()
  - Usar Resend ou SendGrid

#### 📈 Analytics
- [ ] `lib/analytics.ts` - Rastreamento de eventos
  - trackEvent()
  - trackPageView()
  - Integração Mixpanel ou Segment

#### 🔒 Segurança
- [ ] `lib/security.ts` - Funções de segurança
  - validateInput()
  - sanitizeHTML()
  - rateLimit()
  - CSRF protection

#### 🗂️ Utils
- [ ] `lib/utils.ts` - Funções auxiliares
  - formatDate()
  - parseError()
  - generateId()
  - slugify()

---

## 🏗️ Estrutura de Arquivos Backend Faltando

```
app/api/
├── auth/
│   ├── register/
│   │   └── route.ts ❌ (FALTA IMPLEMENTAR)
│   ├── login/
│   │   └── route.ts ❌
│   └── logout/
│       └── route.ts ❌
│
├── planos/
│   ├── route.ts ❌ (GET, POST)
│   ├── [id]/
│   │   └── route.ts ❌ (GET, PUT, DELETE)
│   └── ia-suggestion/
│       └── route.ts ❌
│
├── experiencias/
│   ├── route.ts ❌ (GET, POST)
│   ├── [id]/
│   │   ├── route.ts ❌ (GET, PUT, DELETE)
│   │   ├── like/
│   │   │   └── route.ts ❌
│   │   └── unlike/
│   │       └── route.ts ❌
│   └── [id]/comments/
│       └── route.ts ❌
│
├── ranking/
│   └── route.ts ❌ (GET)
│
├── usuarios/
│   ├── perfil/
│   │   └── route.ts ❌ (GET, PUT)
│   └── [id]/
│       └── route.ts ❌ (GET)
│
├── public/
│   ├── gerar/
│   │   └── route.ts ❌ (POST)
│   └── download/
│       └── route.ts ❌ (POST)
│
├── skills/
│   └── route.ts ❌ (GET)
│
└── nvidia/
    └── ia-suggestions/
        └── route.ts ❌ (POST)

lib/
├── auth.ts ❌
├── supabase.ts ⚠️ (Parcial)
├── supabase-admin.ts ❌
├── hooks.ts ⚠️ (Parcial)
├── utils.ts ❌
├── constants.ts ⚠️ (Parcial)
├── schemas.ts ❌
├── nvidia.ts ❌
├── pdf-generator.ts ❌
├── email.ts ❌
├── storage.ts ❌
├── security.ts ❌
├── analytics.ts ❌
└── db/
    ├── users.ts ❌
    ├── plans.ts ❌
    ├── experiences.ts ❌
    ├── likes.ts ❌
    ├── skills.ts ❌
    ├── rankings.ts ❌
    └── comments.ts ❌

middleware.ts ❌
```

---

## 📝 Arquivos Detalhados a Criar

### 1. `lib/schemas.ts` - Validação com Zod

```typescript
import { z } from 'zod';

// Auth
export const signupSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Precisa de maiúscula')
    .regex(/[0-9]/, 'Precisa de número'),
  name: z.string().min(3, 'Mínimo 3 caracteres'),
  schoolId: z.string().uuid('ID de escola inválido'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Plano
export const planSchema = z.object({
  title: z.string().min(5, 'Título muito curto'),
  description: z.string().optional(),
  content: z.string().min(10),
  gradeLevel: z.enum(['6', '7', '8', '9']),
  duration: z.number().min(10).max(480),
  skills: z.array(z.string()).min(1, 'Selecione 1+ habilidades'),
});

export const planPublicoSchema = z.object({
  title: z.string().min(5),
  gradeLevel: z.string(),
  duration: z.number(),
  objective: z.string().optional(),
  selectedSkills: z.array(z.string()).min(1),
});

// Experiência
export const experienciaSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(20),
  category: z.string(),
  skills: z.array(z.string()),
  images: z.array(z.string()).optional(),
});
```

### 2. `lib/auth.ts` - Autenticação

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function signUp(
  email: string,
  password: string,
  name: string,
  schoolId: string
) {
  try {
    // 1. Criar user no Supabase Auth
    const { data: authData, error: authError } = 
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) throw authError;

    // 2. Criar perfil do usuário
    const { error: profileError } = 
      await supabase.from('users').insert({
        id: authData.user.id,
        email,
        name,
        school_id: schoolId,
        points: 0,
      });

    if (profileError) throw profileError;

    return { success: true, userId: authData.user.id };
  } catch (error) {
    return { success: false, error };
  }
}

export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    return { success: true, token: data.session?.access_token };
  } catch (error) {
    return { success: false, error };
  }
}

export async function getCurrentUser(userId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return { success: true, user: data };
  } catch (error) {
    return { success: false, error };
  }
}
```

### 3. `lib/db/plans.ts` - Operações com Planos

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function createPlan(
  userId: string,
  planData: {
    title: string;
    description: string;
    content: string;
    gradeLevel: string;
    duration: number;
    skills: string[];
  }
) {
  try {
    // 1. Inserir plano
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .insert({
        user_id: userId,
        title: planData.title,
        description: planData.description,
        content: planData.content,
        grade_level: planData.gradeLevel,
        duration: planData.duration,
      })
      .select()
      .single();

    if (planError) throw planError;

    // 2. Inserir plan_skills
    const skillsData = planData.skills.map(skillCode => ({
      plan_id: plan.id,
      skill_code: skillCode,
    }));

    const { error: skillsError } = await supabase
      .from('plan_skills')
      .insert(skillsData);

    if (skillsError) throw skillsError;

    // 3. Adicionar pontos ao usuário (+10)
    const { error: pointsError } = await supabase
      .from('points_transactions')
      .insert({
        user_id: userId,
        points: 10,
        reason: 'create_plan',
        related_id: plan.id,
      });

    if (pointsError) throw pointsError;

    // 4. Atualizar total de pontos do usuário
    await supabase.rpc('add_user_points', {
      p_user_id: userId,
      p_points: 10,
    });

    return { success: true, planId: plan.id };
  } catch (error) {
    return { success: false, error };
  }
}

export async function getPlansByUser(userId: string) {
  try {
    const { data, error } = await supabase
      .from('plans')
      .select(`
        *,
        plan_skills(skill_code)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, plans: data };
  } catch (error) {
    return { success: false, error };
  }
}

export async function deletePlan(planId: string, userId: string) {
  try {
    // Verificar propriedade
    const { data: plan } = await supabase
      .from('plans')
      .select('user_id')
      .eq('id', planId)
      .single();

    if (plan?.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    // Deletar
    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', planId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}
```

### 4. `lib/nvidia.ts` - IA Integration

```typescript
export async function generatePlanoWithAI(prompt: string): Promise<string> {
  try {
    const response = await fetch(
      `${process.env.NVIDIA_API_URL}/nvidia_nim/v1/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'meta/llama-2-70b-chat',
          prompt,
          max_tokens: 2000,
          temperature: 0.7,
          top_p: 0.9,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`NVIDIA API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].text.trim();

    // TODO: Cache em Supabase
    return content;
  } catch (error) {
    console.error('AI Generation error:', error);
    throw error;
  }
}

export async function generateSuggestions(
  title: string,
  skills: string[],
  gradeLevel: string
): Promise<string[]> {
  const prompt = `
    Gere 3 sugestões de atividades para:
    - Título: ${title}
    - Série: ${gradeLevel}
    - Habilidades: ${skills.join(', ')}
    
    Retorne apenas as 3 atividades, uma por linha.
  `;

  try {
    const response = await generatePlanoWithAI(prompt);
    return response.split('\n').filter(s => s.trim());
  } catch (error) {
    throw error;
  }
}
```

### 5. `lib/pdf-generator.ts` - PDF Generation

```typescript
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

export async function generatePlanoPDF(
  plano: {
    title: string;
    gradeLevel: string;
    duration: number;
    content: string;
    skills: string[];
  }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Title
      doc.fontSize(24).text(plano.title, { align: 'center' });
      doc.moveDown();

      // Meta info
      doc.fontSize(12);
      doc.text(`Série: ${plano.gradeLevel}º ano`);
      doc.text(`Duração: ${plano.duration} minutos`);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`);
      doc.moveDown();

      // Content
      doc.fontSize(11);
      doc.text(plano.content, { align: 'left' });
      doc.moveDown();

      // Skills
      doc.fontSize(10);
      doc.text('Habilidades BNCC:');
      plano.skills.forEach(skill => {
        doc.text(`• ${skill}`);
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
```

### 6. `middleware.ts` - Autenticação Global

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(
  process.env.SUPABASE_SERVICE_KEY || ''
);

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;

  // Rotas públicas
  const publicRoutes = ['/auth/login', '/auth/signup', '/gerar-plano', '/'];
  if (publicRoutes.includes(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  // Rotas protegidas
  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  try {
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch (error) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
}

export const config = {
  matcher: ['/((?!_next|public).*)'],
};
```

---

## 📊 Endpoints que Faltam Implementar

### Auth (3 endpoints)
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
```

### Planos (5 endpoints)
```
GET    /api/planos
POST   /api/planos
GET    /api/planos/:id
PUT    /api/planos/:id
DELETE /api/planos/:id
```

### IA (2 endpoints)
```
POST   /api/planos/ia-suggestion
POST   /api/public/gerar
```

### Experiências (7 endpoints)
```
GET    /api/experiencias
POST   /api/experiencias
GET    /api/experiencias/:id
PUT    /api/experiencias/:id
DELETE /api/experiencias/:id
POST   /api/experiencias/:id/like
POST   /api/experiencias/:id/unlike
```

### Ranking (1 endpoint)
```
GET    /api/ranking
```

### Usuários (2 endpoints)
```
GET    /api/usuarios/perfil
PUT    /api/usuarios/perfil
```

### Skills (1 endpoint)
```
GET    /api/skills
```

### Público (2 endpoints)
```
POST   /api/public/gerar
POST   /api/public/download
```

**Total: 23 Endpoints**

---

## 🔄 Dependências de Implementação

```
1. Schemas (Zod) ✅ 
   ↓
2. Auth (signUp, signIn) ✅
   ↓
3. Database Helpers (users, plans) ✅
   ↓
4. API Routes (GET, POST, PUT, DELETE) ✅
   ↓
5. IA Integration (NVIDIA) ✅
   ↓
6. Pontos & Ranking ✅
   ↓
7. PDF Generator ✅
   ↓
8. Storage (Imagens) ✅
```

---

## ⏱️ Tempo Estimado de Implementação

| Módulo | Tempo | Prioridade |
|--------|-------|-----------|
| Schemas (Zod) | 2h | 🔴 Crítico |
| Auth | 4h | 🔴 Crítico |
| DB Helpers | 6h | 🔴 Crítico |
| API Routes | 8h | 🔴 Crítico |
| Middleware | 1h | 🟠 Alto |
| NVIDIA IA | 3h | 🟠 Alto |
| PDF Generator | 2h | 🟠 Alto |
| Pontos & Ranking | 3h | 🟠 Alto |
| Email | 2h | 🟡 Médio |
| Storage | 2h | 🟡 Médio |
| Security Utils | 2h | 🟡 Médio |
| Analytics | 1h | 🟢 Baixo |
| **TOTAL** | **~36h** | |

**~1 semana a tempo integral**

---

## 🚀 Ordem Recomendada de Implementação

### Dia 1: Foundation
1. [ ] Criar schemas.ts (Zod)
2. [ ] Criar lib/auth.ts
3. [ ] Criar middleware.ts

### Dia 2: Database
1. [ ] Criar lib/db/users.ts
2. [ ] Criar lib/db/plans.ts
3. [ ] Criar lib/db/experiences.ts

### Dia 3: API Routes - Auth
1. [ ] POST /api/auth/register
2. [ ] POST /api/auth/login
3. [ ] POST /api/auth/logout

### Dia 4: API Routes - Planos
1. [ ] GET/POST /api/planos
2. [ ] GET/PUT/DELETE /api/planos/:id
3. [ ] POST /api/planos/ia-suggestion

### Dia 5: IA & PDF
1. [ ] Implementar lib/nvidia.ts
2. [ ] Implementar lib/pdf-generator.ts
3. [ ] POST /api/public/gerar
4. [ ] POST /api/public/download

### Dia 6: Experiências & Ranking
1. [ ] CRUD /api/experiencias
2. [ ] Like/Unlike endpoints
3. [ ] GET /api/ranking

### Dia 7: Polish
1. [ ] Error handling
2. [ ] Logging
3. [ ] Rate limiting
4. [ ] Security review

---

## 🎯 Checklist de Implementação

### Backend Core
- [ ] Schemas Zod criados
- [ ] Autenticação funcionando
- [ ] Middleware protegendo rotas
- [ ] Database queries funcionando
- [ ] 23 endpoints implementados
- [ ] IA NVIDIA integrada
- [ ] PDF generator funcionando
- [ ] Sistema de pontos OK
- [ ] Ranking calculando corretamente

### Testes
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Testes E2E
- [ ] Load testing

### Deployment
- [ ] Variáveis de ambiente configuradas
- [ ] CI/CD pipeline
- [ ] Monitoring/Logging
- [ ] Error tracking (Sentry)

---

## 📦 Dependências NPM a Instalar

```bash
npm install zod
npm install pdfkit
npm install @supabase/supabase-js
npm install jose
npm install resend  # Para emails
npm install dotenv
```

---

**Status:** 70% do trabalho backend ainda precisa ser implementado
**Prioridade:** CRÍTICO
**Tempo:** ~36 horas para completar
**Começar por:** Schemas → Auth → Database → API Routes
