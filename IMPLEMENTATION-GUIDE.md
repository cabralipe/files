# 📋 Guia de Implementação - BNCC Platform

Passo a passo detalhado para colocar a plataforma em produção.

## Fase 1: Setup Inicial (30 min)

### 1.1 Criar Projeto Next.js

```bash
npx create-next-app@latest bncc-platform --typescript --tailwind --app
cd bncc-platform
```

### 1.2 Instalar Dependências

```bash
npm install \
  @supabase/supabase-js \
  @supabase/auth-helpers-nextjs \
  zustand \
  @tanstack/react-query \
  react-hook-form \
  @hookform/resolvers \
  zod \
  react-hot-toast \
  lucide-react \
  recharts \
  date-fns
```

### 1.3 Criar Estrutura de Pastas

```bash
mkdir -p app/{auth,dashboard,api}
mkdir -p components/{auth,planos,experiencias,ranking,common,ia}
mkdir -p lib types migrations seed public/{logo,images}
mkdir -p styles
```

## Fase 2: Supabase Setup (20 min)

### 2.1 Criar Projeto Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Create new project
3. Nome: `bncc-platform`
4. Database password: salve em local seguro
5. Espere inicializar (3-5 min)

### 2.2 Executar Schema SQL

1. Vá para SQL Editor
2. Novo query
3. Cole o conteúdo do arquivo `supabase-schema.sql`
4. Clique "Run"
5. Verifique tabelas em "Table Editor"

### 2.3 Configurar Auth

1. Vá para Authentication → Providers
2. Enable "Email"
3. Configure email templates (opcional)
4. Vá para URL Configuration
5. Adicione `http://localhost:3000` (dev)
6. Adicione seu domínio de produção

## Fase 3: Configurar Variáveis (10 min)

### 3.1 Obter Credenciais Supabase

1. Settings → API
2. Copie:
   - `Project URL` → NEXT_PUBLIC_SUPABASE_URL
   - `anon public key` → NEXT_PUBLIC_SUPABASE_ANON_KEY
   - `service_role key` → SUPABASE_SERVICE_KEY (nunca exponha!)

### 3.2 Obter Chave NVIDIA

