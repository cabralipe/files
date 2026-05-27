# 🗺️ Mapa de Dependências do Projeto

## Como os Arquivos se Conectam

```
┌─────────────────────────────────────────────────────────────────┐
│                    DOCUMENTAÇÃO & SETUP                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  START HERE ──────────→ README.md                              │
│                           ↓                                     │
│                    IMPLEMENTATION-GUIDE.md                      │
│                           ↓                                     │
│              project-structure.md (entender arquitetura)       │
│                                                                 │
│  Referência rápida:                                            │
│  • RESUMO-PROJETO.md (overview)                               │
│  • FLUXO-ARQUITETURA.md (diagramas)                           │
│  • ARQUIVOS-CRIADOS.md (lista completa)                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                             ↓
        ┌────────────────────┴────────────────────┐
        ↓                                         ↓
┌───────────────────────────────┐       ┌──────────────────────┐
│   CONFIGURAÇÃO INICIAL        │       │   BANCO DE DADOS     │
├───────────────────────────────┤       ├──────────────────────┤
│                               │       │                      │
│ .env.example                  │       │ supabase-schema.sql  │
│ ↓                             │       │ ↓                    │
│ .env.local (preencher)        │       │ PostgreSQL/Supabase  │
│                               │       │ • 11 tabelas         │
│ package.json                  │       │ • RLS policies       │
│ ↓                             │       │ • Índices            │
│ npm install                   │       │ • Views              │
│                               │       │                      │
│ tsconfig.json                 │       │ bncc-skills.json     │
│ tailwind.config.ts            │       │ ↓                    │
│                               │       │ npm run seed         │
│                               │       │ (Popula skills)      │
└───────────────────────────────┘       └──────────────────────┘
        ↓                                       ↓
        └────────────────────┬─────────────────┘
                             ↓
        ┌────────────────────────────────────────┐
        │      CÓDIGO TYPESCRIPT/REACT          │
        ├────────────────────────────────────────┤
        │                                        │
        │  types.ts (FOUNDATIONAL)              │
        │  • User, Plan, Skill, etc             │
        │  ↓ ↓ ↓                                 │
        │  Todos os componentes usam             │
        │                                        │
        │  components-example.tsx               │
        │  • LoginForm → usa types              │
        │  • PlanCard → usa Plan type           │
        │  • SkillSelector → usa Skill type     │
        │  • PodiumLeaders → usa RankingEntry   │
        │  • StatCard → ui compartilhado        │
        │                                        │
        │  api-routes-example.ts                │
        │  • POST /api/auth/signup → cria user  │
        │  • POST /api/planos → cria plan       │
        │  • GET /api/ranking → retorna ranking │
        │  • POST /api/nvidia/* → IA            │
        │  ↓                                     │
        │  Todas consultam supabase-schema      │
        │                                        │
        │  hooks-customizados.ts                │
        │  • useAuth() → API auth routes        │
        │  • usePlans() → Query DB              │
        │  • useRanking() → Query ranking_view  │
        │  • useSkills() → Query skills         │
        │  • useAISuggestion() → API NVIDIA     │
        │  ↓                                     │
        │  Usados em todos os componentes       │
        │                                        │
        │  exemplo-pagina-*.tsx                 │
        │  • Ranking page → useRanking()        │
        │  • Dashboard → usePlans(), useAuth()  │
        │  • Experiencias → useExperiences()    │
        │  ↓                                     │
        │  Cada página combina componentes      │
        │                                        │
        └────────────────────────────────────────┘
                             ↓
        ┌────────────────────────────────────────┐
        │         ESTRUTURA DO APP              │
        ├────────────────────────────────────────┤
        │                                        │
        │  app/layout.tsx (global)              │
        │  ├─ app/(auth)/layout.tsx             │
        │  │  ├─ app/(auth)/login/page.tsx      │
        │  │  │  └─ LoginForm component         │
        │  │  └─ app/(auth)/signup/page.tsx     │
        │  │     └─ SignupForm component        │
        │  │                                     │
        │  ├─ app/(dashboard)/layout.tsx        │
        │  │  ├─ app/(dashboard)/dashboard/page │
        │  │  │  └─ Dashboard components        │
        │  │  ├─ app/(dashboard)/planos/        │
        │  │  │  ├─ page.tsx (listagem)         │
        │  │  │  ├─ criar/page.tsx              │
        │  │  │  └─ [id]/page.tsx               │
        │  │  ├─ app/(dashboard)/experiencias/  │
        │  │  │  └─ (similar)                   │
        │  │  └─ app/(dashboard)/ranking/       │
        │  │     └─ page.tsx (exemplo)          │
        │  │                                     │
        │  └─ app/api/                          │
        │     ├─ auth/* (exemplo em .ts)        │
        │     ├─ planos/* (exemplo em .ts)      │
        │     ├─ experiencias/* (exemplo)       │
        │     └─ nvidia/* (exemplo)             │
        │                                        │
        └────────────────────────────────────────┘
```

