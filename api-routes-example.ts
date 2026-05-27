// ============================================
// EXEMPLOS DE API ROUTES (Next.js 14)
// ============================================

// FILE: app/api/planos/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gradeLevel = searchParams.get('gradeLevel');
    const subject = searchParams.get('subject');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    let query = supabase
      .from('plans')
      .select(
        `*,
        user:users(*),
        plan_skills(skill:skills(*))`,
        { count: 'exact' }
      )
      .eq('is_published', true);

    if (gradeLevel) query = query.eq('grade_level', gradeLevel);
    if (subject) query = query.eq('subject', subject);

    const { data, count, error } = await query
      .range((page - 1) * limit, page * limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      data,
      total: count,
      page,
      limit,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar planos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get('Authorization');
    if (!auth) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const userId = body.userId; // Extrair do JWT

    // Criar plano
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .insert({
        user_id: userId,
        title: body.title,
        description: body.description,
        grade_level: body.grade_level,
        subject: body.subject,
        content: body.content,
        duration: body.duration,
        materials: body.materials,
        objectives: body.objectives,
      })
      .select()
      .single();

    if (planError) throw planError;

    // Associar skills
    if (body.skill_ids && body.skill_ids.length > 0) {
      const { error: skillError } = await supabase
        .from('plan_skills')
        .insert(
          body.skill_ids.map((skillId: string) => ({
            plan_id: plan.id,
            skill_id: skillId,
          }))
        );

      if (skillError) throw skillError;
    }

    // Adicionar pontos
    await supabase.from('points_transactions').insert({
      user_id: userId,
      points_amount: 10,
      reason: 'plano_criado',
      related_item_id: plan.id,
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao criar plano' },
      { status: 500 }
    );
  }
}

// ============================================
// FILE: app/api/planos/[id]/route.ts
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from('plans')
      .select(
        `*,
        user:users(*),
        plan_skills(skill:skills(*))`
      )
      .eq('id', params.id)
      .single();

    if (error) throw error;

    // Incrementar views
    await supabase
      .from('plans')
      .update({ views_count: data.views_count + 1 })
      .eq('id', params.id);

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Plano não encontrado' },
      { status: 404 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from('plans')
      .update(body)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
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
    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao deletar plano' },
      { status: 500 }
    );
  }
}

// ============================================
// FILE: app/api/ranking/route.ts
// ============================================

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');

    const { data, error } = await supabase
      .from('ranking_view')
      .select('*')
      .limit(limit)
      .order('ranking_position', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar ranking' },
      { status: 500 }
    );
  }
}

// ============================================
// FILE: app/api/experiencias/route.ts
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const gradeLevel = searchParams.get('gradeLevel');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    let query = supabase
      .from('successful_experiences')
      .select(
        `*,
        user:users(*),
        experience_skills(skill:skills(*)),
        likes(count),
        comments(count)`,
        { count: 'exact' }
      );

    if (category) query = query.eq('category', category);
    if (gradeLevel) query = query.eq('grade_level', gradeLevel);

    const { data, count, error } = await query
      .range((page - 1) * limit, page * limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      data,
      total: count,
      page,
      limit,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar experiências' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { data: experience, error } = await supabase
      .from('successful_experiences')
      .insert({
        user_id: body.userId,
        title: body.title,
        description: body.description,
        content: body.content,
        category: body.category,
        images: body.images,
        outcomes: body.outcomes,
        grade_level: body.grade_level,
      })
      .select()
      .single();

    if (error) throw error;

    // Associar skills
    if (body.skill_ids && body.skill_ids.length > 0) {
      await supabase
        .from('experience_skills')
        .insert(
          body.skill_ids.map((skillId: string) => ({
            experience_id: experience.id,
            skill_id: skillId,
          }))
        );
    }

    // Adicionar pontos (25 por experiência publicada)
    await supabase.from('points_transactions').insert({
      user_id: body.userId,
      points_amount: 25,
      reason: 'experiencia_publicada',
      related_item_id: experience.id,
    });

    return NextResponse.json(experience, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao criar experiência' },
      { status: 500 }
    );
  }
}

// ============================================
// FILE: app/api/nvidia/ia-suggestions/route.ts
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(
      'https://integrate.api.nvidia.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'meta/llama2-70b-chat',
          messages: [
            {
              role: 'system',
              content: `Você é um especialista em educação e BNCC. 
              Ajude professores a melhorar planos de aula integrando habilidades da BNCC de forma inovadora e prática.
              Responda em português do Brasil de forma clara e concisa.`,
            },
            {
              role: 'user',
              content: `${body.prompt}
              
              Habilidades envolvidas: ${body.skills?.map((s: any) => s.name).join(', ') || 'Nenhuma'}
              
              Por favor, forneça sugestões práticas e aplicáveis em sala de aula.`,
            },
          ],
          max_tokens: 1024,
          temperature: 0.7,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro da API NVIDIA');
    }

    const suggestion = data.choices[0].message.content;

    // Adicionar pontos por usar IA
    const userId = body.userId;
    if (userId) {
      await supabase.from('points_transactions').insert({
        user_id: userId,
        points_amount: 5,
        reason: 'ia_suggestion',
        related_item_id: body.plan_id,
      });
    }

    return NextResponse.json({
      suggestion,
      tokens_used: data.usage.total_tokens,
    });
  } catch (error) {
    console.error('NVIDIA API error:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar sugestão de IA' },
      { status: 500 }
    );
  }
}
