# 🏗️ Diagrama de Arquitetura - BNCC Platform

## Fluxo Geral da Aplicação

```
┌─────────────────────────────────────────────────────────────────┐
│                         USUÁRIO (Professor)                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
                ▼            ▼            ▼
        ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        │   Browser    │ │ Mobile App   │ │  Desktop    │
        │   (Next.js)  │ │  (React)     │ │  (Electron) │
        └──────────────┘ └──────────────┘ └──────────────┘
                │            │                   │
                └────────────┼───────────────────┘
                             │
        ┌────────────────────┴────────────────────┐
        │                                         │
        ▼                                         ▼
┌──────────────────────────────┐      ┌──────────────────────┐
│    Vercel Serverless        │      │  Vercel CDN          │
│  ┌─────────────────────────┐ │      │  (Static Assets)     │
│  │ Next.js API Routes      │ │      └──────────────────────┘
│  ├─────────────────────────┤ │
│  │ /api/auth               │ │
│  │ /api/planos             │ │
│  │ /api/experiencias       │ │
│  │ /api/ranking            │ │
│  │ /api/nvidia/*           │ │
│  └─────────────────────────┘ │
│                              │
│  ┌─────────────────────────┐ │
│  │ Server Actions          │ │
│  │ (Criar, Editar, etc)    │ │
│  └─────────────────────────┘ │
└──────────────────────────────┘
        │         │         │
        │         │         └─────────────────┐
        │         │                           │
        ▼         ▼                           ▼
    ┌─────────────────────────────┐   ┌──────────────────┐
    │ Supabase PostgreSQL         │   │ NVIDIA NIM API   │
    ├─────────────────────────────┤   ├──────────────────┤
    │ • Users (professors)        │   │ Meta Llama 2     │
    │ • Schools (escolas)         │   │ 70B (Chat)       │
    │ • Skills (habilidades BNCC) │   │                  │
    │ • Plans (planos de aula)    │   │ Sugestões de IA  │
    │ • Experiences (cases)       │   │ Para melhorias   │
    │ • Rankings (ranking)        │   └──────────────────┘
    │ • Points (sistema pontos)   │
    │ • Likes/Comments            │
    │                             │
    │ ┌───────────────────────┐   │
    │ │ RLS Policies          │   │
    │ │ (Row Level Security)  │   │
    │ └───────────────────────┘   │
    │                             │
    │ ┌───────────────────────┐   │
    │ │ Supabase Storage      │   │
    │ │ (PDFs, Imagens)       │   │
    │ └───────────────────────┘   │
    └─────────────────────────────┘
```

## Fluxo de Autenticação

```
┌──────────────┐
│ Novo Usuario │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ Signup Form          │
│ (email, senha, nome) │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ POST /api/auth/signup│
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Supabase Auth        │
│ (cria JWT)           │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Cria registro em     │
│ tabela users         │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Email de confirmação │
│ (opcional)           │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Redireciona para     │
│ Dashboard            │
└──────────────────────┘
```

## Fluxo de Criação de Plano

```
┌──────────────────┐
│ Professor        │
│ Clica "Novo      │
│ Plano"           │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────┐
│ Página: /planos/criar    │
│ ┌────────────────────┐   │
│ │ Formulário:        │   │
│ │ - Título           │   │
│ │ - Descrição        │   │
│ │ - Grade (1-5)      │   │
│ │ - Disciplina       │   │
│ │ - Conteúdo         │   │
│ │ - Duração          │   │
│ │ - Materiais        │   │
│ │ - Skills (multi)   │   │
│ └────────────────────┘   │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ POST /api/planos         │
│ (dados do plano)         │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Supabase:                │
│ ┌──────────────────────┐ │
│ │ INSERT INTO plans    │ │
│ │ INSERT INTO          │ │
│ │ plan_skills          │ │
│ │                      │ │
│ │ INSERT INTO          │ │
│ │ points_transactions  │ │
│ │ (+10 points)         │ │
│ └──────────────────────┘ │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Resposta: { id, ... }    │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Toast: "Plano criado!"   │
│ Redireciona para detalhe │
└──────────────────────────┘
```

