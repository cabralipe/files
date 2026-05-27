# 🎓 BNCC Platform - Plataforma de Planos de Aula com IA

Uma plataforma completa para professores criarem, compartilharem e descobrirem planos de aula inovadores, integrando as habilidades da BNCC de Computação. Com sistema de ranking, experiências exitosas compartilhadas e sugestões de IA.

## 📋 Características Principais

### ✨ Funcionalidades

- **👨‍🏫 Gestão de Planos de Aula**
  - Criar, editar e publicar planos de aula
  - Associar habilidades BNCC
  - Gerar PDF do plano
  - Sugestões de IA para melhorias

- **🏆 Sistema de Ranking**
  - Ranking de professores mais ativos
  - Podium visual dos top 3
  - Sistema de pontos por ações:
    - 10 pontos: Criar plano
    - 5 pontos: Usar sugestão de IA
    - 25 pontos: Publicar experiência exitosa
    - 2 pontos: Outro professor usar seu plano
    - 1 ponto: Like em experiência

- **🎯 Experiências Exitosas**
  - Compartilhar projetos, experimentos e cases de sucesso
  - Integração com habilidades BNCC
  - Sistema de likes e comentários
  - Galeria de imagens
  - Filtros por habilidade e grade

- **🤖 IA Integrada**
  - Sugestões usando NVIDIA NIM (Meta Llama 2)
  - Melhoria de planos em tempo real
  - Recomendações personalizadas

- **📊 Dashboard Pessoal**
  - Estatísticas de uso
  - Planos recentes
  - Pontos e badges
  - Metas de aprendizado

## 🚀 Quick Start

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta Supabase
- Chave da API NVIDIA (gratuita)

### 1. Clonar e Instalar

```bash
git clone https://github.com/seu-usuario/bncc-platform.git
cd bncc-platform

npm install
# ou
yarn install
```

### 2. Configurar Variáveis de Ambiente

```bash
cp .env.example .env.local
```

Edite `.env.local` com suas credenciais:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-aqui
SUPABASE_SERVICE_KEY=sua-service-key-aqui
NVIDIA_API_KEY=sua-chave-nvidia-aqui
```

### 3. Setup do Supabase

1. Crie um novo projeto em [supabase.com](https://supabase.com)
2. Vá para SQL Editor
3. Cole o conteúdo de `supabase-schema.sql`
4. Execute o script

### 4. Seed das Habilidades BNCC

```bash
npm run seed
# ou
npx ts-node seed/seed-skills.ts
```

### 5. Rodar Localmente

```bash
npm run dev
```

Acesse `http://localhost:3000`

## 🏗️ Estrutura do Projeto

```
bncc-platform/
├── app/                      # App Router do Next.js
│   ├── (auth)/              # Rutas de autenticação
│   ├── (dashboard)/         # Dashboard e funcionalidades
│   ├── api/                 # API Routes
│   └── layout.tsx
├── components/              # Componentes React
│   ├── auth/               # Forms de login/signup
│   ├── planos/             # Componentes de planos
│   ├── experiencias/       # Componentes de experiências
│   ├── ranking/            # Componentes de ranking
│   └── common/             # Componentes compartilhados
├── lib/                     # Utilitários
│   ├── supabase.ts         # Cliente Supabase
│   ├── hooks.ts            # React Hooks customizados
│   └── utils.ts            # Funções auxiliares
├── types/                   # TypeScript types
├── public/                  # Arquivos estáticos
├── migrations/              # Scripts SQL
└── seed/                    # Seeds de dados
```

## 💾 Schema do Banco de Dados

### Tabelas Principais

- **users** - Professores cadastrados
- **schools** - Escolas participantes
- **skills** - Habilidades BNCC (45+ competências)
- **plans** - Planos de aula criados
- **plan_skills** - Relação M-to-M entre planos e habilidades
- **successful_experiences** - Experiências exitosas compartilhadas
- **experience_skills** - Relação entre experiências e habilidades
- **points_transactions** - Histórico de pontos ganhos
- **likes** - Reações em experiências
- **comments** - Comentários em experiências
- **ranking_view** - View para otimizar queries de ranking

## 🔐 Segurança - RLS (Row Level Security)

Todas as tabelas têm políticas RLS implementadas:

- Usuários veem apenas seus dados pessoais
- Planos publicados são públicos
- Cada usuário pode editar/deletar apenas seus próprios itens
- Skills são read-only

## 🤖 Integração com IA - NVIDIA NIM

A plataforma usa a API gratuita do NVIDIA NIM com modelo Meta Llama 2:

```typescript
POST /api/nvidia/ia-suggestions
{
  "prompt": "Melhorar meu plano de aula sobre geometria",
  "skills": [...],
  "plan_id": "uuid",
  "userId": "uuid"
}
```

**Resposta**: Sugestão de IA + 5 pontos para o usuário

## 📊 Sistema de Pontos

| Ação | Pontos | Descrição |
|------|--------|-----------|
| Criar plano | 10 | Publica um novo plano |
| Sugestão IA | 5 | Usa IA para melhorar plano |
| Experiência compartilhada | 25 | Publica case/projeto exitoso |
| Reuso de plano | 2 | Outro professor usa seu plano |
| Like em experiência | 1 | Recebe like na experiência |

## 🎯 Habilidades BNCC Integradas

A plataforma contém **45+ habilidades** da BNCC Computação, incluindo:

- **Pensamento Computacional**: Decomposição, padrões, abstração, algoritmos
- **Mundo Digital**: Hardware/Software, redes, representação de dados
- **Cultura Digital**: Cidadania, segurança, ética, letramento midiático

Cada habilidade está vinculada a:
- Código BNCC (ex: EF01CP01)
- Grade (1º-5º ano)
- Disciplina (Português, Matemática, Ciências, etc)
- Competência

## 🚀 Deploy no Vercel

```bash
git push origin main
```

A plataforma está configurada para deployment automático no Vercel.

### Variáveis de Ambiente no Vercel

1. Vá para Settings → Environment Variables
2. Adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
   - `NVIDIA_API_KEY`

## 📱 Responsividade

A plataforma é totalmente responsiva:
- Mobile first design
- Tailwind CSS para styling
- shadcn/ui para componentes
- Tested em iOS e Android

## 🔍 Buscas e Filtros

- Planos por grade, disciplina, habilidade
- Experiências por categoria e competência
- Ranking com busca por professor/escola
- Sugestões personalizadas baseadas em histórico

## 📈 Próximas Features

- [ ] Integração com Google Drive para backup
- [ ] Exportação para PowerPoint
- [ ] Certificados de conclusão
- [ ] Notificações por email
- [ ] Análise de impacto de planos
- [ ] Comunidades por disciplina
- [ ] Integração com LMS (Google Classroom, etc)
- [ ] App mobile nativa

## 🤝 Contribuindo

1. Faça um fork
2. Crie uma branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📞 Suporte

Para questões ou problemas:
- Abra uma issue no GitHub
- Email: suporte@bnccplatform.com.br

## 📄 Licença

MIT License - veja LICENSE.md para detalhes

## 👥 Autores

Desenvolvido para a Secretaria Municipal de Educação de Atalaia-AL

---

**Made with ❤️ para educadores que transformam o ensino**
