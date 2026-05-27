# 🧪 Guia de Testes - BNCC Platform

## Testes Unitários

### Executar Testes
```bash
npm run test
```

### Testes com Coverage
```bash
npm run test:coverage
```

### Modo Watch
```bash
npm run test:watch
```

---

## Testes E2E (End-to-End)

### Com Playwright
```bash
npm run test:e2e
```

### Modo Debug
```bash
npm run test:e2e -- --debug
```

### Específico
```bash
npm run test:e2e auth.spec.ts
```

---

## Testes Manuais - Checklist

### 1. Autenticação
- [ ] Signup com email válido
  - [ ] Validação de email
  - [ ] Validação de senha forte
  - [ ] Confirmação de email (se habilitado)
  
- [ ] Login com credenciais corretas
  - [ ] Redireciona para dashboard
  - [ ] Token salvo no localStorage

- [ ] Logout
  - [ ] Limpa token
  - [ ] Redireciona para home

- [ ] Recuperação de senha
  - [ ] Email enviado
  - [ ] Link válido por 24h

### 2. Planos de Aula

- [ ] Criar plano
  - [ ] Título obrigatório
  - [ ] Descrição opcional
  - [ ] Seletor de skills BNCC
  - [ ] +10 pontos ganhos
  - [ ] Redireciona para detalhe

- [ ] Editar plano
  - [ ] Carrega dados atuais
  - [ ] Salva alterações
  - [ ] Mostra timestamp atualizado

- [ ] Deletar plano
  - [ ] Pede confirmação
  - [ ] Remove da lista
  - [ ] Remove do banco

- [ ] Gerar PDF
  - [ ] Download do arquivo
  - [ ] Contém todas as infos
  - [ ] Formatado corretamente

### 3. Sugestões de IA

- [ ] Solicitar sugestão
  - [ ] Carrega enquanto processa
  - [ ] Mostra 3+ sugestões
  - [ ] +5 pontos ganhos

- [ ] Inserir sugestão no plano
  - [ ] Adiciona ao conteúdo
  - [ ] Salva automaticamente

### 4. Ranking

- [ ] Página carrega
  - [ ] Top 3 com pódio visual
  - [ ] Tabela completa com 10+ posições
  - [ ] Mostra posição do usuário

- [ ] Atualização em tempo real
  - [ ] Refresh manual funciona
  - [ ] Auto-refresh a cada 5 min (opcional)

### 5. Experiências Exitosas

- [ ] Listar experiências
  - [ ] Cards com 3+ exemplos
  - [ ] Filtros funcionam
  - [ ] Paginação OK

- [ ] Publicar experiência
  - [ ] Título obrigatório
  - [ ] Upload de imagens
  - [ ] Seleção de skills
  - [ ] +25 pontos ganhos

- [ ] Like/Unlike
  - [ ] Contador atualiza
  - [ ] Autor ganha +1 ponto
  - [ ] Visual muda (coração cheio/vazio)

### 6. Dashboard

- [ ] Carrega estatísticas
  - [ ] Pontos corretos
  - [ ] Planos contados
  - [ ] Experiências contadas
  - [ ] Ranking atualizado

- [ ] Feed de atividade
  - [ ] Mostra últimos 5 eventos
  - [ ] Pontos ganhos corretos
  - [ ] Timestamps corretos

- [ ] Badges
  - [ ] Desbloqueados aparecem
  - [ ] Bloqueados opacificados
  - [ ] Hover mostra dica

### 7. Responsividade

- [ ] Desktop (1920px+)
  - [ ] Layout correto
  - [ ] Sem scroll horizontal

- [ ] Tablet (768px)
  - [ ] Elementos adaptados
  - [ ] Toque funciona

- [ ] Mobile (375px)
  - [ ] Legível
  - [ ] Botões maiores
  - [ ] Sem elementos sobrepostos

### 8. Performance

