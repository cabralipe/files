# 💻 Backend - Exemplos Prontos para Copiar e Colar

Copie esses arquivos diretamente para seu projeto!

---

## 1. `lib/schemas.ts` - Validações com Zod

```typescript
import { z } from 'zod';

// ============ AUTH ============
export const signupSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .toLowerCase(),
  password: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Precisa de letra maiúscula')
    .regex(/[0-9]/, 'Precisa de número')
    .regex(/[!@#$%^&*]/, 'Precisa de caractere especial'),
  name: z.string()
    .min(3, 'Mínimo 3 caracteres')
    .max(100, 'Máximo 100 caracteres'),
  schoolId: z.string().uuid('ID de escola inválido'),
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

// ============ PLANOS ============
export const planSchema = z.object({
  title: z.string()
    .min(5, 'Mínimo 5 caracteres')
    .max(200, 'Máximo 200 caracteres'),
  description: z.string()
    .max(500, 'Máximo 500 caracteres')
    .optional(),
  content: z.string()
    .min(10, 'Conteúdo muito curto')
    .max(20000, 'Conteúdo muito longo'),
  gradeLevel: z.enum(['6', '7', '8', '9'], {
    errorMap: () => ({ message: 'Série inválida' }),
  }),
  duration: z.number()
    .int('Duração deve ser número inteiro')
    .min(10, 'Mínimo 10 minutos')
    .max(480, 'Máximo 480 minutos'),
  skills: z.array(z.string())
    .min(1, 'Selecione pelo menos 1 habilidade')
    .max(10, 'Máximo 10 habilidades'),
});

export const planPublicoSchema = z.object({
  title: z.string().min(5).max(200),
  gradeLevel: z.string(),
  duration: z.number().min(10).max(480),
  objective: z.string().max(500).optional(),
  selectedSkills: z.array(z.string()).min(1).max(10),
});

// ============ EXPERIÊNCIAS ============
export const experienciaSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(2000),
  category: z.string().min(3).max(50),
  skills: z.array(z.string()).min(1).max(10),
  images: z.array(z.string().url()).max(5).optional(),
  content: z.string().min(50).max(5000),
});

export const commentSchema = z.object({
  text: z.string().min(1).max(500),
  experienceId: z.string().uuid(),
});

// ============ USUÁRIO ============
export const updateProfileSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  bio: z.string().max(500).optional(),
  schoolId: z.string().uuid().optional(),
});

// Export types
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PlanInput = z.infer<typeof planSchema>;
export type ExperienciaInput = z.infer<typeof experienciaSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
```

---

## 2. `lib/supabase.ts` - Cliente Supabase

```typescript
import { createClient } from '@supabase/supabase-js';

// Cliente lado do cliente (apenas leitura de dados públicos)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Cliente do servidor (full access)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// ============ HELPER FUNCTIONS ============

// Get session from request
export async function getSessionFromRequest(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return null;
  }

  try {
    const { data: { user }, error } = 
      await supabaseAdmin.auth.admin.getUserById(token);
    
    if (error || !user) return null;
    return user;
  } catch (error) {
    return null;
  }
}

// Get current user from token
export async function getCurrentUser(token: string) {
  try {
    const { data: { user }, error } = 
      await supabaseAdmin.auth.admin.getUserById(token);
    
    if (error || !user) return null;
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Verificar se usuário existe
export async function userExists(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    return !error && !!data;
  } catch {
    return false;
  }
}
```

---

## 3. `middleware.ts` - Proteção de Rotas

```typescript
import { NextRequest, NextResponse } from 'next/server';

const protectedRoutes = [
  '/dashboard',
  '/meus-planos',
  '/minhas-experiencias',
  '/perfil',
  '/api/planos',
  '/api/experiencias',
  '/api/usuarios',
];

const publicRoutes = [
  '/',
  '/auth/login',
  '/auth/signup',
  '/auth/reset-password',
  '/gerar-plano',
  '/api/public',
  '/api/skills',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  // Verificar se é rota pública
  const isPublicRoute = publicRoutes.some(route => 
    pathname.startsWith(route)
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Verificar se é rota protegida
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );

  if (isProtectedRoute && !token) {
    // Redirecionar para login
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|public|favicon.ico).*)',
  ],
};
```

