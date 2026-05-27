# 🔗 API Documentation - BNCC Platform

## Base URL
```
http://localhost:3000/api
```

---

## 📊 Endpoints

### 1️⃣ Points (Pontos)

#### POST `/api/points` - Adicionar Pontos
Adiciona pontos a um usuário e registra a transação.

**Request:**
```json
{
  "userId": "user-id",
  "points": 10,
  "reason": "Criou uma experiência"
}
```

**Response:**
```json
{
  "success": true,
  "message": "10 pontos adicionados",
  "newPoints": 50
}
```

#### GET `/api/points?userId=user-id&limit=50` - Histórico de Pontos
Obtém o histórico de transações de pontos do usuário.

**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "id": "trans-id",
      "user_id": "user-id",
      "points": 10,
      "reason": "Criou uma experiência",
      "created_at": "2026-05-26T10:00:00Z"
    }
  ]
}
```

---

### 2️⃣ Ranking

#### GET `/api/ranking?limit=100&userId=user-id` - Obter Ranking
Retorna o ranking global de usuários por pontos.

**Response:**
```json
{
  "success": true,
  "ranking": [
    {
      "id": "user-id",
      "name": "João Silva",
      "email": "joao@email.com",
      "points": 1000,
      "rank": 1
    }
  ],
  "userPosition": {
    "id": "user-id",
    "name": "João Silva",
    "rank": 1,
    "points": 1000
  },
  "total": 10
}
```

---

### 3️⃣ Profile (Perfil)

#### GET `/api/profile?userId=user-id` - Obter Perfil
Retorna os dados do perfil do usuário.

**Response:**
```json
{
  "success": true,
  "profile": {
    "id": "user-id",
    "email": "user@email.com",
    "name": "João Silva",
    "bio": "Apaixonado por tecnologia",
    "avatar_url": "https://...",
    "points": 50,
    "created_at": "2026-05-01T00:00:00Z"
  }
}
```

#### PUT `/api/profile` - Atualizar Perfil
Atualiza os dados do perfil do usuário.

**Request:**
```json
{
  "userId": "user-id",
  "name": "João Silva",
  "bio": "Nova bio",
  "avatar_url": "https://..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Perfil atualizado com sucesso",
  "profile": { ... }
}
```

---

### 4️⃣ Experiences (Experiências)

#### GET `/api/experiences?userId=user-id&limit=20` - Listar Experiências
Retorna as experiências de um usuário.

**Response:**
```json
{
  "success": true,
  "experiences": [
    {
      "id": "exp-id",
      "user_id": "user-id",
      "title": "Aprendi React Hooks",
      "description": "Experiência prática com hooks",
      "created_at": "2026-05-26T10:00:00Z"
    }
  ]
}
```

#### POST `/api/experiences` - Criar Experiência
Cria uma nova experiência para o usuário.

**Request:**
```json
{
  "userId": "user-id",
  "title": "Aprendi React Hooks",
  "description": "Experiência prática com hooks",
  "skillIds": ["skill-id-1", "skill-id-2"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Experiência criada com sucesso",
  "experience": { ... },
  "pointsEarned": 10
}
```

---

### 5️⃣ Skills

#### GET `/api/skills?category=Matemática&limit=100` - Listar Skills
Retorna a lista de skills disponíveis.

**Response:**
```json
{
  "success": true,
  "skills": [
    {
      "id": "skill-id",
      "name": "Operações Básicas",
      "code": "operacoes-basicas",
      "description": "Adição, subtração, multiplicação e divisão",
      "category": "Matemática"
    }
  ]
}
```

---

## 🔒 Segurança

- ✅ Todas as APIs usam **autenticação Supabase**
- ✅ **RLS Policies** protegem os dados
- ✅ **Service Role Key** usado no servidor
- ✅ **Anon Key** usado no cliente

---

## 📡 Como usar as APIs

### Exemplo com Fetch:

```javascript
// Obter ranking
const response = await fetch('/api/ranking?limit=100')
const data = await response.json()
console.log(data.ranking)
```

### Exemplo com Axios:

```javascript
import axios from 'axios'

// Adicionar pontos
const response = await axios.post('/api/points', {
  userId: 'user-123',
  points: 10,
  reason: 'Criou uma experiência'
})
console.log(response.data.message)
```

### Exemplo no Hook:

```typescript
const addPointsToUser = async (userId: string, points: number) => {
  const response = await fetch('/api/points', {
    method: 'POST',
    body: JSON.stringify({
      userId,
      points,
      reason: 'Ação do usuário'
    })
  })
  
  const data = await response.json()
  return data
}
```

---

## 🐛 Tratamento de Erros

Todos os endpoints retornam erros no formato:

```json
{
  "error": "Mensagem de erro descritiva"
}
```

**Códigos HTTP:**
- `200` - Sucesso
- `400` - Requisição inválida
- `500` - Erro do servidor

---

### 6️⃣ Likes (Curtidas)

#### POST `/api/likes` - Curtir/Descurtir Experiência
Toggl like status em uma experiência.

**Request:**
```json
{
  "userId": "user-id",
  "experienceId": "exp-id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Like adicionado",
  "liked": true,
  "pointsEarned": 5
}
```

#### GET `/api/likes?experienceId=exp-id&userId=user-id` - Obter Info de Likes
Retorna contagem de likes e status do usuário.

**Response:**
```json
{
  "success": true,
  "likeCount": 10,
  "userLiked": true
}
```

---

### 7️⃣ Comments (Comentários)

#### GET `/api/comments?experienceId=exp-id` - Listar Comentários
Retorna todos os comentários de uma experiência.

**Response:**
```json
{
  "success": true,
  "comments": [
    {
      "id": "comment-id",
      "content": "Ótimo post!",
      "created_at": "2026-05-26T10:00:00Z",
      "user": {
        "id": "user-id",
        "name": "João Silva",
        "email": "joao@email.com",
        "avatar_url": "https://..."
      }
    }
  ]
}
```

#### POST `/api/comments` - Adicionar Comentário
Cria novo comentário em uma experiência.

**Request:**
```json
{
  "userId": "user-id",
  "experienceId": "exp-id",
  "content": "Comentário de até 500 caracteres"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Comentário adicionado",
  "pointsEarned": 2
}
```

#### DELETE `/api/comments` - Deletar Comentário
Remove um comentário (apenas do autor).

**Request:**
```json
{
  "commentId": "comment-id",
  "userId": "user-id"
}
```

---

### 8️⃣ Plans (Planos de Aprendizado)

#### GET `/api/plans?userId=user-id&type=created&limit=20` - Listar Planos
Retorna planos (criados ou inscritos).

**Response:**
```json
{
  "success": true,
  "plans": [
    {
      "id": "plan-id",
      "title": "React Avançado",
      "description": "Domine React em nível profissional",
      "category": "Frontend",
      "difficulty_level": "avancado",
      "duration_hours": 40,
      "created_at": "2026-05-26T10:00:00Z",
      "creator": {
        "id": "user-id",
        "name": "João Silva",
        "avatar_url": "https://..."
      }
    }
  ]
}
```

#### POST `/api/plans` - Criar Plano
Cria novo plano de aprendizado.

**Request:**
```json
{
  "userId": "user-id",
  "title": "React Avançado",
  "description": "Domine React",
  "category": "Frontend",
  "difficulty_level": "avancado",
  "duration_hours": 40,
  "skillIds": ["skill-id-1", "skill-id-2"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Plano criado com sucesso",
  "pointsEarned": 15
}
```

#### POST `/api/plans/enroll` - Inscrever em Plano
Inscreve usuário em um plano.

**Request:**
```json
{
  "userId": "user-id",
  "planId": "plan-id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Inscrito no plano com sucesso",
  "pointsEarned": 10
}
```

---

### 9️⃣ Notifications (Notificações)

#### GET `/api/notifications?userId=user-id&limit=50&unreadOnly=false` - Listar Notificações
Retorna notificações do usuário.

**Response:**
```json
{
  "success": true,
  "notifications": [
    {
      "id": "notif-id",
      "type": "like",
      "title": "Novo like",
      "message": "João curtiu sua experiência",
      "is_read": false,
      "created_at": "2026-05-26T10:00:00Z",
      "actor": {
        "name": "João Silva",
        "avatar_url": "https://..."
      }
    }
  ],
  "unreadCount": 3
}
```

#### PUT `/api/notifications` - Marcar como Lida
Marca uma notificação como lida.

**Request:**
```json
{
  "notificationId": "notif-id",
  "userId": "user-id"
}
```

#### DELETE `/api/notifications` - Deletar Notificação
Remove uma notificação.

---

### 🔟 Search (Busca Global)

#### GET `/api/search?q=react&type=all&limit=10` - Buscar Tudo
Busca skills, experiências, usuários e planos.

**Response:**
```json
{
  "success": true,
  "query": "react",
  "results": {
    "skills": [...],
    "experiences": [...],
    "users": [...],
    "plans": [...]
  }
}
```

---

## 📝 Features Implementadas

- ✅ Likes & Comentários
- ✅ Planos de Aprendizado (CRUD + Enrollment)
- ✅ Notificações (Leitura, Criação, Deleção)
- ✅ Busca Global (Skills, Experiências, Usuários, Planos)

---

**API Documentation - BNCC Platform v2.0**
