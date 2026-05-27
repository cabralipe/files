# 🌐 Endpoints Públicos - Gerador de Plano Sem Login

## 1. POST /api/public/gerar - Gerar Plano com IA (Sem Login)

```typescript
// app/api/public/gerar/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { generatePlanoWithAI } from '@/lib/nvidia';
import { planosPublicoSchema } from '@/lib/schemas';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar input
    const validation = planosPublicoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, gradeLevel, duration, skills } = validation.data;

    // Validar skills
    if (!skills || skills.length === 0) {
      return NextResponse.json(
        { error: 'Selecione ao menos uma habilidade' },
        { status: 400 }
      );
    }

    // Buscar nomes das habilidades
    const { data: skillsData } = await supabaseAdmin
      .from('skills')
      .select('code, name')
      .in('code', skills);

    const skillNames = skillsData?.map(s => `${s.code} - ${s.name}`).join(', ') || '';

    // Gerar plano com IA
    const content = await generatePlanoWithAI(
      title,
      gradeLevel,
      duration,
      skills,
      skillNames
    );

    if (!content) {
      return NextResponse.json(
        { error: 'Erro ao gerar plano' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      plan: {
        title,
        gradeLevel,
        duration,
        skills,
        skillNames,
        content,
        generatedAt: new Date().toISOString(),
      },
      message: 'Plano gerado com sucesso! Crie uma conta para salvar.',
    });

  } catch (error) {
    console.error('Error generating public plan:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar plano. Tente novamente.' },
      { status: 500 }
    );
  }
}
```

---

## 2. POST /api/public/download - Download PDF (Sem Login)

```typescript
// app/api/public/download/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { generatePlanoPDF } from '@/lib/pdf-generator';
import { planoPDFSchema } from '@/lib/schemas';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar dados
    const validation = planoPDFSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, gradeLevel, duration, content, skills } = validation.data;

    // Validar conteúdo
    if (!content || content.trim().length < 100) {
      return NextResponse.json(
        { error: 'Conteúdo inválido para gerar PDF' },
        { status: 400 }
      );
    }

    // Gerar PDF
    const pdfBuffer = await generatePlanoPDF({
      title,
      gradeLevel,
      duration,
      content,
      skills: skills || [],
      generatedAt: new Date().toLocaleDateString('pt-BR'),
    });

    if (!pdfBuffer) {
      return NextResponse.json(
        { error: 'Erro ao gerar PDF' },
        { status: 500 }
      );
    }

    // Retornar PDF com headers apropriados
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${title.replace(/\s+/g, '-')}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar PDF. Tente novamente.' },
      { status: 500 }
    );
  }
}
```

---

## 3. GET /api/public/skills - Listar Skills Públicas

