# ⚡ Quick Start: Setup Supabase em 10 Minutos

## 📋 Checklist Rápido

- [ ] Criar projeto Supabase
- [ ] Copiar credenciais
- [ ] Executar SQL schema
- [ ] Importar skills
- [ ] Criar buckets
- [ ] Configurar .env.local
- [ ] Testar conexão
- [ ] PRONTO! ✅

---

## ⏱️ PASSO 1: Criar Projeto (2 min)

### Acesso Rápido:
1. Vá para [supabase.com](https://supabase.com/dashboard)
2. Clique: **"New Project"**
3. Preencha:
   - **Name:** `bncc-platform`
   - **Password:** Salve em um lugar seguro! ⚠️
   - **Region:** `South America (São Paulo)` ou sua região
4. Clique: **"Create new project"**
5. Aguarde 2-3 minutos ⏳

---

## ⏱️ PASSO 2: Copiar Credenciais (1 min)

### No Dashboard do Supabase:

1. Vá para: **Settings > API**
2. Você verá:
   ```
   Project URL: https://xxxxxxxxxxxxx.supabase.co
   Anon Key: eyJ...
   Service Role Key: eyJ...
   ```
3. Salve essas 3 linhas em um arquivo temp

---

## ⏱️ PASSO 3: Executar SQL Schema (3 min)

### No Dashboard:

1. Clique em: **"SQL Editor"** (lado esquerdo)
2. Clique em: **"New Query"**
3. **Cole TODO o conteúdo** deste arquivo SQL:

👉 [Copie todo SQL de aqui](SUPABASE-SETUP-GUIA.md)

4. Clique: **"Run"** (ou Ctrl+Enter)
5. Aguarde até ver: ✅ **"Query executed successfully"**

---

## ⏱️ PASSO 4: Importar Skills BNCC (2 min)

### Novo SQL Query:

1. Clique: **"New Query"**
2. **Cole TODO o SQL de inserção de skills** deste arquivo:

👉 [Copie Skills SQL daqui](SUPABASE-SETUP-GUIA.md)

3. Clique: **"Run"**
4. Deve retornar: `skills_inseridas: 24`

---

## ⏱️ PASSO 5: Criar Buckets (1 min)

### No Dashboard, clique em: **"Storage"**

Crie 4 buckets clicando em **"New bucket"**:

| Nome | Público? | ✅ |
|------|----------|-----|
| `avatars` | ✅ Sim | [ ] |
| `experience-images` | ✅ Sim | [ ] |
| `plan-attachments` | ❌ Não | [ ] |
| `backups` | ❌ Não | [ ] |

---

## ⏱️ PASSO 6: Configurar .env.local (1 min)

### Na raiz do seu projeto:

1. Crie arquivo: `.env.local`
2. Cole o template completo:

👉 [Copie .env.local daqui](env-local-template.txt)

3. Preencha com seus dados:
   ```env
   # Credenciais do Supabase (que você copiou)
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```

---

## ⏱️ PASSO 7: Testar Conexão (1 min)

### Terminal:

```bash
# Instale dependência
npm install @supabase/supabase-js

# Teste a conexão com:
npm run dev
```

### Se tudo funcionou:
✅ Você verá: `Servidor rodando em http://localhost:3000`

---

## 🎉 PRONTO!

Seu Supabase está 100% configurado com:
- ✅ 12 tabelas criadas
- ✅ 24+ skills BNCC importadas
- ✅ RLS configurado para segurança
- ✅ 4 buckets de storage
- ✅ Pronto para usar

---

## 🚀 Próximo Passo:

Implemente os **30 endpoints** seguindo:
- 📄 `ENDPOINTS-PLANOS-COMPLETO.md`
- 📄 `ENDPOINTS-EXPERIENCIAS-COMPLETO.md`
- 📄 Etc...

---

## ❓ Problemas?

### "Erro de conexão ao banco"
```
❌ Verifique se copiou CORRETAMENTE:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
```

### "Skills não foram inseridas"
```
❌ Verifique se executou o SQL de INSERÇÃO
📍 Supabase > SQL Editor > New Query
✅ Deve retornar: skills_inseridas: 24
```

### "Buckets não foram criados"
```
❌ Verifique se marcou "Public" corretamente
📍 Supabase > Storage > New Bucket
✅ avatars e experience-images DEVEM ser públicos
```

---

## 📞 Resumo dos Comandos Essenciais

```bash
# 1. Instalar dependências
npm install @supabase/supabase-js

# 2. Criar .env.local
cp .env.local.example .env.local

# 3. Preencher .env.local com credenciais Supabase

# 4. Rodar localmente
npm run dev

# 5. Testar em http://localhost:3000
```

---

## ✨ Você tem agora:

| Item | Status |
|------|--------|
| Banco de dados | ✅ Pronto |
| 12 Tabelas | ✅ Criadas |
| 24+ Skills | ✅ Importadas |
| RLS Security | ✅ Configurado |
| Storage | ✅ 4 Buckets |
| .env.local | ✅ Preenchido |
| Conexão | ✅ Testada |

**Tempo total:** ~15 minutos ⚡

**Próximo:** Implemente os endpoints! 🚀