---

## 4. `lib/db/users.ts` - Operações com Usuários

```typescript
import { supabaseAdmin } from '@/lib/supabase';
import { Database } from '@/types/supabase';

type User = Database['public']['Tables']['users']['Row'];

export async function createUser(
  userId: string,
  email: string,
  name: string,
  schoolId: string
): Promise<User | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        email,
        name,
        school_id: schoolId,
        points: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
}

export async function getUserById(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

export async function updateUserProfile(
  userId: string,
  profile: {
    name?: string;
    bio?: string;
    school_id?: string;
  }
) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update(profile)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating user:', error);
    return null;
  }
}

export async function addPoints(userId: string, points: number) {
  try {
    // Registrar transação
    const { error: txError } = await supabaseAdmin
      .from('points_transactions')
      .insert({
        user_id: userId,
        points,
        reason: 'custom',
      });

    if (txError) throw txError;

    // Atualizar total
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ points: supabaseAdmin.rpc('add_points', { id: userId, amount: points }) })
      .eq('id', userId);

    if (updateError) throw updateError;

    return true;
  } catch (error) {
    console.error('Error adding points:', error);
    return false;
  }
}

export async function getRanking(limit: number = 10) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, name, points, school:school_id(name)')
      .order('points', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting ranking:', error);
    return [];
  }
}
```

---

## 5. `lib/db/plans.ts` - Operações com Planos

```typescript
import { supabaseAdmin } from '@/lib/supabase';

export async function createPlan(
  userId: string,
  planData: {
    title: string;
    description?: string;
    content: string;
    gradeLevel: string;
    duration: number;
    skills: string[];
  }
) {
  try {
    // 1. Criar plano
    const { data: plan, error: planError } = await supabaseAdmin
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

    // 2. Associar skills
    const skillsData = planData.skills.map(skillCode => ({
      plan_id: plan.id,
      skill_code: skillCode,
    }));

    const { error: skillsError } = await supabaseAdmin
      .from('plan_skills')
      .insert(skillsData);

    if (skillsError) throw skillsError;

    // 3. Adicionar pontos (+10)
    await supabaseAdmin
      .from('points_transactions')
      .insert({
        user_id: userId,
        points: 10,
        reason: 'create_plan',
        related_id: plan.id,
      });

    // 4. Atualizar pontos do usuário
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('points')
      .eq('id', userId)
      .single();

    await supabaseAdmin
      .from('users')
      .update({ points: (user?.points || 0) + 10 })
      .eq('id', userId);

    return { success: true, planId: plan.id };
  } catch (error) {
    console.error('Error creating plan:', error);
    return { success: false, error };
  }
}

export async function getPlansByUser(userId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('plans')
      .select(`
        *,
        plan_skills(skill_code)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting plans:', error);
    return [];
  }
}

export async function getPlanById(planId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('plans')
      .select(`
        *,
        user:user_id(name, school_id),
        plan_skills(skill_code)
      `)
      .eq('id', planId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting plan:', error);
    return null;
  }
}

