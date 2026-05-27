# 🚀 Guia Completo de Setup - BNCC Platform

## Fase 1: Preparação (5 minutos)

### 1.1 Pré-requisitos
- [ ] Node.js 18+ instalado (`node --version`)
- [ ] npm instalado (`npm --version`)
- [ ] Git instalado
- [ ] Conta GitHub (para clonar repo)
- [ ] Conta Supabase
- [ ] API Key NVIDIA (gratuita)

### 1.2 Crie Pastas
```bash
mkdir bncc-platform
cd bncc-platform
```

---

## Fase 2: Setup Supabase (10 minutos)

### 2.1 Crie Projeto Supabase
1. Vá para https://supabase.com
2. Clique "New Project"
3. Nome: `bncc-platform`
4. Região: Escolha a mais próxima (ex: São Paulo)
5. Senha: Guarde em local seguro
6. Clique "Create new project"

### 2.2 Copie Credentials
1. Projeto criado → Menu esquerdo → Settings
2. API Settings
3. Copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_KEY`

### 2.3 Execute Migrations
1. No Supabase: SQL Editor → New Query
2. Cole o conteúdo de `migrations/001_create_tables.sql`
3. Execute (play button)
4. Repita com `migrations/002_create_indexes.sql`

---

## Fase 3: Setup Local (15 minutos)

### 3.1 Clone o Repositório
```bash
git clone https://github.com/seu-usuario/bncc-platform.git
cd bncc-platform
```

### 3.2 Instale Dependências
```bash
npm install
# Isso pode levar 2-3 minutos...
```

### 3.3 Configure Environment
```bash
# Copie o arquivo de exemplo
cp .env.local.example .env.local

# Edite .env.local:
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_KEY=xxxxx
NVIDIA_API_KEY=xxxxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3.4 Rode Localmente
```bash
npm run dev
```

Acesse: **http://localhost:3000**

---

## Fase 4: Setup NVIDIA IA (5 minutos)

### 4.1 Obtenha API Key NVIDIA
1. Vá para https://www.nvidia.com/en-us/ai-on-nvidia/
2. Clique "Get Free API Key"
3. Login com GitHub ou Google
4. Copie a API Key

### 4.2 Configure em .env.local
```bash
NVIDIA_API_KEY=nvapi-xxxxxxxxxxxxx
NVIDIA_API_URL=https://integrate.api.nvidia.com/
```

---

## Fase 5: Seed de Dados (5 minutos)

### 5.1 Popular Skills BNCC
```bash
# Executar seed
npm run seed

# Isso vai:
# - Criar 45+ skills BNCC
# - Criar 5 usuários de exemplo
# - Criar 10 planos de exemplo
# - Criar 3 experiências exemplo
```

### 5.2 Verifique no Supabase
1. Supabase → Table Editor
2. Veja as tabelas preenchidas:
   - `skills`: 45+ registros
   - `users`: 5 usuários
   - `plans`: 10 planos
   - `successful_experiences`: 3 experiências

---

## Fase 6: Testes Locais (10 minutos)

### 6.1 Faça Login
```
Email: professor1@example.com
Senha: Test123!@#
```

### 6.2 Teste Features
- [ ] Vejo meu dashboard
- [ ] Crio um novo plano
- [ ] Adiciono habilidades BNCC
- [ ] Solicito sugestão IA
- [ ] Vejo ranking
- [ ] Vejo experiências exitosas
- [ ] Dou like em experiência

### 6.3 Checklist Completo
- [ ] Sistema de autenticação funcionando
- [ ] Criar/editar planos OK
- [ ] Sugestões IA funcionando
- [ ] Ranking atualizado
- [ ] Experiências carregando
- [ ] Pontos sendo contados

---

## Fase 7: Deploy (20 minutos)

### 7.1 Push para GitHub
```bash
git add .
git commit -m "Initial BNCC Platform setup"
git push origin main
```

### 7.2 Deploy na Vercel
1. Vá para https://vercel.com
2. Clique "New Project"
3. Selecione seu repo BNCC Platform
4. Clique "Import"
5. Configure Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
   - `NVIDIA_API_KEY`
6. Clique "Deploy"
7. Aguarde 3-5 minutos

### 7.3 Acesse Projeto
Vercel mostrará URL: `https://seu-projeto.vercel.app`

---

## Fase 8: Verificação Final

### 8.1 Teste Produção
- [ ] Acesso login: ✅
- [ ] Dashboard carrega: ✅
- [ ] IA funciona: ✅
- [ ] Ranking atualizado: ✅

### 8.2 Monitoramento
- Vercel Analytics → Acompanhe performance
- Supabase → Veja database metrics
- Configurar notificações de erro

---

## ⚠️ Troubleshooting

### "Cannot find module"
```bash
rm -rf node_modules
npm install
```

### "NEXT_PUBLIC_SUPABASE_URL not set"
- Verifique `.env.local`
- Restart `npm run dev`

### "Supabase connection refused"
- Verifique URL e keys
- Supabase project ativo?

### "NVIDIA API error"
- Cheque API key válida
- Limite de requisições atingido?
- Aguarde e tente novamente

### "Port 3000 already in use"
```bash
npm run dev -- -p 3001
```

---

## 📚 Próximos Passos

### Fase 9: Customização
1. Altere logo e cores
2. Configure nome da escola
3. Personalize emails
4. Adicione mais skills BNCC
5. Configure domínio customizado

### Fase 10: Marketing
1. Email para professores
2. Página de marketing
3. Integração com escolas
4. Blog de dicas
5. Comunidade online

---

## 🎯 Checklist Final

- [ ] ✅ Supabase criado e rodando
- [ ] ✅ Local funcionando em http://localhost:3000
- [ ] ✅ NVIDIA IA integrada
- [ ] ✅ Dados de seed carregados
- [ ] ✅ Todos os testes passando
- [ ] ✅ Deployed na Vercel
- [ ] ✅ Domínio customizado (opcional)
- [ ] ✅ SSL/HTTPS ativo
- [ ] ✅ Monitoramento configurado
- [ ] ✅ Backups Supabase ativados

---

**Tempo total estimado: ~1.5 horas**

Qualquer dúvida? Consulte README-BNCC.md ou abra issue no GitHub!