1. Acesse [nvidia.com/nim](https://www.nvidia.com/en-us/ai-data-center/generative-ai/)
2. Sign up (gratuito)
3. Crie API Key
4. Copie → NVIDIA_API_KEY

### 3.3 Criar `.env.local`

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-aqui
SUPABASE_SERVICE_KEY=sua-service-key

# NVIDIA
NVIDIA_API_KEY=sua-chave-aqui

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Fase 4: Implementar Componentes (2-3 horas)

### 4.1 Estrutura Base

Copie os componentes de `components-example.tsx` para suas pastas:

```
components/
├── auth/
│   ├── LoginForm.tsx
│   └── SignupForm.tsx
├── planos/
│   ├── PlanoForm.tsx
│   ├── PlanoCard.tsx
│   └── SkillSelector.tsx
├── experiencias/
│   ├── ExperienciaForm.tsx
│   └── ExperienciaCard.tsx
├── ranking/
│   ├── RankingTable.tsx
│   └── PodiumLeaders.tsx
└── common/
    ├── Header.tsx
    └── StatCard.tsx
```

### 4.2 Criar Páginas

**app/page.tsx** - Landing page
```tsx
export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800">
      <div className="container mx-auto px-4 py-20">
        <h1 className="text-5xl font-bold text-white mb-6">
          Plataforma BNCC
        </h1>
        <p className="text-xl text-blue-100 mb-8">
          Crie e compartilhe planos de aula inovadores com IA
        </p>
        <div className="flex gap-4">
          <Link href="/auth/login" className="btn btn-primary">
            Entrar
          </Link>
          <Link href="/auth/signup" className="btn btn-secondary">
            Cadastre-se
          </Link>
        </div>
      </div>
    </main>
  );
}
```

**app/(dashboard)/dashboard/page.tsx**
```tsx
import { StatsCards, RecentActivity } from '@/components/dashboard';

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <StatsCards />
      <RecentActivity />
    </div>
  );
}
```

### 4.3 Implementar Layout com Sidebar

**app/(dashboard)/layout.tsx**
```tsx
import { Sidebar } from '@/components/common/Sidebar';
import { Header } from '@/components/common/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
```

## Fase 5: Implementar API Routes (2 horas)

### 5.1 Criar Helpers

**lib/supabase.ts**
```tsx
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
```

### 5.2 Implementar API Routes

Use os exemplos de `api-routes-example.ts`:

- `app/api/auth/login/route.ts`
- `app/api/auth/signup/route.ts`
- `app/api/planos/route.ts`
- `app/api/planos/[id]/route.ts`
- `app/api/experiencias/route.ts`
- `app/api/ranking/route.ts`
- `app/api/nvidia/ia-suggestions/route.ts`

## Fase 6: Seed de Dados (5 min)

### 6.1 Inserir Habilidades BNCC

**seed/seed-skills.ts**
```tsx
import { supabaseAdmin } from '@/lib/supabase';
import skillsData from '@/bncc-skills.json';

async function seedSkills() {
  const { error } = await supabaseAdmin
    .from('skills')
    .insert(skillsData.skills);

  if (error) {
    console.error('Erro ao seed skills:', error);
  } else {
    console.log('Skills inseridas com sucesso!');
  }
}

seedSkills();
```

### 6.2 Executar Seed

```bash
npm run seed
```

## Fase 7: Testar Localmente (1 hora)

### 7.1 Rodar Dev Server

```bash
npm run dev
```

Acesse `http://localhost:3000`

### 7.2 Testar Fluxos

**Fluxo 1: Autenticação**
- [ ] Ir para /auth/signup
- [ ] Criar conta
- [ ] Receber email de confirmação (Supabase)
- [ ] Fazer login
- [ ] Acessar dashboard

**Fluxo 2: Criar Plano**
- [ ] Ir para /dashboard/planos/criar
- [ ] Preencher formulário
- [ ] Selecionar habilidades
- [ ] Publicar plano
- [ ] Verificar pontos (+10)

**Fluxo 3: IA**
- [ ] Editar plano
- [ ] Pedir sugestão de IA
- [ ] Verificar sugestão aparecendo
- [ ] Verificar pontos (+5)

**Fluxo 4: Ranking**
- [ ] Ir para /dashboard/ranking
- [ ] Ver podium
- [ ] Ver lista completa

**Fluxo 5: Experiências**
- [ ] Ir para /dashboard/experiencias/criar
- [ ] Criar experiência exitosa
- [ ] Verificar pontos (+25)
- [ ] Dar like em experiência

## Fase 8: Deploy Vercel (15 min)

### 8.1 Preparar GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/seu-usuario/bncc-platform.git
git push -u origin main
```

### 8.2 Setup Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Import repositório GitHub
3. Adicione variáveis de ambiente:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_KEY
   - NVIDIA_API_KEY
4. Deploy

### 8.3 Configurar Domínio

1. Vá para Settings → Domains
2. Adicione seu domínio (opcional)
3. Siga instruções DNS

## Fase 9: Configurar Produção Supabase

### 9.1 URL Configuration

1. Vá para Authentication → URL Configuration
2. Adicione URL de produção (seu domínio Vercel)

### 9.2 RLS Double-check

1. Vá para Authentication → Policies
2. Verifique todas as políticas estão habilitadas

### 9.3 Backup Automático

1. Vá para Project Settings → Backup
2. Ative backups automáticos

## Checklist Final

- [ ] Variáveis de ambiente configuradas
- [ ] Schema SQL executado
- [ ] Skills BNCC inseridas
- [ ] Componentes implementados
- [ ] API routes testadas
- [ ] Auth funcionando
- [ ] Ranking funcionando
- [ ] IA integrando
- [ ] Responsividade OK
- [ ] Deploy Vercel OK
- [ ] Domínio configurado (opcional)
- [ ] Backups configurados
- [ ] SSL/HTTPS ativo

## Próximos Passos

1. **Integração com Escolas**: Adicionar sistema de convite de escolas
2. **Notificações**: Implementar email e push notifications
3. **Analytics**: Adicionar Plausible Analytics
4. **SEO**: Implementar metadados dinâmicos
5. **Testes**: Adicionar testes com Jest + Testing Library

## Suporte

Dúvidas? Consulte:
- Documentação Supabase: supabase.com/docs
- Documentação Next.js: nextjs.org/docs
- NVIDIA NIM: nvidia.com/nim
