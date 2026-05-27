# BNCC Platform - Estrutura Completa do Projeto

## 📁 Arquitetura do Projeto

```
bncc-platform/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── planos/
│   │   │   ├── page.tsx (listagem)
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx (detalhe)
│   │   │   └── criar/
│   │   │       └── page.tsx
│   │   ├── experiencias/
│   │   │   ├── page.tsx (listagem)
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx (detalhe)
│   │   │   └── criar/
│   │   │       └── page.tsx
│   │   ├── ranking/
│   │   │   └── page.tsx
│   │   ├── perfil/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   ├── register/
│   │   │   │   └── route.ts
│   │   │   ├── login/
│   │   │   │   └── route.ts
│   │   │   └── logout/
│   │   │       └── route.ts
│   │   ├── planos/
│   │   │   ├── route.ts (GET, POST)
│   │   │   ├── [id]/
│   │   │   │   └── route.ts (GET, PUT, DELETE)
│   │   │   └── ia-suggestion/
│   │   │       └── route.ts
│   │   ├── experiencias/
│   │   │   ├── route.ts (GET, POST)
│   │   │   └── [id]/
│   │   │       └── route.ts (GET, PUT, DELETE)
│   │   ├── ranking/
│   │   │   └── route.ts
│   │   ├── usuarios/
│   │   │   ├── perfil/
│   │   │   │   └── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   └── nvidia/
│   │       └── ia-suggestions/
│   │           └── route.ts
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── SignupForm.tsx
│   ├── planos/
│   │   ├── PlanoForm.tsx
│   │   ├── PlanoCard.tsx
│   │   ├── PlanoDetail.tsx
│   │   └── PlanosList.tsx
│   ├── experiencias/
│   │   ├── ExperienciaForm.tsx
│   │   ├── ExperienciaCard.tsx
│   │   ├── ExperienciaDetail.tsx
│   │   └── ExperienciasList.tsx
│   ├── ranking/
│   │   ├── RankingTable.tsx
│   │   └── PodiumLeaders.tsx
│   ├── dashboard/
│   │   ├── StatsCards.tsx
│   │   ├── RecentActivity.tsx
│   │   └── QuickActions.tsx
│   ├── common/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Footer.tsx
│   │   └── LoadingSpinner.tsx
│   └── ia/
│       ├── SuggestionModal.tsx
│       └── IAChat.tsx
├── lib/
│   ├── supabase.ts (cliente)
│   ├── supabase-admin.ts (admin)
│   ├── hooks.ts (React Hooks customizados)
│   ├── utils.ts (funções utilitárias)
│   ├── constants.ts
│   └── schemas.ts (Zod schemas para validação)
├── styles/
│   ├── globals.css
│   └── variables.css
├── types/
│   ├── index.ts
│   ├── supabase.ts
│   └── api.ts
├── public/
│   ├── logo.svg
│   └── images/
├── migrations/
│   ├── 001_create_tables.sql
│   └── 002_create_indexes.sql
├── seed/
│   └── seed-skills.ts
├── .env.local.example
├── .env.example
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
└── README.md
```

## 🗄️ Schema do Supabase

### Tabelas Principais:
- `users` - Professores cadastrados
- `schools` - Escolas participantes
- `skills` - Habilidades da BNCC
- `plans` - Planos de aula criados
- `plan_skills` - Relação entre planos e habilidades
- `plan_points` - Histórico de pontos
- `successful_experiences` - Experiências exitosas compartilhadas
- `experience_skills` - Relação entre experiências e habilidades
- `rankings` - Cache de ranking (atualizado periodicamente)
- `points_transactions` - Histórico de pontos

## 🔐 RLS Policies

- Cada usuário vê seus próprios planos
- Usuários podem ver experiências exitosas públicas
- Ranking é público para motivação
- Admin pode gerenciar skills

## 🚀 Tecnologias

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: Zustand + React Context
- **Data Fetching**: TanStack Query (React Query)
- **Backend**: Next.js API Routes + Server Actions
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (JWT)
- **Storage**: Supabase Storage (para PDFs e imagens)
- **IA**: NVIDIA NIM API (para sugestões)
- **Hosting**: Vercel (free tier)

## 📊 Fluxo de Pontos

```
Ação do Professor → Pontos
├── Criar plano de aula → 10 pontos
├── Usar sugestão de IA → 5 pontos
├── Publicar experiência exitosa → 25 pontos
├── Outro professor usar seu plano → 2 pontos
└── Experiência receber "like" → 1 ponto
```

## 🎯 Features Principais

1. **Autenticação**
   - Signup/Login com email
   - Recuperação de senha
   - Perfil do professor

2. **Planos de Aula**
   - Criar/editar/deletar planos
   - Associar habilidades BNCC
   - Gerar PDF
   - Sugestões de IA

3. **Experiências Exitosas**
   - Compartilhar projetos/cases
   - Sistema de likes/comentários
   - Filtros por habilidade
   - Galeria de imagens

4. **Ranking**
   - Top 10 professores
   - Podium visual
   - Histórico de pontos
   - Badges/achievements

5. **Dashboard**
   - Stats pessoais
   - Atividade recente
   - Ações rápidas
   - Próximas metas

## 🔑 Variáveis de Ambiente

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

NVIDIA_API_KEY=
NVIDIA_API_URL=https://integrate.api.nvidia.com/

NEXT_PUBLIC_APP_URL=http://localhost:3000
```
