# 📚 Endpoints de Skills - Implementação Completa

## 1. GET /api/skills - Listar Todas as Habilidades BNCC

```typescript
// app/api/skills/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const axis = searchParams.get('axis'); // Eixo da BNCC
    const gradeLevel = searchParams.get('gradeLevel');
    const category = searchParams.get('category'); // Matemática, Português, etc.

    const offset = (page - 1) * limit;

    // Query base
    let query = supabaseAdmin
      .from('skills')
      .select(`
        code,
        name,
        description,
        axis,
        grade_level,
        category,
        active,
        created_at
      `)
      .eq('active', true)
      .order('code', { ascending: true });

    // Filtro por busca textual
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,description.ilike.%${search}%,code.ilike.%${search}%`
      );
    }

    // Filtro por eixo (Conhecimentos, Habilidades, Atitudes)
    if (axis) {
      query = query.eq('axis', axis);
    }

    // Filtro por série/ano
    if (gradeLevel) {
      query = query.eq('grade_level', gradeLevel);
    }

    // Filtro por categoria (disciplina)
    if (category) {
      query = query.eq('category', category);
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Agrupar por eixo para resposta estruturada
    const grouped = data?.reduce((acc, skill) => {
      const axisKey = skill.axis || 'Outro';
      if (!acc[axisKey]) {
        acc[axisKey] = [];
      }
      acc[axisKey].push(skill);
      return acc;
    }, {} as Record<string, any[]>);

    // Contar total por eixo
    const { data: axisCounts } = await supabaseAdmin
      .from('skills')
      .select('axis')
      .eq('active', true);

    const axisSummary = axisCounts?.reduce((acc, skill) => {
      const key = skill.axis || 'Outro';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      grouped: grouped || {},
      axisSummary: axisSummary || {},
      filters: {
        availableAxes: Object.keys(axisSummary || {}),
        availableGradeLevels: ['6º Ano', '7º Ano', '8º Ano', '9º Ano'],
        availableCategories: [
          'Português',
          'Matemática',
          'Ciências',
          'História',
          'Geografia',
          'Educação Física',
          'Artes',
          'Inglês',
        ],
      },
    });

  } catch (error) {
    console.error('Error fetching skills:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar habilidades' },
      { status: 500 }
    );
  }
}
```

---

## 2. GET /api/skills/:code - Obter Detalhes da Habilidade

```typescript
// app/api/skills/[code]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    // Buscar skill específico
    const { data: skill, error } = await supabaseAdmin
      .from('skills')
      .select(`
        code,
        name,
        description,
        axis,
        grade_level,
        category,
        detailed_description,
        example_activities,
        assessment_methods,
        related_skills,
        active,
        created_at,
        updated_at
      `)
      .eq('code', params.code)
      .eq('active', true)
      .single();

    if (error || !skill) {
      return NextResponse.json(
        { error: 'Habilidade não encontrada' },
        { status: 404 }
      );
    }

    // Buscar skills relacionadas
    const { data: relatedSkills } = await supabaseAdmin
      .from('skills')
      .select('code, name, category')
      .in('code', skill.related_skills || [])
      .eq('active', true);

    // Buscar planos que usam essa skill
    const { data: plans, count: plansCount } = await supabaseAdmin
      .from('plan_skills')
      .select('plan:plan_id(id, title, user_id)')
      .eq('skill_code', params.code)
      .limit(5);

    // Buscar experiências que usam essa skill
    const { data: experiences, count: expCount } = await supabaseAdmin
      .from('experience_skills')
      .select('experience:experience_id(id, title, likes_count)')
      .eq('skill_code', params.code)
      .limit(5);

    return NextResponse.json({
      skill: {
        ...skill,
        relatedSkills: relatedSkills || [],
      },
      usage: {
        plansCount: plansCount || 0,
        experiencesCount: expCount || 0,
        recentPlans: plans || [],
        recentExperiences: experiences || [],
      },
    });

  } catch (error) {
    console.error('Error fetching skill:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar habilidade' },
      { status: 500 }
    );
  }
}
```

---

## 3. GET /api/skills/by-grade/:gradeLevel - Habilidades por Série

```typescript
// app/api/skills/by-grade/[gradeLevel]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { gradeLevel: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let query = supabaseAdmin
      .from('skills')
      .select(`
        code,
        name,
        description,
        axis,
        category,
        grade_level
      `)
      .eq('grade_level', decodeURIComponent(params.gradeLevel))
      .eq('active', true)
      .order('code', { ascending: true });

    // Filtro opcional por categoria
    if (category) {
      query = query.eq('category', category);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    // Agrupar por categoria
    const grouped = data?.reduce((acc, skill) => {
      const categoryKey = skill.category || 'Outro';
      if (!acc[categoryKey]) {
        acc[categoryKey] = [];
      }
      acc[categoryKey].push(skill);
      return acc;
    }, {} as Record<string, any[]>);

    // Agrupar por eixo
    const byAxis = data?.reduce((acc, skill) => {
      const axisKey = skill.axis || 'Outro';
      if (!acc[axisKey]) {
        acc[axisKey] = [];
      }
      acc[axisKey].push(skill);
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({
      gradeLevel: params.gradeLevel,
      total: count || 0,
      data: data || [],
      groupedByCategory: grouped || {},
      groupedByAxis: byAxis || {},
    });

  } catch (error) {
    console.error('Error fetching skills by grade:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar habilidades' },
      { status: 500 }
    );
  }
}
```

---

## 4. POST /api/skills/search - Busca Avançada de Skills

```typescript
// app/api/skills/search/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

