# 📋 Endpoints de Planos - Implementação Completa

## 1. GET /api/planos - Listar Planos do Usuário

```typescript
// app/api/planos/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/supabase';
import { getPlansByUser } from '@/lib/db/plans';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const user = await getSessionFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    // Paginação
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    const offset = (page - 1) * limit;

    // Buscar planos
    let query = supabaseAdmin
      .from('plans')
      .select(`
        id,
        title,
        description,
        grade_level,
        duration,
        created_at,
        updated_at,
        plan_skills(skill_code)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Filtro de busca
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });

  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar planos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validar com Zod
    const validation = planSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { success, planId, error } = await createPlan(
      user.id,
      validation.data
    );

    if (!success) {
      return NextResponse.json(
        { error: error?.message || 'Erro ao criar plano' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        planId,
        message: 'Plano criado com sucesso! +10 pontos',
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating plan:', error);
    return NextResponse.json(
      { error: 'Erro ao criar plano' },
      { status: 500 }
    );
  }
}
```

---

## 2. GET /api/planos/[id] - Obter Detalhes do Plano

```typescript
// app/api/planos/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/supabase';
import { getPlanById } from '@/lib/db/plans';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const plan = await getPlanById(params.id);

    if (!plan) {
      return NextResponse.json(
        { error: 'Plano não encontrado' },
        { status: 404 }
      );
    }

    // Verificar acesso (apenas dono ou admin)
    if (plan.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Sem permissão' },
        { status: 403 }
      );
    }

    return NextResponse.json(plan);

  } catch (error) {
    console.error('Error fetching plan:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar plano' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validar
    const validation = planSchema.partial().safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { success, error } = await updatePlan(
      params.id,
      user.id,
      validation.data
    );

    if (!success) {
      return NextResponse.json(
        { error: error?.message || 'Erro ao atualizar plano' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Plano atualizado com sucesso',
    });

  } catch (error) {
    console.error('Error updating plan:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar plano' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { success, error } = await deletePlan(params.id, user.id);

    if (!success) {
      return NextResponse.json(
        { error: error?.message || 'Erro ao deletar plano' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Plano deletado com sucesso',
    });

  } catch (error) {
    console.error('Error deleting plan:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar plano' },
      { status: 500 }
    );
  }
}
```

---

## 3. POST /api/planos/ia-suggestion - Gerar Sugestões com IA

```typescript
// app/api/planos/ia-suggestion/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/supabase';
import { generateSuggestions } from '@/lib/nvidia';
import { addPoints } from '@/lib/db/users';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { title, skills, gradeLevel } = await request.json();

    // Validar inputs
    if (!title || !skills || !gradeLevel) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      );
    }

    if (!Array.isArray(skills) || skills.length === 0) {
      return NextResponse.json(
        { error: 'Selecione ao menos uma habilidade' },
        { status: 400 }
      );
    }

    // Gerar sugestões com IA
    const suggestions = await generateSuggestions(
      title,
      skills,
      gradeLevel
    );

    if (!suggestions || suggestions.length === 0) {
      return NextResponse.json(
        { error: 'Erro ao gerar sugestões' },
        { status: 500 }
      );
    }

    // Adicionar pontos (+5)
    await supabaseAdmin
      .from('points_transactions')
      .insert({
        user_id: user.id,
        points: 5,
        reason: 'use_ia',
      });

    // Atualizar pontos do usuário
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('points')
      .eq('id', user.id)
      .single();

    await supabaseAdmin
      .from('users')
      .update({ points: (userData?.points || 0) + 5 })
      .eq('id', user.id);

    return NextResponse.json({
      success: true,
      suggestions,
      pointsEarned: 5,
      message: 'Sugestões geradas! +5 pontos',
    });

  } catch (error) {
    console.error('Error generating suggestions:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar sugestões' },
      { status: 500 }
    );
  }
}
```

---

## 4. POST /api/planos/[id]/download-pdf - Download em PDF

```typescript
// app/api/planos/[id]/download-pdf/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/supabase';
import { getPlanById } from '@/lib/db/plans';
import { generatePlanoPDF } from '@/lib/pdf-generator';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const plan = await getPlanById(params.id);

    if (!plan) {
      return NextResponse.json(
        { error: 'Plano não encontrado' },
        { status: 404 }
      );
    }

    // Verificar acesso
    if (plan.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Sem permissão' },
        { status: 403 }
      );
    }

    // Gerar PDF
    const pdfBuffer = await generatePlanoPDF({
      title: plan.title,
      gradeLevel: plan.grade_level,
      duration: plan.duration,
      content: plan.content,
      skills: plan.plan_skills?.map(ps => ps.skill_code) || [],
    });

    // Retornar PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${plan.title.replace(/\s+/g, '-')}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar PDF' },
      { status: 500 }
    );
  }
}
```

---

## Sumário dos Endpoints de Planos

| Método | Rota | Função | Auth |
|--------|------|--------|------|
| GET | `/api/planos` | Listar planos | ✅ |
| POST | `/api/planos` | Criar plano | ✅ |
| GET | `/api/planos/:id` | Obter detalhes | ✅ |
| PUT | `/api/planos/:id` | Editar plano | ✅ |
| DELETE | `/api/planos/:id` | Deletar plano | ✅ |
| POST | `/api/planos/ia-suggestion` | Sugestões IA | ✅ |
| POST | `/api/planos/:id/download-pdf` | Download PDF | ✅ |

---

## ✅ Checklist de Implementação

- [ ] `app/api/planos/route.ts` - GET e POST
- [ ] `app/api/planos/[id]/route.ts` - GET, PUT, DELETE
- [ ] `app/api/planos/ia-suggestion/route.ts` - POST
- [ ] `app/api/planos/[id]/download-pdf/route.ts` - POST
- [ ] Testar todos os endpoints
- [ ] Verificar autenticação
- [ ] Verificar pontos sendo adicionados

---

**Status:** Pronto para implementação