## Fluxo de Sugestão IA

```
┌──────────────────────┐
│ Professor            │
│ Vê plano criado      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Clica "Pedir         │
│ Sugestão de IA"      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────┐
│ Modal: IA Suggestion         │
│ ┌────────────────────────┐   │
│ │ Insira sua pergunta:   │   │
│ │ "Como melhorar este    │   │
│ │  plano para estar      │   │
│ │  mais interativo?"     │   │
│ └────────────────────────┘   │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ POST /api/nvidia/            │
│ ia-suggestions               │
│ {                            │
│   prompt: "...",             │
│   skills: [...],             │
│   plan_id: "uuid",           │
│   userId: "uuid"             │
│ }                            │
└──────────┬───────────────────┘
           │
           ▼
┌────────────────────────────────┐
│ NVIDIA NIM API (Llama 2 70B)   │
│                                │
│ "Recomendo adicionar um        │
│  projeto prático de robótica   │
│  que trabalhe o reconhecimento │
│  de padrões (EF01CO05)..."     │
└──────────┬─────────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Resposta volta ao cliente    │
│ ┌──────────────────────────┐ │
│ │ INSERT pontos_transactions │ │
│ │ (+5 points)              │ │
│ └──────────────────────────┘ │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Exibe sugestão em modal      │
│ Professor pode aceitar ou    │
│ gerar nova sugestão          │
└──────────────────────────────┘
```

## Fluxo de Ranking (Real-Time)

```
┌──────────────────────┐
│ Usuário acessa:      │
│ /dashboard/ranking   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────┐
│ GET /api/ranking?limit=100   │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│ Supabase Query:                  │
│ SELECT * FROM ranking_view       │
│ ORDER BY total_points DESC       │
│ LIMIT 100                        │
└──────────┬──────────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Dados retornam               │
│ ┌────────────────────────┐   │
│ │ id | name | points |   │   │
│ │    | pos  |         │   │   │
│ │ 1  | Prof A | 450   │   │   │
│ │ 2  | Prof B | 380   │   │   │
│ │ 3  | Prof C | 350   │   │   │
│ │ ... (mais)          │   │   │
│ └────────────────────────┘   │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Frontend renderiza:          │
│ ┌────────────────────────┐   │
│ │ Podium com top 3      │   │
│ │ Tabela com ranking    │   │
│ │ Gráfico de pontos     │   │
│ │ Badges/Achievements   │   │
│ └────────────────────────┘   │
└──────────────────────────────┘
```

## Fluxo de Experiências Exitosas

```
┌──────────────────────┐
│ Professor            │
│ Quer compartilhar    │
│ um case de sucesso   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────┐
│ /experiencias/criar          │
│ ┌────────────────────────┐   │
│ │ Formulário:            │   │
│ │ - Título               │   │
│ │ - Descrição            │   │
│ │ - Categoria (Project/  │   │
│ │   Experiment/Case)     │   │
│ │ - Conteúdo detalhado   │   │
│ │ - Imagens (galeria)    │   │
│ │ - Resultados           │   │
│ │ - Skills BNCC (multi)  │   │
│ └────────────────────────┘   │
└──────────┬───────────────────┘
           │
           ▼
┌────────────────────────────┐
│ POST /api/experiencias     │
└──────────┬─────────────────┘
           │
           ▼
┌────────────────────────────────┐
│ Supabase:                      │
│ 1. INSERT successful_experiences
│ 2. INSERT experience_skills    │
│ 3. Upload imagens (Storage)    │
│ 4. INSERT points_transactions  │
│    (+25 points)                │
└──────────┬─────────────────────┘
           │
           ▼
┌────────────────────────────────┐
│ Usuários podem:                │
│ ┌──────────────────────────┐   │
│ │ - Ver experiência        │   │
│ │ - Dar like (+1 ponto     │   │
│ │   p/ criador)            │   │
│ │ - Comentar               │   │
│ │ - Compartilhar           │   │
│ │ - Salvar como favorito   │   │
│ └──────────────────────────┘   │
└────────────────────────────────┘
```

## Stack de Dados

