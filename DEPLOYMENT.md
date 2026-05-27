# 🚀 Guia de Deploy - BNCC Platform

## Opção 1: Vercel (Recomendado) ⭐

### Passo 1: Prepare o Código
```bash
# Commit tudo
git add .
git commit -m "Ready for production"
git push origin main
```

### Passo 2: Conecte Vercel
1. Acesse https://vercel.com
2. Clique "New Project"
3. Selecione seu repo do GitHub
4. Clique "Import"

### Passo 3: Configure Variáveis
No dashboard Vercel → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
NVIDIA_API_KEY=nvapi-...
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
```

### Passo 4: Deploy
1. Clique "Deploy"
2. Aguarde 3-5 minutos
3. Acesse URL fornecida

**Tempo: 10 minutos**
**Custo: Gratuito (até 100K requisições/mês)**

---

## Opção 2: Cloud Run (Google Cloud)

### Passo 1: Setup Google Cloud
```bash
# Instale Google Cloud SDK
# https://cloud.google.com/sdk/docs/install

gcloud auth login
gcloud config set project seu-projeto-id
```

### Passo 2: Configure Dockerfile
Crie `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY .next ./.next
COPY public ./public

EXPOSE 3000

CMD ["npm", "run", "start"]
```

### Passo 3: Deploy
```bash
gcloud run deploy bncc-platform \
  --source . \
  --platform managed \
  --region us-central1 \
  --set-env-vars NEXT_PUBLIC_SUPABASE_URL=...
```

**Tempo: 15 minutos**
**Custo: Gratuito (2M requisições/mês)**

---

## Opção 3: Railway.app

### Passo 1: Conecte GitHub
1. Acesse https://railway.app
2. Clique "New Project"
3. Selecione seu repo
4. Clique "Deploy"

### Passo 2: Configure Variáveis
Railway → Settings → Environment:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Passo 3: Aguarde Deploy
Automático em 5 minutos

**Tempo: 5 minutos**
**Custo: $5/mês (ou pay-as-you-go)**

---

## Pré-Requisitos para Deploy

- [ ] Variáveis de ambiente definidas
- [ ] Build local testado (`npm run build`)
- [ ] Testes passando (`npm run test`)
- [ ] Migrations Supabase aplicadas
- [ ] Seed de dados carregado
- [ ] Dependências corretas em package.json

---

## Build Checklist

```bash
# Teste build local
npm run build

# Verifi erros
npm run lint

# Execute testes
npm run test
```

---

## Verificação Pós-Deploy

### 1. Acesse a URL
https://seu-projeto.vercel.app

### 2. Teste Features
- [ ] Login funciona
- [ ] Dashboard carrega
- [ ] IA gera sugestões
- [ ] Ranking atualizado
- [ ] Imagens carregam

### 3. Monitore Performance
- Vercel Analytics
- Sentry (erros)
- Supabase Logs

---

## Domínio Customizado

### Vercel
1. Settings → Domains
2. "Add Domain"
3. Configure DNS no seu registrar
4. SSL automático em 24h

### DNS Exemplo
```
CNAME  www  cname.vercel-dns.com
```

---

## Variáveis de Ambiente por Ambiente

### Development (.env.local)
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Production (Vercel)
```
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
NODE_ENV=production
```

### Staging (opcional)
```
NEXT_PUBLIC_APP_URL=https://staging.seu-dominio.com
```

---

## CI/CD com GitHub Actions

### Crie `.github/workflows/deploy.yml`
```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run lint
      - run: npm run test
      - run: npx vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
```

---

## Database Backup

### Supabase Backup Automático
1. Supabase → Settings → Backups
2. Enable "Automated Backups"
3. Escolha frequência (daily/weekly)

### Manual Backup
```bash
# Exporte dados
pg_dump postgresql://... > backup.sql

# Restaure se necessário
psql postgresql://... < backup.sql
```

---

## Rollback

### Se Algo Der Errado
```bash
# Vercel
git revert HEAD~1
git push

# Espere deploy automático
```

### Supabase
1. Vá para Backups
2. Escolha backup anterior
3. Clique "Restore"

---

## Monitoramento em Produção

### Configurar Sentry (Rastreamento de Erros)
```bash
npm install @sentry/nextjs
```

### Configurar em next.config.js
```javascript
withSentryConfig(nextConfig, {
  org: "seu-org",
  project: "seu-projeto",
})
```

### Configurar Vercel Analytics
1. Vercel → Analytics
2. Enable "Web Vitals"
3. Veja performance real

---

## Performance Checks

### Lighthouse Score
1. Chrome DevTools → Lighthouse
2. Alvo: 90+ em todos os scores
3. Performance: ~2s First Contentful Paint

### Bundle Size
```bash
npm run build -- --analyze
```

Target: < 200KB JS (gzipped)

---

## Segurança em Produção

- [ ] HTTPS ativado (automático)
- [ ] CORS configurado
- [ ] Rate limiting ativado
- [ ] Secrets rotacionados
- [ ] Backups automáticos
- [ ] Logs mantidos por 30 dias

---

## Troubleshooting Deploy

### Build Falha
```
Logs → Vercel → Deployment → Show raw logs
```

### Variáveis não carregam
```bash
# Restart deployment
Vercel → Deployments → Redeploy
```

### Database não conecta
1. Verifique URL Supabase
2. Confirme IP allowlist
3. Teste conexão local

---

## Documentação Links

- Vercel: https://vercel.com/docs
- Supabase: https://supabase.com/docs
- Next.js: https://nextjs.org/docs
- Railway: https://docs.railway.app

---

**Status**: ✅ Pronto para produção
**Última atualização**: Maio 2026