const searchSchema = z.object({
  query: z.string().min(1).max(100),
  filters: z.object({
    axis: z.array(z.string()).optional(),
    gradeLevel: z.array(z.string()).optional(),
    category: z.array(z.string()).optional(),
  }).optional(),
  limit: z.number().min(1).max(50).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar
    const validation = searchSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { query, filters = {}, limit = 20 } = validation.data;

    let dbQuery = supabaseAdmin
      .from('skills')
      .select(
        'code, name, description, axis, grade_level, category, active'
      )
      .eq('active', true)
      .or(
        `name.ilike.%${query}%,description.ilike.%${query}%,code.ilike.%${query}%`
      )
      .limit(limit)
      .order('code', { ascending: true });

    // Aplicar filtros
    if (filters.axis && filters.axis.length > 0) {
      dbQuery = dbQuery.in('axis', filters.axis);
    }

    if (filters.gradeLevel && filters.gradeLevel.length > 0) {
      dbQuery = dbQuery.in('grade_level', filters.gradeLevel);
    }

    if (filters.category && filters.category.length > 0) {
      dbQuery = dbQuery.in('category', filters.category);
    }

    const { data, error } = await dbQuery;

    if (error) throw error;

    // Agrupar por categoria para resposta estruturada
    const grouped = data?.reduce((acc, skill) => {
      const categoryKey = skill.category || 'Outro';
      if (!acc[categoryKey]) {
        acc[categoryKey] = [];
      }
      acc[categoryKey].push(skill);
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({
      query,
      results: data || [],
      total: data?.length || 0,
      grouped: grouped || {},
      appliedFilters: filters,
    });

  } catch (error) {
    console.error('Error searching skills:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar habilidades' },
      { status: 500 }
    );
  }
}
```

---

## 5. GET /api/skills/categories - Listar Categorias e Estatísticas

```typescript
// app/api/skills/categories/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Buscar todas as skills para análise
    const { data: skills, error } = await supabaseAdmin
      .from('skills')
      .select('code, category, grade_level, axis')
      .eq('active', true);

    if (error) throw error;

    // Análise de categorias
    const categoryStats = skills?.reduce((acc, skill) => {
      const category = skill.category || 'Outro';
      if (!acc[category]) {
        acc[category] = {
          name: category,
          count: 0,
          grades: new Set(),
          axes: new Set(),
        };
      }
      acc[category].count += 1;
      acc[category].grades.add(skill.grade_level);
      acc[category].axes.add(skill.axis);
      return acc;
    }, {} as Record<string, any>);

    // Converter Sets para Arrays
    const categoriesList = Object.values(categoryStats || {}).map((cat: any) => ({
      name: cat.name,
      count: cat.count,
      grades: Array.from(cat.grades),
      axes: Array.from(cat.axes),
    }));

    // Análise por série
    const gradeStats = skills?.reduce((acc, skill) => {
      const grade = skill.grade_level || 'Outro';
      if (!acc[grade]) {
        acc[grade] = { grade, count: 0, categories: new Set() };
      }
      acc[grade].count += 1;
      acc[grade].categories.add(skill.category);
      return acc;
    }, {} as Record<string, any>);

    const gradesList = Object.values(gradeStats || {}).map((g: any) => ({
      grade: g.grade,
      count: g.count,
      categories: Array.from(g.categories),
    }));

    // Análise por eixo
    const axisStats = skills?.reduce((acc, skill) => {
      const axis = skill.axis || 'Outro';
      if (!acc[axis]) {
        acc[axis] = { axis, count: 0 };
      }
      acc[axis].count += 1;
      return acc;
    }, {} as Record<string, any>);

    const axisList = Object.values(axisStats || {});

    return NextResponse.json({
      totalSkills: skills?.length || 0,
      categories: categoriesList,
      grades: gradesList,
      axes: axisList,
      summary: {
        totalCategories: categoriesList.length,
        totalGrades: gradesList.length,
        totalAxes: axisList.length,
      },
    });

  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar categorias' },
      { status: 500 }
    );
  }
}
```

---

## Sumário dos Endpoints de Skills

| Método | Rota | Função | Auth |
|--------|------|--------|------|
| GET | `/api/skills` | Listar todas | ❌ |
| GET | `/api/skills/:code` | Detalhes | ❌ |
| GET | `/api/skills/by-grade/:gradeLevel` | Por série | ❌ |
| POST | `/api/skills/search` | Busca avançada | ❌ |
| GET | `/api/skills/categories` | Categorias | ❌ |

---

## ✅ Checklist de Implementação

- [ ] `app/api/skills/route.ts` - GET
- [ ] `app/api/skills/[code]/route.ts` - GET
- [ ] `app/api/skills/by-grade/[gradeLevel]/route.ts` - GET
- [ ] `app/api/skills/search/route.ts` - POST
- [ ] `app/api/skills/categories/route.ts` - GET
- [ ] Testar filtros por eixo, série, categoria
- [ ] Testar busca textual
- [ ] Testar agrupamentos
- [ ] Testar estatísticas por categoria
- [ ] Adicionar caching (Redis) para endpoints frequentes

---

## Caching Recomendado

```typescript
// Para endpoints públicos frequentes, adicionar cache:
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// No GET /api/skills
const cacheKey = `skills:${JSON.stringify(filters)}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return NextResponse.json(cached);
}

// ... executar query
await redis.setex(cacheKey, 3600, data); // Cache por 1 hora
```

---

**Status:** Pronto para implementação