```
┌───────────────────────────────────────────┐
│ PostgreSQL (Supabase)                      │
├───────────────────────────────────────────┤
│                                           │
│  ┌─────────────────┐  ┌─────────────────┐│
│  │ users           │  │ schools         ││
│  ├─────────────────┤  ├─────────────────┤│
│  │ id              │  │ id              ││
│  │ email           │  │ name            ││
│  │ full_name       │  │ city, state     ││
│  │ avatar_url      │  │ cnpj            ││
│  │ school_id   ──────→ id              ││
│  │ bio             │  └─────────────────┘│
│  │ created_at      │                     │
│  └─────────────────┘                     │
│                                           │
│  ┌─────────────────┐  ┌─────────────────┐│
│  │ skills          │  │ plans           ││
│  ├─────────────────┤  ├─────────────────┤│
│  │ id              │  │ id              ││
│  │ code (BNCC)     │  │ user_id      ──→│ users
│  │ name            │  │ title           ││
│  │ description     │  │ grade_level     ││
│  │ competency      │  │ subject         ││
│  │ subject         │  │ content         ││
│  │ axis            │  │ pdf_url         ││
│  └─────────────────┘  │ is_published    ││
│         ▲             │ views_count     ││
│         │             │ created_at      ││
│         │             └─────────────────┘│
│         │                     │          │
│    ┌────┴──────────┐          │          │
│    │ plan_skills   │          │          │
│    ├──────────────┤           │          │
│    │ plan_id   ───┴──────────┘           │
│    │ skill_id  ───┘                     │
│    └──────────────┘                     │
│                                           │
│  ┌─────────────────────────────────────┐ │
│  │ successful_experiences              │ │
│  ├─────────────────────────────────────┤ │
│  │ id, user_id, title, category, ...  │ │
│  │ likes_count, views_count            │ │
│  │ images, outcomes, grade_level       │ │
│  └─────────────────────────────────────┘ │
│         │           │                     │
│    ┌────┴─────┐ ┌───┴──────┐             │
│    │ likes     │ │ comments │             │
│    ├──────────┤ ├──────────┤             │
│    │ user_id  │ │ user_id  │             │
│    │ exp_id   │ │ exp_id   │             │
│    └──────────┘ │ content  │             │
│                 └──────────┘             │
│                                           │
│  ┌──────────────────────┐                │
│  │ points_transactions  │                │
│  ├──────────────────────┤                │
│  │ id, user_id, points  │                │
│  │ reason (plano_criado,│                │
│  │ ia_suggestion, ...)  │                │
│  │ related_item_id      │                │
│  │ created_at           │                │
│  └──────────────────────┘                │
│                                           │
│  ┌──────────────────────┐                │
│  │ ranking_view (VIEW)  │                │
│  ├──────────────────────┤                │
│  │ Materializa ranking  │                │
│  │ em tempo real        │                │
│  └──────────────────────┘                │
│                                           │
└───────────────────────────────────────────┘
```

## Políticas RLS (Row Level Security)

```
┌─────────────────────────────────────────┐
│ users table                              │
├─────────────────────────────────────────┤
│ SELECT: auth.uid() = id                 │
│ UPDATE: auth.uid() = id                 │
│ DELETE: auth.uid() = id                 │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ plans table                              │
├─────────────────────────────────────────┤
│ SELECT:                                  │
│  - is_published = true OR                │
│  - auth.uid() = user_id                  │
│ INSERT: auth.uid() = user_id            │
│ UPDATE: auth.uid() = user_id            │
│ DELETE: auth.uid() = user_id            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ successful_experiences table             │
├─────────────────────────────────────────┤
│ SELECT: true (público)                  │
│ INSERT: auth.uid() = user_id            │
│ UPDATE: auth.uid() = user_id            │
│ DELETE: auth.uid() = user_id            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ skills table                             │
├─────────────────────────────────────────┤
│ SELECT: true (público read-only)        │
│ INSERT: admin only                      │
│ UPDATE: admin only                      │
│ DELETE: admin only                      │
└─────────────────────────────────────────┘
```

---

**Todos os fluxos são otimizados para performance e segurança!**
