# 🏆 Endpoints de Ranking e Usuários - Implementação Completa

## 1. GET /api/ranking - Obter Ranking Top 10

```typescript
// app/api/ranking/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Query com ordenação por pontos
    const { data, error, count } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        name,
        email,
        points,
        avatar_url,
        created_at,
        school:school_id(id, name)
      `)
      .eq('is_teacher', true)
      .order('points', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Calcular posição e medals
    const ranking = data?.map((user, index) => ({
      position: offset + index + 1,
      medal: index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null,
      ...user,
    })) || [];

    return NextResponse.json({
      data: ranking,
      total: count || 0,
      limit,
      offset,
      hasMore: (offset + limit) < (count || 0),
    });

  } catch (error) {
    console.error('Error fetching ranking:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar ranking' },
      { status: 500 }
    );
  }
}
```

---

## 2. GET /api/usuarios/perfil - Obter Perfil do Usuário

```typescript
// app/api/usuarios/perfil/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Buscar perfil completo
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        name,
        email,
        points,
        avatar_url,
        bio,
        phone,
        created_at,
        updated_at,
        school:school_id(id, name, city, state),
        plansCount: plans(count),
        experiencesCount: successful_experiences(count),
        likesReceivedCount: likes(count)
      `)
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Perfil não encontrado' },
        { status: 404 }
      );
    }

    // Calcular ranking position
    const { data: rankingData, error: rankError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('is_teacher', true)
      .gt('points', profile.points)
      .select('id', { count: 'exact' });

    const position = (rankingData?.length || 0) + 1;

    // Buscar últimas transações de pontos
    const { data: transactions } = await supabaseAdmin
      .from('points_transactions')
      .select('points, reason, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      profile: {
        ...profile,
        position,
      },
      recentTransactions: transactions || [],
    });

  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar perfil' },
      { status: 500 }
    );
  }
}
```

---

## 3. PUT /api/usuarios/perfil - Atualizar Perfil do Usuário

```typescript
// app/api/usuarios/perfil/route.ts (continua com PUT)

import { profileUpdateSchema } from '@/lib/schemas';
import { z } from 'zod';

export async function PUT(request: NextRequest) {
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
    const validation = profileUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Atualizar perfil
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        name: validation.data.name,
        bio: validation.data.bio,
        phone: validation.data.phone,
        avatar_url: validation.data.avatar_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      profile: data,
      message: 'Perfil atualizado com sucesso',
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar perfil' },
      { status: 500 }
    );
  }
}
```

---

## 4. GET /api/usuarios/:id - Obter Perfil Público de Outro Usuário

```typescript
// app/api/usuarios/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Buscar perfil público
    const { data: profile, error } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        name,
        avatar_url,
        bio,
        points,
        created_at,
        school:school_id(name, city),
        plans(count),
        successful_experiences(count)
      `)
      .eq('id', params.id)
      .eq('is_teacher', true)
      .single();

    if (error || !profile) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Calcular ranking position
    const { data: rankingData } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('is_teacher', true)
      .gt('points', profile.points)
      .select('id', { count: 'exact' });

    const position = (rankingData?.length || 0) + 1;

    // Buscar experiências publicadas do usuário
    const { data: experiences } = await supabaseAdmin
      .from('successful_experiences')
      .select(`
        id,
        title,
        description,
        category,
        likes_count,
        created_at
      `)
      .eq('user_id', params.id)
      .eq('published', true)
      .limit(5)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      profile: {
        ...profile,
        position,
      },
      recentExperiences: experiences || [],
    });

  } catch (error) {
    console.error('Error fetching public profile:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar perfil' },
      { status: 500 }
    );
  }
}
```

---

## 5. POST /api/usuarios/perfil/avatar - Upload de Avatar

```typescript
// app/api/usuarios/perfil/avatar/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/supabase';
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

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      );
    }

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Apenas imagens são permitidas' },
        { status: 400 }
      );
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Arquivo muito grande (máx 5MB)' },
        { status: 400 }
      );
    }

    const fileBuffer = await file.arrayBuffer();
    const filename = `${user.id}-${Date.now()}-${file.name}`;

    // Upload para Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('avatars')
      .upload(filename, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    // Gerar URL pública
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(data.path);

    // Atualizar perfil com novo avatar
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      avatarUrl: publicUrl,
      message: 'Avatar atualizado com sucesso',
    });

  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json(
      { error: 'Erro ao fazer upload do avatar' },
      { status: 500 }
    );
  }
}
```

---

## Sumário dos Endpoints de Ranking e Usuários

| Método | Rota | Função | Auth |
|--------|------|--------|------|
| GET | `/api/ranking` | Listar top 10 | ❌ |
| GET | `/api/usuarios/perfil` | Perfil do usuário | ✅ |
| PUT | `/api/usuarios/perfil` | Atualizar perfil | ✅ |
| GET | `/api/usuarios/:id` | Perfil público | ❌ |
| POST | `/api/usuarios/perfil/avatar` | Upload avatar | ✅ |

---

## ✅ Checklist de Implementação

- [ ] `app/api/ranking/route.ts` - GET ranking
- [ ] `app/api/usuarios/perfil/route.ts` - GET e PUT
- [ ] `app/api/usuarios/[id]/route.ts` - GET perfil público
- [ ] `app/api/usuarios/perfil/avatar/route.ts` - POST upload
- [ ] Testar ranking orderação
- [ ] Testar cálculo de posição
- [ ] Testar upload de avatar
- [ ] Configurar Supabase Storage bucket 'avatars'

---

**Status:** Pronto para implementação
