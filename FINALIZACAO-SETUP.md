# 🚀 Finalização do Setup Supabase - BNCC Platform

**Status**: Passos 1-3 ✅ | Faltam passos 4-7

---

## PASSO 4: Import BNCC Skills (2 minutos)

### Instruções:

1. **Abra o Supabase SQL Editor**
   - Vá para: https://app.supabase.com → Seu Projeto
   - Menu lateral: **SQL Editor**
   - Click: **New Query**

2. **Cole o SQL das 24 skills**
   - Abra o arquivo: `PASSO-4-IMPORT-SKILLS.sql`
   - Copie TODO o conteúdo
   - Cole no SQL Editor do Supabase

3. **Execute a query**
   - Tecla: **Ctrl + Enter** (ou click no botão ▶️ Run)
   - Deve aparecer: "Query executed successfully"
   - Resultado esperado: 24 skills inseridas

4. **Verifique o resultado**
   - No canto inferior, você verá as 24 linhas com os IDs das skills

✅ **PASSO 4 Concluído**

---

## PASSO 5: Create Storage Buckets (1 minuto)

### Opção A: Via Interface (Recomendado)

1. **Vá para Storage**
   - https://app.supabase.com → Seu Projeto
   - Menu lateral: **Storage**

2. **Crie 4 buckets seguindo o arquivo**
   - Abra: `PASSO-5-STORAGE-BUCKETS.md`
   - Siga as instruções para cada bucket

3. **Buckets a criar:**
   - ✅ `avatars` (Public)
   - ✅ `experience-images` (Public)
   - 🔒 `plan-attachments` (Private)
   - 🔒 `backups` (Private)

### Opção B: Via SQL (Alternativa)

Se preferir SQL (execute no SQL Editor):

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('experience-images', 'experience-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('plan-attachments', 'plan-attachments', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('backups', 'backups', false);
```

✅ **PASSO 5 Concluído**

---

## PASSO 6: Configure .env.local (1 minuto)

### Instruções:

1. **Localize a raiz do seu projeto BNCC Platform**
   - Pasta do projeto (lado cliente do Next.js)

2. **Copie o arquivo .env.local**
   - Abra: `.env.local` (criado nesta pasta)
   - Copie o conteúdo

3. **Cole na raiz do projeto**
   - Na raiz do BNCC Platform, crie/abra: `.env.local`
   - Cole o conteúdo completo

4. **Verifique as credenciais**
   - `NEXT_PUBLIC_SUPABASE_URL` ✅
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ✅
   - `SUPABASE_SERVICE_ROLE_KEY` ✅ (Copie a chave COMPLETA do Supabase)
   - `DATABASE_URL` ✅

⚠️ **Importante**: Se você recebeu uma chave de serviço incompleta, vá ao Supabase:
- **Settings** → **API** → **Service Role** → **Copy**
- Copie a chave completa

✅ **PASSO 6 Concluído**

---

## PASSO 7: Test Connection (1 minuto)

### Instruções:

1. **Abra o terminal** na raiz do seu projeto BNCC Platform

2. **Instale dependências** (se ainda não tiver feito):
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```

4. **Verifique a conexão**:
   - Abra: http://localhost:3000
   - Você deve ver o aplicativo BNCC Platform rodando
   - Procure por mensagens de erro no console (terminal)

5. **Testes rápidos**:
   - [ ] Página inicial carrega
   - [ ] Pode fazer login (se implementado)
   - [ ] Dados carregam do Supabase
   - [ ] Sem erros de conexão no console

### Se tiver problemas:

**Erro: "Cannot connect to Supabase"**
- Verifique as variáveis de ambiente (.env.local)
- Reinicie o servidor: Ctrl+C, depois `npm run dev`

**Erro: "skills table not found"**
- Verifique se o PASSO 4 foi executado com sucesso

**Erro de CORS**
- Isso é normal no desenvolvimento
- Supabase lida com CORS automaticamente

✅ **PASSO 7 Concluído** - Setup Finalizado!

---

## ✅ RESUMO - Tudo Pronto!

Depois de completar todos os 7 passos, você terá:

- ✅ Projeto Supabase criado
- ✅ Todas as credenciais copiadas
- ✅ Schema SQL executado (12 tabelas)
- ✅ 24 BNCC skills importadas
- ✅ 4 Storage buckets criados
- ✅ Ambiente configurado (.env.local)
- ✅ Conexão testada e funcionando

---

## 📚 Próximos Passos

Após a conclusão:

1. **Implemente features do frontend** (telas, componentes)
2. **Configure autenticação** (signup/login)
3. **Crie APIs/endpoints** conforme necessário
4. **Teste RLS policies** (Row Level Security)
5. **Deploy para produção** quando estiver pronto

---

## 🆘 Suporte

Se algo não funcionar:
1. Verifique as credenciais no `.env.local`
2. Confirme que o SQL foi executado com sucesso
3. Verifique os logs no console do terminal
4. No Supabase, vá para **Logs** para ver erros de servidor

**Boa sorte! 🚀**
