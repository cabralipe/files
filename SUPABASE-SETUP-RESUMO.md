# 🎯 Setup Supabase - Arquivos Criados

## ✅ 3 Arquivos de Setup Criados

### 1️⃣ **SUPABASE-SETUP-GUIA.md** (Completo)
Guia passo-a-passo detalhado com:
- ✅ 7 passos completos
- ✅ SQL schema completo (12 tabelas)
- ✅ RLS policies prontas
- ✅ Seeds de skills BNCC
- ✅ Configuração de storage
- ✅ Variáveis de ambiente
- ✅ Teste de conexão
- ✅ Troubleshooting

**Use quando:** Quer entender tudo em detalhes

---

### 2️⃣ **QUICK-START-SUPABASE.md** (Rápido)
Guia express para começar em 10 minutos:
- ✅ 7 passos simplificados
- ✅ Checklist visual
- ✅ Apenas o essencial
- ✅ Links diretos para cada ação
- ✅ Resolução de problemas

**Use quando:** Quer começar AGORA

---

### 3️⃣ **env-local-template.txt** (Template)
Arquivo pronto para copiar/colar:
- ✅ Todas as variáveis necessárias
- ✅ Comentários explicativos
- ✅ Instruções inline
- ✅ Pronto para preencher

**Use quando:** Precisa configurar .env.local

---

## 📊 O Que Está Incluído

### SQL Schema (12 Tabelas)
```
✅ users - Perfis de professores
✅ schools - Dados de escolas
✅ skills - BNCC competências
✅ plans - Planos de aula
✅ plan_skills - Associação plano-skill
✅ successful_experiences - Experiências exitosas
✅ experience_skills - Associação experiência-skill
✅ likes - Sistema de likes
✅ comments - Comentários
✅ points_transactions - Histórico de pontos
✅ rankings - Ranking histórico
✅ newsletter_interests - Contatos da newsletter
```

### RLS Policies (Segurança)
```
✅ Users: Perfil próprio + público
✅ Plans: CRUD do dono
✅ Experiences: Públicas ou do dono
✅ Likes: Qualquer um vê, usuário cria/delete
✅ Comments: Público, autenticado cria
✅ Points: Leitura apenas própria
```

### Storage Buckets (4)
```
✅ avatars - Público (imagens de perfil)
✅ experience-images - Público (imagens de exp.)
✅ plan-attachments - Privado (anexos de planos)
✅ backups - Privado (backups do sistema)
```

### Skills BNCC (Amostra)
```
✅ 24 skills principais para 6º Ano
✅ Cobrindo: Matemática, Ciências, Português, História, Geografia, Educação Física, Artes, Inglês
✅ Fácil expandir com mais skills
```

---

## 🎯 Como Começar

### Opção 1: Rápido ⚡ (10 minutos)
```
1. Leia: QUICK-START-SUPABASE.md
2. Siga os 7 passos
3. Copie .env.local-template.txt
4. PRONTO!
```

### Opção 2: Detalhado 📚 (30 minutos)
```
1. Leia: SUPABASE-SETUP-GUIA.md
2. Entenda cada passo
3. Execute com confiança
4. Teste tudo
5. PRONTO!
```

---

## 📋 Checklist de Execução

