# ⭐ Endpoints de Experiências - Implementação Completa

## 1. GET /api/experiencias - Listar Experiências Públicas

```typescript
// app/api/experiencias/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const category = searchParams.get('category');
    const skill = searchParams.get('skill');
    const search = searchParams.get('search');

    const offset = (page - 1) * limit;

    // Query base
    let query = supabaseAdmin
      .from('successful_experiences')
      .select(`
        id,
        title,
        description,
        category,
        likes_count,
        created_at,
        user:user_id(name, school_id),
        experience_skills(skill_code)
      `)
      .eq('published', true)
      .order('likes_count', { ascending: false });

    // Filtros
    if (category) {
      query = query.eq('category', category);
    }

    if (skill) {
      // Usar RLS ou join para filtrar por skill
      query = query.contains('experience_skills', [{ skill_code: skill }]);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
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
    console.error('Error fetching experiences:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar experiências' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    const user = await getCurrentUser(token!);
    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validar
    const validation = experienciaSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Criar experiência
    const { data: experience, error: expError } = await supabaseAdmin
      .from('successful_experiences')
      .insert({
        user_id: user.id,
        title: validation.data.title,
        description: validation.data.description,
        content: validation.data.content || '',
        category: validation.data.category,
        published: true,
      })
      .select()
      .single();

    if (expError) throw expError;

    // Associar skills
    if (validation.data.skills && validation.data.skills.length > 0) {
      const skillsData = validation.data.skills.map(skillCode => ({
        experience_id: experience.id,
        skill_code: skillCode,
      }));

      const { error: skillsError } = await supabaseAdmin
        .from('experience_skills')
        .insert(skillsData);

      if (skillsError) throw skillsError;
    }

    // Adicionar pontos (+25)
    await supabaseAdmin
      .from('points_transactions')
      .insert({
        user_id: user.id,
        points: 25,
        reason: 'publish_experience',
        related_id: experience.id,
      });

    // Atualizar pontos do usuário
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('points')
      .eq('id', user.id)
      .single();

    await supabaseAdmin
      .from('users')
      .update({ points: (userData?.points || 0) + 25 })
      .eq('id', user.id);

    return NextResponse.json(
      {
        success: true,
        experienceId: experience.id,
        message: 'Experiência publicada com sucesso! +25 pontos',
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating experience:', error);
    return NextResponse.json(
      { error: 'Erro ao publicar experiência' },
      { status: 500 }
    );
  }
}
```

---

## 2. GET /api/experiencias/[id] - Obter Detalhes

```typescript
// app/api/experiencias/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabaseAdmin
      .from('successful_experiences')
      .select(`
        *,
        user:user_id(name, school_id),
        experience_skills(skill_code),
        comments(
          id,
          text,
          user:user_id(name),
          created_at
        )
      `)
      .eq('id', params.id)
      .eq('published', true)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Experiência não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching experience:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar experiência' },
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

    // Verificar propriedade
    const { data: experience } = await supabaseAdmin
      .from('successful_experiences')
      .select('user_id')
      .eq('id', params.id)
      .single();

    if (experience?.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Sem permissão' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = experienciaSchema.partial().safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('successful_experiences')
      .update({
        title: validation.data.title,
        description: validation.data.description,
        content: validation.data.content,
        category: validation.data.category,
      })
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Experiência atualizada com sucesso',
    });

  } catch (error) {
    console.error('Error updating experience:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar experiência' },
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

    // Verificar propriedade
    const { data: experience } = await supabaseAdmin
      .from('successful_experiences')
      .select('user_id')
      .eq('id', params.id)
      .single();

    if (experience?.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Sem permissão' },
        { status: 403 }
      );
    }

    const { error } = await supabaseAdmin
      .from('successful_experiences')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Experiência deletada com sucesso',
    });

  } catch (error) {
    console.error('Error deleting experience:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar experiência' },
      { status: 500 }
    );
  }
}
```

---

## 3. POST /api/experiencias/[id]/like - Dar Like

