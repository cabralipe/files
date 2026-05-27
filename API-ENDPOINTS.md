# 📡 Documentação de API Endpoints - BNCC Platform

Base URL: `https://seu-dominio.com/api`

## Autenticação

### POST /auth/register
Registrar novo usuário

**Request:**
```json
{
  "email": "professor@escola.com",
  "password": "SecurePass123!",
  "name": "Dra. Maria Silva",
  "school_id": "uuid-da-escola"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "professor@escola.com",
    "name": "Dra. Maria Silva"
  },
  "token": "jwt-token"
}
```

---

### POST /auth/login
Fazer login

**Request:**
```json
{
  "email": "professor@escola.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "user": { ... },
  "token": "jwt-token"
}
```

---

### POST /auth/logout
Fazer logout

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

## Planos de Aula

### GET /planos
Listar todos os planos do usuário

**Query Params:**
- `page=1` (default)
- `limit=10` (default)
- `search=termo` (opcional)

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Introdução à Lógica de Programação",
      "description": "Plano para turma de 6º ano",
      "skills": ["EF06MA01", "EF06MA02"],
      "points": 10,
      "created_at": "2026-05-20T10:00:00Z"
    }
  ],
  "total": 18,
  "page": 1,
  "limit": 10
}
```

---

### POST /planos
Criar novo plano

**Request:**
```json
{
  "title": "Introdução à Lógica de Programação",
  "description": "Plano para turma de 6º ano",
  "content": "Markdown content aqui",
  "skills": ["EF06MA01", "EF06MA02"]
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "title": "...",
  "points_earned": 10,
  "message": "Plano criado com sucesso! +10 pontos"
}
```

---

### GET /planos/:id
Obter detalhes de um plano

**Response (200):**
```json
{
  "id": "uuid",
  "title": "...",
  "description": "...",
  "content": "...",
  "skills": [...],
  "pdf_url": "https://...",
  "author": { "name": "...", "school": "..." },
  "created_at": "...",
  "updated_at": "..."
}
```

---

### PUT /planos/:id
Editar plano

**Request:**
```json
{
  "title": "Novo título",
  "description": "...",
  "content": "..."
}
```

**Response (200):**
```json
{
  "message": "Plano atualizado com sucesso"
}
```

---

### DELETE /planos/:id
Deletar plano

**Response (200):**
```json
{
  "message": "Plano deletado com sucesso"
}
```

---

## Sugestões de IA

### POST /nvidia/ia-suggestions
Gerar sugestões de IA para um plano

**Request:**
```json
{
  "title": "Introdução à Lógica de Programação",
  "skills": ["EF06MA01", "EF06MA02"],
  "grade_level": "6"
}
```

**Response (200):**
```json
{
  "suggestions": [
    {
      "id": 1,
      "activity": "Jogo da Lógica: Ordenar números...",
      "duration": "30 minutos"
    },
    {
      "id": 2,
      "activity": "Desafio de Programação: Crie um padrão...",
      "duration": "45 minutos"
    }
  ],
  "points_earned": 5,
  "message": "+5 pontos por usar IA"
}
```

---

## Experiências Exitosas

### GET /experiencias
Listar experiências exitosas (público)

**Query Params:**
- `page=1`
- `limit=10`
- `category=Programação` (opcional)
- `skill=EF06MA01` (opcional)

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Robótica com Sucata Eletrônica",
      "author": "Prof. João Santos",
      "category": "Programação",
      "skills": ["EF06MA01"],
      "likes": 245,
      "images": ["url1", "url2"],
      "created_at": "..."
    }
  ],
  "total": 156
}
```

---

### POST /experiencias
Publicar nova experiência

**Request:**
```json
{
  "title": "Robótica com Sucata Eletrônica",
  "description": "Como criar robôs com materiais reciclados",
  "category": "Programação",
  "skills": ["EF06MA01"],
  "content": "..."
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "points_earned": 25,
  "message": "Experiência publicada com sucesso! +25 pontos"
}
```

---

### GET /experiencias/:id
Obter detalhes de experiência