- [ ] Carregamento inicial < 3s
- [ ] Navegação entre páginas < 1s
- [ ] Imagens otimizadas (< 100KB)
- [ ] Score Lighthouse > 90

### 9. Acessibilidade

- [ ] Teclado navegável
  - [ ] Tab funciona
  - [ ] Enter em inputs
  - [ ] Escape fecha modais

- [ ] Leitores de tela
  - [ ] Imagens têm alt text
  - [ ] Botões têm labels
  - [ ] Headings hierárquicos

- [ ] Contraste
  - [ ] Texto legível
  - [ ] Mínimo AA (4.5:1)

---

## Testes de Carga

### Com Artillery
```bash
npm install -g artillery

artillery run load-test.yml
```

### load-test.yml
```yaml
config:
  target: "https://seu-dominio.com"
  phases:
    - duration: 60
      arrivalRate: 10

scenarios:
  - name: "User Flow"
    flow:
      - get:
          url: "/api/ranking"
      - post:
          url: "/api/planos"
          json:
            title: "Test Plan"
```

---

## Testes de Segurança

### OWASP Top 10
- [ ] SQL Injection - Zod validation
- [ ] XSS - React auto-escape
- [ ] CSRF - SameSite cookies
- [ ] Authentication - JWT válido
- [ ] Sensitive Data - HTTPS only
- [ ] Access Control - RLS ativado
- [ ] Misconfiguration - Headers corretos
- [ ] Components - Dependências atualizadas

### Verificar Headers
```bash
curl -i https://seu-dominio.com | grep -i "x-"
```

Esperado:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

---

## Testes de Integração

### Supabase
```bash
npm run test:db
```

Verifica:
- [ ] Conexão BD OK
- [ ] Migrations aplicadas
- [ ] RLS policies ativas
- [ ] Índices criados

### NVIDIA API
```bash
npm run test:ia
```

Verifica:
- [ ] API key válida
- [ ] Endpoint acessível
- [ ] Respostas completas
- [ ] Sem timeout

---

## Bug Reporting

### Ao encontrar bug:
1. Descreva passos para reproduzir
2. Resultado esperado vs atual
3. Screenshots/vídeos
4. Navegador e OS
5. Logs do console (DevTools → F12)

### Exemplo
```
Título: Não consegue salvar plano com 2 skills

Passos:
1. Crie novo plano
2. Adicione 2 skills
3. Clique Salvar

Esperado: Plano é salvo com 2 skills
Atual: Erro "Algo deu errado"

Logs: [paste console error]
```

---

## Regressão Testing

### Antes de Deploy
```bash
# Testes críticos
npm run test:critical

# Full suite
npm run test:full

# E2E completo
npm run test:e2e
```

### Checklist de Regressão
- [ ] Login/Logout
- [ ] CRUD de Planos
- [ ] IA funciona
- [ ] Ranking atualiza
- [ ] Experiências carregam
- [ ] Pontos contam
- [ ] Dashboard mostra dados

---

## Performance Profiling

### Chrome DevTools
1. Abra DevTools (F12)
2. Performance tab
3. Clique Record
4. Navegue/Interaja
5. Stop
6. Analise flame charts

### Targets
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1

---

## Monitoramento em Produção

### Sentry Dashboard
1. Acesse sentry.io
2. Veja erros em tempo real
3. Configure alertas
4. Análise de stack traces

### Vercel Analytics
1. Vercel → Analytics
2. Veja Core Web Vitals
3. Performance trends
4. User sessions

---

## Testes Automatizados CI/CD

### GitHub Actions
Executados em cada push:
```bash
# Lint
npm run lint

# Type check
npm run typecheck

# Tests
npm run test

# Build
npm run build
```

---

## Score de Qualidade

| Métrica | Target | Atual |
|---------|--------|-------|
| Test Coverage | 80% | _ |
| Lighthouse | 90+ | _ |
| Bundle Size | < 200KB | _ |
| Accessibility | 95+ | _ |
| Security | A | _ |

---

**Última atualização**: Maio 2026