```typescript
// app/api/public/skills/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const axis = searchParams.get('axis'); // Eixo da BNCC
    const gradeLevel = searchParams.get('gradeLevel');

    let query = supabaseAdmin
      .from('skills')
      .select('code, name, description, axis, grade_level, category')
      .eq('active', true)
      .order('code', { ascending: true });

    // Filtro por busca
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,description.ilike.%${search}%,code.ilike.%${search}%`
      );
    }

    // Filtro por eixo
    if (axis) {
      query = query.eq('axis', axis);
    }

    // Filtro por série
    if (gradeLevel) {
      query = query.eq('grade_level', gradeLevel);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    // Agrupar por eixo e categoria para melhor UX
    const grouped = data?.reduce((acc, skill) => {
      const axisKey = skill.axis || 'outro';
      if (!acc[axisKey]) {
        acc[axisKey] = [];
      }
      acc[axisKey].push(skill);
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({
      data: data || [],
      grouped: grouped || {},
      total: count || 0,
      message: 'Skills carregadas com sucesso',
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

## 4. POST /api/public/validate-email - Validar Email para Newsletter

```typescript
// app/api/public/validate-email/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

const emailSchema = z.object({
  email: z.string().email('Email inválido'),
  planoTitle: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar email
    const validation = emailSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, planoTitle } = validation.data;

    // Verificar se email já existe
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json({
        success: false,
        message: 'Email já cadastrado',
        exists: true,
      });
    }

    // Registrar interesse em newsletter
    const { error: newsletterError } = await supabaseAdmin
      .from('newsletter_interests')
      .insert({
        email,
        plan_title: planoTitle,
        interested_at: new Date().toISOString(),
      });

    if (newsletterError && !newsletterError.message.includes('unique')) {
      throw newsletterError;
    }

    return NextResponse.json({
      success: true,
      message: 'Email validado! Você pode se cadastrar agora.',
      exists: false,
    });

  } catch (error) {
    console.error('Error validating email:', error);
    return NextResponse.json(
      { error: 'Erro ao validar email' },
      { status: 500 }
    );
  }
}
```

---

## 5. GET /api/public/preview-example - Exemplo de Plano Gerado

```typescript
// app/api/public/preview-example/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Retornar exemplo de plano pré-gerado para preview na homepage
    const examplePlan = {
      title: 'Introdução à Energia Renovável',
      gradeLevel: '6º Ano',
      duration: 120,
      skills: ['EF06CI10', 'EF06CI11', 'EF06CI12'],
      content: `
# Introdução à Energia Renovável - Plano de Aula

## Objetivo Geral
Compreender os conceitos básicos de energia renovável e sua importância para a sustentabilidade.

## Habilidades BNCC Desenvolvidas
- EF06CI10: Explicar o que causa mudanças no clima
- EF06CI11: Descrever as características de diferentes fontes de energia
- EF06CI12: Identificar consequências do uso de combustíveis fósseis

## Estrutura da Aula (120 minutos)

### Introdução (15 min)
- Perguntas disparadoras: "De onde vem a energia que você usa em casa?"
- Discussão sobre tipos de energia conhecidos

### Desenvolvimento (60 min)
#### Bloco 1: Energia Renovável (30 min)
1. Video sobre fontes renováveis
2. Apresentação das 5 principais fontes
3. Comparação com combustíveis fósseis

#### Bloco 2: Prática (30 min)
- Experimento com placa solar
- Construção de mini turbina eólica
- Observações e anotações

### Consolidação (30 min)
- Debate: "Como eu posso usar energia renovável?"
- Criação de cartaz colaborativo
- Reflexão final

### Encerramento (15 min)
- Resumo dos conceitos-chave
- Tarefa de casa: pesquisar sobre energia renovável na sua cidade

## Recursos Necessários
- Materiais: Placas solares, LED, fios, papel, lápis
- Tecnologia: Projetor, notebook, vídeos do YouTube
- Espaço: Sala de aula + área externa se possível

## Avaliação
- Participação nas discussões: 30%
- Qualidade do experimento: 40%
- Cartaz e reflexão: 30%
      `,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      example: examplePlan,
      message: 'Exemplo de plano carregado',
    });

  } catch (error) {
    console.error('Error loading example:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar exemplo' },
      { status: 500 }
    );
  }
}
```

---

## Sumário dos Endpoints Públicos

| Método | Rota | Função | Auth |
|--------|------|--------|------|
| POST | `/api/public/gerar` | Gerar plano | ❌ |
| POST | `/api/public/download` | Download PDF | ❌ |
| GET | `/api/public/skills` | Listar skills | ❌ |
| POST | `/api/public/validate-email` | Validar email | ❌ |
| GET | `/api/public/preview-example` | Exemplo plano | ❌ |

---

## ✅ Checklist de Implementação

- [ ] `app/api/public/gerar/route.ts` - POST
- [ ] `app/api/public/download/route.ts` - POST
- [ ] `app/api/public/skills/route.ts` - GET
- [ ] `app/api/public/validate-email/route.ts` - POST
- [ ] `app/api/public/preview-example/route.ts` - GET
- [ ] Testar geração sem autenticação
- [ ] Testar download de PDF
- [ ] Testar validação de email
- [ ] Criar tabela `newsletter_interests`
- [ ] Configurar rate limiting para endpoints públicos

---

## Rate Limiting (Importante!)

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 requisições por hora
});

// Uso em /api/public/gerar
export async function POST(request: NextRequest) {
  const ip = request.ip || 'unknown';
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return NextResponse.json(
      { error: 'Limite de requisições atingido' },
      { status: 429 }
    );
  }
  // ... resto do código
}
```

---

**Status:** Pronto para implementação
