# BNCC Platform 📚

Uma plataforma inovadora para professores do ensino fundamental criarem, compartilharem e ganharem pontos com planos de aula alinhados à BNCC.

## 🎯 Visão Geral

A BNCC Platform transforma o ensino através de:
- **Planos de Aula Inteligentes**: Crie planos mapeados às 45+ habilidades da BNCC
- **IA Assistant**: Sugestões de atividades alimentadas por IA (NVIDIA NIM)
- **Gamificação**: Sistema de pontos para motivar uso contínuo
- **Comunidade**: Compartilhe experiências exitosas e inspire colegas
- **Ranking**: Competição saudável entre professores

## 🚀 Features Principais

### 1. Autenticação e Perfil
- Signup/Login com email
- Autenticação via Supabase Auth
- Perfil customizável por professor
- Vinculação com escola

### 2. Planos de Aula
- CRUD completo (Criar, Ler, Editar, Deletar)
- Seletor de habilidades BNCC (45+ skills)
- Gerador de PDF
- Sugestões de IA em tempo real

### 3. Experiências Exitosas
- Galeria de projetos/cases de sucesso
- Filtros por habilidade e categoria
- Sistema de likes e comentários
- Upload de imagens

### 4. Sistema de Pontos
- 10 pts: Criar plano
- 5 pts: Usar sugestão IA
- 25 pts: Publicar experiência
- 2 pts: Outro professor usar seu plano
- 1 pt: Receber like

### 5. Ranking e Badges
- Top 10 professores com pódio visual
- Histórico de pontos
- Badges desbloqueáveis

### 6. Dashboard Pessoal
- Estatísticas pessoais
- Feed de atividade
- Progresso de habilidades
- Desafios próximos

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: Zustand + React Context
- **Backend**: Next.js API Routes
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth
- **IA**: NVIDIA NIM API
- **Hosting**: Vercel + Supabase

## 📋 Requisitos

- Node.js 18+
- Conta Supabase
- API Key NVIDIA
- npm ou yarn

## 🚀 Quick Start

### 1. Instale Dependências
```bash
npm install
```

### 2. Configure .env.local
```bash
cp .env.local.example .env.local
# Edite com suas credentials
```

### 3. Setup Supabase
```bash
npm run migrate
```

### 4. Rode Localmente
```bash
npm run dev
# http://localhost:3000
```

## 📊 Estrutura de Dados

- **users**: Professores cadastrados
- **schools**: Escolas participantes
- **skills**: 45+ habilidades BNCC
- **plans**: Planos de aula
- **successful_experiences**: Projetos compartilhados
- **rankings**: Cache de ranking
- **points_transactions**: Histórico de pontos

## 🔐 Segurança

- RLS (Row Level Security) ativada
- Usuários veem apenas seus dados
- Experiências públicas para comunidade
- Admin para gerenciar skills
- Validação de tipos com Zod

## 🌐 Deploy

### Vercel (Recomendado)
1. Push para GitHub
2. Conecte em vercel.com
3. Configure variáveis de ambiente
4. Deploy automático

## 📄 Licença

MIT - Livre para usar comercialmente

## 👨‍💻 Desenvolvedor

Felipe Cabral - felipeenete@gmail.com
