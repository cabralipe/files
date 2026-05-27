# 🔐 Autenticação Supabase - BNCC Platform

## ✅ O que foi implementado:

- ✅ Hook `useAuth()` para gerenciar autenticação
- ✅ Página de Login (`/auth/login`)
- ✅ Página de Signup (`/auth/signup`)
- ✅ Dashboard protegido (`/dashboard`)
- ✅ Botões de auth na página inicial
- ✅ Logout functionality

---

## 🚀 Como usar:

### 1. Acessar a página inicial
```
http://localhost:3000
```

### 2. Criar uma conta
- Clique em "Cadastro"
- Preencha nome, email e senha
- Confirme a senha
- Clique em "Criar Conta"

### 3. Fazer login
- Clique em "Login"
- Digite seu email e senha
- Clique em "Fazer Login"
- Você será redirecionado para `/dashboard`

### 4. Acessar Dashboard
- Após login, você verá o dashboard com suas informações
- Clique em "Sair" para fazer logout

---

## 📁 Arquivos criados:

```
app/
├── auth/
│   ├── login/page.tsx      # Página de login
│   └── signup/page.tsx     # Página de cadastro
├── dashboard/
│   └── page.tsx            # Dashboard protegido
└── page.tsx                # Página inicial (atualizada)

hooks/
└── useAuth.ts              # Hook de autenticação
```

---

## 🔧 Hook useAuth() - API:

```typescript
const {
  user,              // Usuário atual (null se não autenticado)
  loading,           // Está carregando?
  error,             // Mensagem de erro
  isAuthenticated,   // Booleano
  signUp,            // Função para cadastro
  signIn,            // Função para login
  signOut,           // Função para logout
  resetPassword,     // Função para reset de senha
} = useAuth()
```

---

## 💡 Como usar o hook em componentes:

```typescript
'use client'

import { useAuth } from '@/hooks/useAuth'

export function MyComponent() {
  const { user, signOut, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <p>Você precisa estar logado</p>
  }

  return (
    <div>
      <p>Bem-vindo, {user?.email}!</p>
      <button onClick={signOut}>Sair</button>
    </div>
  )
}
```

---

## 🛡️ Proteção de rotas (Middleware):

Para criar rotas protegidas, use o hook:

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function ProtectedPage() {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()

  if (!loading && !isAuthenticated) {
    router.push('/auth/login')
    return null
  }

  return <div>Conteúdo protegido</div>
}
```

---

## 🔑 Próximas melhorias:

- [ ] Email de confirmação
- [ ] Reset de senha funcional
- [ ] Profile picture upload
- [ ] Autenticação com Google/GitHub
- [ ] Two-factor authentication
- [ ] Refresh token automático

---

## 📝 Testes:

1. ✅ Criar uma conta
2. ✅ Fazer login
3. ✅ Acessar dashboard
4. ✅ Fazer logout
5. ✅ Tentar acessar dashboard sem login (deve redirecionar)

---

**Autenticação implementada com sucesso! 🎉**