```typescript
// app/api/experiencias/[id]/like/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionFromRequest } from '@/lib/supabase';

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

    // Verificar se experiência existe
    const { data: experience } = await supabaseAdmin
      .from('successful_experiences')
      .select('id, user_id')
      .eq('id', params.id)
      .single();

    if (!experience) {
      return NextResponse.json(
        { error: 'Experiência não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se já tem like
    const { data: existingLike } = await supabaseAdmin
      .from('likes')
      .select('id')
      .eq('experience_id', params.id)
      .eq('user_id', user.id)
      .single();

    if (existingLike) {
      return NextResponse.json(
        { error: 'Você já deu like nesta experiência' },
        { status: 400 }
      );
    }

    // Adicionar like
    const { error: likeError } = await supabaseAdmin
      .from('likes')
      .insert({
        experience_id: params.id,
        user_id: user.id,
      });

    if (likeError) throw likeError;

    // Atualizar contagem
    const { data: likesData } = await supabaseAdmin
      .from('likes')
      .select('id', { count: 'exact' })
      .eq('experience_id', params.id);

    const likesCount = likesData?.length || 0;

    await supabaseAdmin
      .from('successful_experiences')
      .update({ likes_count: likesCount })
      .eq('id', params.id);

    // Adicionar pontos ao autor (+1)
    await supabaseAdmin
      .from('points_transactions')
      .insert({
        user_id: experience.user_id,
        points: 1,
        reason: 'received_like',
        related_id: params.id,
      });

    // Atualizar pontos do autor
    const { data: authorData } = await supabaseAdmin
      .from('users')
      .select('points')
      .eq('id', experience.user_id)
      .single();

    await supabaseAdmin
      .from('users')
      .update({ points: (authorData?.points || 0) + 1 })
      .eq('id', experience.user_id);

    return NextResponse.json({
      success: true,
      likesCount,
      message: 'Like registrado',
    });

  } catch (error) {
    console.error('Error adding like:', error);
    return NextResponse.json(
      { error: 'Erro ao dar like' },
      { status: 500 }
    );
  }
}
```

---

## 4. POST /api/experiencias/[id]/unlike - Remover Like

```typescript
// app/api/experiencias/[id]/unlike/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionFromRequest } from '@/lib/supabase';

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

    // Remover like
    const { error } = await supabaseAdmin
      .from('likes')
      .delete()
      .eq('experience_id', params.id)
      .eq('user_id', user.id);

    if (error) throw error;

    // Atualizar contagem
    const { data: likesData } = await supabaseAdmin
      .from('likes')
      .select('id', { count: 'exact' })
      .eq('experience_id', params.id);

    const likesCount = likesData?.length || 0;

    await supabaseAdmin
      .from('successful_experiences')
      .update({ likes_count: likesCount })
      .eq('id', params.id);

    // TODO: Remover ponto do autor se necessário

    return NextResponse.json({
      success: true,
      likesCount,
      message: 'Like removido',
    });

  } catch (error) {
    console.error('Error removing like:', error);
    return NextResponse.json(
      { error: 'Erro ao remover like' },
      { status: 500 }
    );
  }
}
```

---

## 5. POST /api/experiencias/[id]/comment - Adicionar Comentário

```typescript
// app/api/experiencias/[id]/comment/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionFromRequest } from '@/lib/supabase';
import { commentSchema } from '@/lib/schemas';

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

    const body = await request.json();

    // Validar
    const validation = commentSchema.safeParse({
      text: body.text,
      experienceId: params.id,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Verificar se experiência existe
    const { data: experience } = await supabaseAdmin
      .from('successful_experiences')
      .select('id')
      .eq('id', params.id)
      .single();

    if (!experience) {
      return NextResponse.json(
        { error: 'Experiência não encontrada' },
        { status: 404 }
      );
    }

    // Adicionar comentário
    const { data, error } = await supabaseAdmin
      .from('comments')
      .insert({
        experience_id: params.id,
        user_id: user.id,
        text: validation.data.text,
      })
      .select('*, user:user_id(name)')
      .single();

    if (error) throw error;

    return NextResponse.json(
      {
        success: true,
        comment: data,
        message: 'Comentário adicionado',
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json(
      { error: 'Erro ao adicionar comentário' },
      { status: 500 }
    );
  }
}
```

---

## Sumário dos Endpoints de Experiências

| Método | Rota | Função | Auth |
|--------|------|--------|------|
| GET | `/api/experiencias` | Listar públicas | ❌ |
| POST | `/api/experiencias` | Publicar | ✅ |
| GET | `/api/experiencias/:id` | Obter detalhes | ❌ |
| PUT | `/api/experiencias/:id` | Editar | ✅ |
| DELETE | `/api/experiencias/:id` | Deletar | ✅ |
| POST | `/api/experiencias/:id/like` | Dar like | ✅ |
| POST | `/api/experiencias/:id/unlike` | Remover like | ✅ |
| POST | `/api/experiencias/:id/comment` | Comentar | ✅ |

---

## ✅ Checklist de Implementação

- [ ] `app/api/experiencias/route.ts` - GET e POST
- [ ] `app/api/experiencias/[id]/route.ts` - GET, PUT, DELETE
- [ ] `app/api/experiencias/[id]/like/route.ts` - POST
- [ ] `app/api/experiencias/[id]/unlike/route.ts` - POST
- [ ] `app/api/experiencias/[id]/comment/route.ts` - POST
- [ ] Testar likes e contagem
- [ ] Testar pontos sendo adicionados
- [ ] Testar comentários

---

**Status:** Pronto para implementação