**Response (200):**
```json
{
  "id": "uuid",
  "title": "...",
  "description": "...",
  "author": { "name": "...", "school": "..." },
  "category": "...",
  "skills": [...],
  "likes": 245,
  "comments": [
    {
      "author": "...",
      "text": "Ótima ideia!",
      "created_at": "..."
    }
  ],
  "images": [...]
}
```

---

### POST /experiencias/:id/like
Dar like em uma experiência

**Response (200):**
```json
{
  "liked": true,
  "total_likes": 246,
  "author_points_earned": 1,
  "message": "Like registrado"
}
```

---

### POST /experiencias/:id/unlike
Remover like

**Response (200):**
```json
{
  "liked": false,
  "total_likes": 245
}
```

---

## Ranking

### GET /ranking
Obter ranking de professores

**Query Params:**
- `limit=10` (default)
- `page=1` (default)

**Response (200):**
```json
{
  "data": [
    {
      "position": 1,
      "name": "Dra. Maria Silva",
      "school": "EMEF Paulo Freire",
      "points": 2450,
      "badge": "👑"
    },
    {
      "position": 2,
      "name": "Prof. João Santos",
      "school": "EEEP Tech Futuro",
      "points": 2100,
      "badge": "🥈"
    }
  ],
  "total_professors": 347,
  "user_position": 12,
  "user_points": 1240
}
```

---

## Usuários

### GET /usuarios/perfil
Obter perfil do usuário logado

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Dra. Maria Silva",
  "email": "maria@escola.com",
  "school": "EMEF Paulo Freire",
  "points": 1240,
  "ranking_position": 12,
  "plans_count": 18,
  "experiences_count": 5,
  "badges": ["iniciante", "semana-ativa", "10-planos"]
}
```

---

### PUT /usuarios/perfil
Atualizar perfil

**Request:**
```json
{
  "name": "Dra. Maria Silva",
  "bio": "Professora apaixonada por tecnologia",
  "school_id": "uuid-nova-escola"
}
```

**Response (200):**
```json
{
  "message": "Perfil atualizado com sucesso"
}
```

---

## Skills BNCC

### GET /skills
Listar todas as habilidades

**Query Params:**
- `competency=Pensamento Computacional` (opcional)
- `grade_level=6` (opcional)

**Response (200):**
```json
{
  "data": [
    {
      "code": "EF06MA01",
      "name": "Comparar, Ordenar e Representar Números",
      "description": "...",
      "grade_level": "6º",
      "subject": "Matemática",
      "competency": "Pensamento Computacional",
      "axis": "Pensamento Computacional"
    }
  ],
  "total": 45
}
```

---

## Tratamento de Erros

### Erro (400 - Bad Request)
```json
{
  "error": "Invalid request",
  "details": {
    "email": "Email format invalid"
  }
}
```

### Erro (401 - Unauthorized)
```json
{
  "error": "Unauthorized",
  "message": "Token inválido ou expirado"
}
```

### Erro (404 - Not Found)
```json
{
  "error": "Not Found",
  "message": "Plano não encontrado"
}
```

### Erro (500 - Server Error)
```json
{
  "error": "Internal Server Error",
  "message": "Algo deu errado. Tente novamente.",
  "request_id": "uuid-para-suporte"
}
```

---

## Rate Limiting

- **Free tier**: 100 requisições/minuto
- **Autenticado**: 1000 requisições/minuto
- **Header**: `X-RateLimit-Remaining`

---

## Autenticação

Todos os endpoints (exceto `/auth/login`, `/auth/register`) requerem:

```
Authorization: Bearer <jwt-token>
```

---

## Exemplos com cURL

### Login
```bash
curl -X POST https://seu-dominio.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"123456"}'
```

### Criar Plano
```bash
curl -X POST https://seu-dominio.com/api/planos \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Novo Plano",
    "skills":["EF06MA01"]
  }'
```

### Listar Ranking
```bash
curl https://seu-dominio.com/api/ranking
```

---

## Versão da API
- **Versão Atual**: 1.0.0
- **Última Atualização**: Maio 2026

---

**Status**: ✅ Pronto para uso