### Passo 1: Criar Projeto
- [ ] Acesse [supabase.com](https://supabase.com)
- [ ] Click "New Project"
- [ ] Nome: `bncc-platform`
- [ ] Salve a senha!
- [ ] Region: São Paulo ou sua região
- [ ] Aguarde criação

### Passo 2: Copiar Credenciais
- [ ] Settings > API
- [ ] Copie URL
- [ ] Copie Anon Key
- [ ] Copie Service Role Key

### Passo 3: Executar SQL
- [ ] SQL Editor > New Query
- [ ] Cole o SQL completo
- [ ] Click Run
- [ ] Veja: ✅ "Query executed"

### Passo 4: Importar Skills
- [ ] SQL Editor > New Query
- [ ] Cole INSERT de skills
- [ ] Click Run
- [ ] Veja: `skills_inseridas: 24`

### Passo 5: Criar Buckets
- [ ] Storage > New Bucket
- [ ] avatars (público)
- [ ] experience-images (público)
- [ ] plan-attachments (privado)
- [ ] backups (privado)

### Passo 6: Configurar .env.local
- [ ] Copie env-local-template.txt
- [ ] Renomeie para .env.local
- [ ] Preencha SUPABASE_URL
- [ ] Preencha SUPABASE_ANON_KEY
- [ ] Preencha SERVICE_ROLE_KEY
- [ ] Preencha SUPABASE_DB_PASSWORD

### Passo 7: Testar
- [ ] npm install @supabase/supabase-js
- [ ] npm run dev
- [ ] Acesse http://localhost:3000
- [ ] ✅ Funciona!

---

## 🔐 Segurança (RLS)

Todas as políticas estão configuradas:

```sql
✅ Users:
   - Público pode ver perfil
   - Só dono pode editar

✅ Plans:
   - Só dono vê/edita/deleta
   - Criação apenas autenticado

✅ Experiences:
   - Públicas visíveis para todos
   - Dono vê próprias não-publicadas

✅ Likes & Comments:
   - Todos podem ver
   - Autenticado criar/deletar próprio

✅ Points:
   - Só dono vê próprias transações
```

---

## 💾 Backup & Restore

### Fazer Backup:
```bash
# Supabase Dashboard > Settings > Backups
# Click "Create backup"
# Automático diariamente
```

### Restaurar:
```bash
# Supabase Dashboard > Settings > Backups
# Click "Restore" no backup desejado
```

---

## 📈 Próximos Passos Após Setup

1. ✅ **Supabase está pronto** ← Você está aqui!
2. 📝 **Implementar endpoints** (app/api/)
3. 🧪 **Testar cada endpoint**
4. 🚀 **Deploy na Vercel**

---

## 📞 Suporte Rápido

### Erro: "Service Role Key inválida"
```
✅ Copie do Supabase Dashboard > Settings > API
❌ Certifique-se que é SERVICE_ROLE_KEY (não ANON_KEY)
```

### Erro: "Table does not exist"
```
✅ Verifique se o SQL foi executado
❌ Verifique se viu: "Query executed successfully"
```

### Erro: "RLS policy violation"
```
✅ Certifique-se que está autenticado (JWT token)
❌ Alguns endpoints precisam de auth
```

### Erro: "Skills não foram importadas"
```
✅ Execute o INSERT de skills
❌ Verifique: SELECT COUNT(*) FROM skills;
```

---

## 🎁 Você Tem Agora:

| Item | Arquivo | Status |
|------|---------|--------|
| Setup completo | SUPABASE-SETUP-GUIA.md | ✅ |
| Setup rápido | QUICK-START-SUPABASE.md | ✅ |
| Template .env | env-local-template.txt | ✅ |
| SQL schema | Incluído no guia | ✅ |
| Skills BNCC | Incluído no guia | ✅ |
| RLS policies | Incluído no guia | ✅ |

---

## ⏱️ Timeline

```
Tempo total: 15-30 minutos

Rápido:
5 min - Criar projeto
5 min - Executar SQL
5 min - Configurar .env

Detalhado:
10 min - Criar projeto
10 min - Executar SQL
10 min - Criar buckets
```

---

## 🚀 Comece Agora!

### Opção 1: Rápido
👉 [QUICK-START-SUPABASE.md](QUICK-START-SUPABASE.md)

### Opção 2: Detalhado
👉 [SUPABASE-SETUP-GUIA.md](SUPABASE-SETUP-GUIA.md)

### Opção 3: Template
👉 [env-local-template.txt](env-local-template.txt)

---

**Status:** ✅ Setup pronto para começar!

Após completar: Prossiga com implementação dos endpoints em `app/api/`