## Fluxo de Implementação

```
1. SETUP (30 min)
   ├─ Copiar arquivos
   ├─ npm install (usa package.json)
   ├─ Criar Supabase
   ├─ Executar schema.sql
   └─ Preencher .env.local

2. SEED (5 min)
   ├─ npm run seed (usa seed/seed-skills.ts)
   └─ Popula tabela skills com bncc-skills.json

3. DESENVOLVIMENTO (2-3 horas)
   ├─ Copiar componentes (components-example.tsx)
   ├─ Copiar hooks (hooks-customizados.ts)
   ├─ Implementar rotas API (api-routes-example.ts)
   ├─ Criar pages com os exemplos
   └─ Testar fluxos

4. TESTE (1 hora)
   ├─ npm run dev
   ├─ Testar auth
   ├─ Testar planos
   ├─ Testar ranking
   └─ Testar IA

5. BUILD & DEPLOY (15 min)
   ├─ npm run build
   └─ git push → Vercel
```

## Dependências Entre Arquivos

```
types.ts
├─ components-example.tsx (LoginForm, PlanCard, etc)
├─ api-routes-example.ts (request/response types)
└─ hooks-customizados.ts (return types)

supabase-schema.sql
├─ api-routes-example.ts (INSERT/SELECT/UPDATE queries)
├─ hooks-customizados.ts (useQuery from)
└─ bncc-skills.json (referenced by seed)

bncc-skills.json
└─ seed/seed-skills.ts → INSERT INTO skills

package.json
└─ Todos os arquivos .ts/.tsx importam do

.env.local
├─ lib/supabase.ts (NEXT_PUBLIC_SUPABASE_URL)
├─ api-routes-example.ts (NVIDIA_API_KEY)
└─ components-example.tsx (auth)

components-example.tsx
└─ exemplo-pagina-*.tsx (usado em páginas)

hooks-customizados.ts
├─ components-example.tsx (useAuth em LoginForm)
└─ exemplo-pagina-*.tsx (todos usam hooks)

api-routes-example.ts
├─ hooks-customizados.ts (fetch para /api/*)
└─ componentes (chamam via hooks)

exemplo-pagina-*.tsx
├─ components-example.tsx (ui)
├─ hooks-customizados.ts (dados)
└─ types.ts (tipos)
```

## Leitura Recomendada por Perfil

### 👨‍💼 Gestor/PM
1. README.md - Overview geral
2. RESUMO-PROJETO.md - Features e stats
3. project-structure.md - Arquitetura

### 👨‍💻 Desenvolvedor Frontend
1. IMPLEMENTATION-GUIDE.md - Setup
2. types.ts - Tipos que vai usar
3. components-example.tsx - Componentes
4. exemplo-pagina-*.tsx - Exemplos práticos
5. hooks-customizados.ts - Como buscar dados

### 🗄️ Desenvolvedor Backend/DB
1. supabase-schema.sql - Schema completo
2. api-routes-example.ts - Rotas implementadas
3. bncc-skills.json - Dados de skills
4. FLUXO-ARQUITETURA.md - Fluxos de dados

### 🚀 DevOps/Infra
1. .env.example - Variáveis
2. package.json - Dependências
3. IMPLEMENTATION-GUIDE.md - Deploy Vercel

## Checklist de Leitura

- [ ] README.md (entender projeto)
- [ ] IMPLEMENTATION-GUIDE.md (saber como começar)
- [ ] types.ts (conhecer tipos)
- [ ] supabase-schema.sql (entender DB)
- [ ] components-example.tsx (ver componentes)
- [ ] api-routes-example.ts (ver rotas)
- [ ] hooks-customizados.ts (ver padrão)
- [ ] exemplo-pagina-*.tsx (ver implementação)
- [ ] FLUXO-ARQUITETURA.md (visualizar fluxos)
- [ ] Criar seu próprio plano de ação

---

**Todos os arquivos estão interconnectados e prontos para uso!**