export async function updatePlan(
  planId: string,
  userId: string,
  updates: any
) {
  try {
    // Verificar propriedade
    const { data: plan } = await supabaseAdmin
      .from('plans')
      .select('user_id')
      .eq('id', planId)
      .single();

    if (plan?.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    const { error } = await supabaseAdmin
      .from('plans')
      .update(updates)
      .eq('id', planId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating plan:', error);
    return { success: false, error };
  }
}

export async function deletePlan(planId: string, userId: string) {
  try {
    // Verificar propriedade
    const { data: plan } = await supabaseAdmin
      .from('plans')
      .select('user_id')
      .eq('id', planId)
      .single();

    if (plan?.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    const { error } = await supabaseAdmin
      .from('plans')
      .delete()
      .eq('id', planId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting plan:', error);
    return { success: false, error };
  }
}
```

---

## 6. `app/api/auth/register/route.ts` - Endpoint de Signup

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { signupSchema } from '@/lib/schemas';
import { createUser } from '@/lib/db/users';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar input
    const result = signupSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password, name, schoolId } = result.data;

    // Verificar se email já existe
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email já registrado' },
        { status: 400 }
      );
    }

    // Criar user no Auth
    const { data: authData, error: authError } = 
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    // Criar perfil
    const user = await createUser(
      authData.user.id,
      email,
      name,
      schoolId
    );

    if (!user) {
      // Limpar auth se falhar
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: 'Erro ao criar perfil' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Usuário criado com sucesso',
        userId: user.id,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
```

---

## 7. `app/api/auth/login/route.ts` - Endpoint de Login

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { loginSchema } from '@/lib/schemas';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Email ou senha inválida' },
        { status: 400 }
      );
    }

    const { email, password } = result.data;

    // Login no Auth
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: 'Email ou senha inválida' },
        { status: 401 }
      );
    }

    // Criar resposta
    const response = NextResponse.json(
      {
        success: true,
        message: 'Login realizado com sucesso',
        userId: data.user.id,
      },
      { status: 200 }
    );

    // Salvar token em cookie
    response.cookies.set('token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 dias
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
```

---

## 8. `lib/nvidia.ts` - Integração IA

```typescript
import fetch from 'node-fetch';

const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1';
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;

interface NvidiaResponse {
  choices: Array<{
    text: string;
  }>;
}

export async function generatePlanoWithAI(prompt: string): Promise<string> {
  try {
    const response = await fetch(
      `${NVIDIA_API_URL}/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${NVIDIA_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'meta/llama-2-70b-chat',
          prompt: prompt,
          max_tokens: 2000,
          temperature: 0.7,
          top_p: 0.9,
          stop: ['\\n\\n'],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`NVIDIA API error: ${response.statusText}`);
    }

    const data = (await response.json()) as NvidiaResponse;
    const content = data.choices[0].text.trim();

    return content;

  } catch (error) {
    console.error('AI Generation error:', error);
    throw new Error('Erro ao gerar com IA');
  }
}

export async function generateSuggestions(
  title: string,
  skills: string[],
  gradeLevel: string
): Promise<string[]> {
  const prompt = `
Gere 3 sugestões de atividades pedagógicas para um plano de aula:

Título: ${title}
Série: ${gradeLevel}º ano
Habilidades BNCC: ${skills.join(', ')}

Retorne apenas as 3 atividades, uma por linha, sem numeração.
Cada atividade deve ter 10-20 palavras.

Atividades:
`;

  try {
    const response = await generatePlanoWithAI(prompt);
    const suggestions = response
      .split('\n')
      .filter(s => s.trim().length > 0)
      .slice(0, 3);

    return suggestions;

  } catch (error) {
    console.error('Error generating suggestions:', error);
    return [];
  }
}
```

---

## ✅ Checklist de Implementação

- [ ] Copiar `lib/schemas.ts`
- [ ] Copiar `lib/supabase.ts`
- [ ] Copiar `middleware.ts`
- [ ] Copiar `lib/db/users.ts`
- [ ] Copiar `lib/db/plans.ts`
- [ ] Copiar `app/api/auth/register/route.ts`
- [ ] Copiar `app/api/auth/login/route.ts`
- [ ] Copiar `lib/nvidia.ts`
- [ ] Instalar dependências (`zod`, `@supabase/supabase-js`)
- [ ] Testar endpoints com Postman/Insomnia
- [ ] Completar restante dos endpoints

---

**Status:** 8 arquivos prontos para copiar
**Próximo:** Criar restante dos endpoints (15 ainda faltam)
