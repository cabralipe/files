# PASSO 5: Create Storage Buckets

## Instruções para criar 4 buckets no Supabase

### Opção 1: Via Interface Supabase (Recomendado)

1. Entre em seu projeto Supabase: https://app.supabase.com
2. Vá para **Storage** (no menu lateral esquerdo)
3. Clique em **Create a new bucket**

Para cada bucket, preencha assim:

#### Bucket 1: `avatars`
- **Name**: `avatars`
- **Public bucket**: ✅ SIM (public)
- **File size limit**: 5 MB
- Click: **Create bucket**

#### Bucket 2: `experience-images`
- **Name**: `experience-images`
- **Public bucket**: ✅ SIM (public)
- **File size limit**: 10 MB
- Click: **Create bucket**

#### Bucket 3: `plan-attachments`
- **Name**: `plan-attachments`
- **Public bucket**: ⬜ NÃO (private)
- **File size limit**: 25 MB
- Click: **Create bucket**

#### Bucket 4: `backups`
- **Name**: `backups`
- **Public bucket**: ⬜ NÃO (private)
- **File size limit**: 100 MB
- Click: **Create bucket**

---

### Opção 2: Via SQL (Alternativa)

Se preferir usar SQL, execute no Supabase SQL Editor:

```sql
-- PASSO 5: Create Storage Buckets

-- Bucket público para avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true);

-- Bucket público para imagens de experiências
INSERT INTO storage.buckets (id, name, public) 
VALUES ('experience-images', 'experience-images', true);

-- Bucket privado para anexos de planos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('plan-attachments', 'plan-attachments', false);

-- Bucket privado para backups
INSERT INTO storage.buckets (id, name, public) 
VALUES ('backups', 'backups', false);
```

**Nota**: Após criar, você pode configurar RLS policies no Storage se necessário.

---

## Verificação

Após criar os buckets, você verá na página Storage:
- ✅ avatars (public)
- ✅ experience-images (public)
- 🔒 plan-attachments (private)
- 🔒 backups (private)

---

## Próximo Passo
Quando terminar, execute **PASSO 6: Configure .env.local**
