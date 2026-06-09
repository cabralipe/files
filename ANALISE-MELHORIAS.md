# Análise do projeto BNCC Platform — sugestões de melhoria

Stack: Next.js 14 (App Router) + TypeScript + Supabase + OpenAI. ~13k linhas em `app/`, 33 rotas de API, 4 hooks, 9 libs.

A base está **bem estruturada em segurança server-side**. Os pontos abaixo estão ordenados por impacto.

---

## 1. Crítico / rápido de corrigir

### 1.1 `.env.example` não bate com os nomes usados no código
O setup quebra em silêncio porque as variáveis documentadas têm nomes diferentes dos lidos:

| Código usa | `.env.example` diz |
|---|---|
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SERVICE_KEY` |
| `SUPER_ADMIN_EMAIL` / `NEXT_PUBLIC_SUPER_ADMIN_EMAIL` | (ausente) |
| `OPENAI_MODEL` default `gpt-4o-mini` | `gpt-5-nano` |
| (não usado) | `NEXTAUTH_SECRET` — NextAuth não é usado, é Supabase Auth |

Ação: alinhar `.env.example` aos nomes reais e remover o `NEXTAUTH_SECRET`.

### 1.2 Build ignora erros de TypeScript
`next.config.js` tem `typescript: { ignoreBuildErrors: true }`. Isso desliga a checagem de tipos no build — bugs de tipo passam para produção. O `tsc --noEmit` **já passa limpo hoje**, então dá para remover essa flag agora e ganhar a rede de segurança de volta.

### 1.3 Sem rate limiting na geração com IA
`/api/pei/generate` e `/api/plans/generate-ai` chamam a OpenAI sem limite por usuário. Mesmo exigindo login, um usuário pode disparar muitas chamadas (custo + abuso). Ação: throttle por usuário/IP (ex.: N gerações por minuto).

---

## 2. Arquitetura e manutenção

### 2.1 Duplicação massiva entre os dois portais
`computacao/page.tsx` (~1.490 linhas) e `anos-iniciais/page.tsx` (~1.110) são quase idênticos — ~34 funções cada, mesma lógica de formulário, geração, tutorial e PDF. **Esse foi exatamente o motivo do bug "passo 5 e 7"**: a numeração divergiu em um portal e não no outro. Ação: extrair o núcleo para um hook/componentes compartilhados (`usePlanGenerator`, `<PlanForm>`, `<PlanEditor>`, `TUTORIAL_STEPS`). Reduz risco de divergência e corta milhares de linhas.

### 2.2 `ensureUserProfile` tenta 3 formatos de insert
Em `supabase-server.ts`, o código tenta inserir o perfil com 3 combinações de colunas (`name`/`full_name`/`points`) por causa de schemas diferentes entre ambientes. É um sintoma de **schema sem migrations versionadas**. Ação: fixar o schema com migrations (Supabase migrations) e remover o fallback.

### 2.3 Proteção de rotas só no cliente
Páginas protegidas (ex.: `/plans`) redirecionam via `useEffect` após render. O conteúdo pode piscar antes do redirect. Ação: usar Next.js `middleware.ts` + `@supabase/ssr` para proteger rotas no servidor. (Os `@supabase/auth-helpers-*` em uso já estão **deprecados** em favor de `@supabase/ssr`.)

---

## 3. Qualidade e confiabilidade

### 3.1 Zero testes
Não há nenhum teste no projeto. O ponto mais sensível — **controle de acesso por papel** (`canManageAeeStudents`, `canGeneratePei`, `requireAdminUser`) — não tem cobertura. Ação: começar com testes unitários de `lib/pei.ts` e dos guards de auth, depois 2–3 testes de rota de API. Alto retorno, baixo custo.

### 3.2 `any` espalhado (42 ocorrências)
Concentrados em tratamento de erro (`catch (err: any)`) e casts. Ação: tipar erros com `unknown` + narrowing; criar tipos para payloads de API.

### 3.3 Documentação redundante na raiz
~40 arquivos `.md` de setup sobrepostos (`START-HERE`, `SETUP-COMPLETO`, `FINALIZACAO-SETUP`, `QUICK-START-SUPABASE`, etc.). Confunde quem chega. Ação: consolidar em um `README.md` + uma pasta `docs/`.

---

## 4. Privacidade (LGPD) — atenção redobrada

A ficha AEE armazena **dados sensíveis de saúde** (medicação, observações emergenciais, diagnóstico/público-alvo, acompanhamentos). Recomendações:
- **Minimização e consentimento**: deixar claro na coleta a base legal e a finalidade; já existe uma nota na UI — vale formalizar.
- **Log de acesso (auditoria)**: registrar quem leu/editou fichas de alunos.
- **Retenção**: política para arquivar/anonimizar fichas de alunos que saíram.
- O `dangerouslySetInnerHTML` em `bncc-nacional` **está protegido** (a função `inlineHtml` faz escape de `&<>` antes), mas é um padrão frágil — se for reutilizado, manter o escape/sanitização.

---

## 5. UX e acessibilidade

- **Toasts/erros sem `aria-live`**: leitores de tela não anunciam. Adicionar `role="status"`/`aria-live="polite"`.
- **Validação inline inconsistente**: a obrigatoriedade aparece de formas diferentes (asterisco em um portal, texto em outro). Padronizar.
- **Bom**: os balões de ajuda adicionados já são acessíveis por teclado (`tabIndex`/foco), e o seletor de escola virou `<select>` legível. Manter esse padrão nos demais campos.

---

## 6. Dependências

- `axios` **e** `fetch` nativo coexistem — padronizar em um só (fetch já cobre tudo aqui).
- `shadcn-ui` está em `dependencies` — é uma CLI de scaffolding, não deveria ser dependência de runtime.
- Migrar `@supabase/auth-helpers-*` → `@supabase/ssr` (ver 2.3).

---

## Sugestão de ordem de execução
1. Corrigir `.env.example` (5 min) e remover `ignoreBuildErrors` (já que `tsc` passa).
2. Rate limiting na geração com IA.
3. Extrair o núcleo compartilhado dos dois portais.
4. Migrations do schema + remover fallback do `ensureUserProfile`.
5. Primeiros testes nos guards de acesso.
6. Middleware de proteção de rotas + migração `@supabase/ssr`.
