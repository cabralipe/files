# _archive

Arquivos legados / de exemplo que **não fazem parte do app em produção** e
**não são importados** por nenhum módulo em `app/`, `lib/`, `hooks/` ou
`components/`. Foram movidos para cá na limpeza do Bloco 4 (auditoria de
segurança) para reduzir ruído e risco de confusão em auditoria.

O código real equivalente vive em:

| Arquivo arquivado            | Substituto real em produção            |
| ---------------------------- | -------------------------------------- |
| `lib-db-*.ts`                | `lib/public-backend.ts`                |
| `lib-points.ts`              | `lib/points-server.ts`                 |
| `lib-security.ts`            | `lib/rate-limit.ts`, validação por rota|
| `lib-storage.ts`             | `lib/supabase-*.ts`, `@vercel/blob`    |
| `lib-email.ts`, `lib-pdf-generator.ts` | não usados                   |
| `hooks-customizados.ts`      | `hooks/useAuth.ts`, `hooks/usePlans.ts`, etc. |
| `*-example.tsx`, `exemplo-*.tsx`, `api-routes-example.ts` | exemplos/scaffolding |

Já estavam fora do `tsconfig` (a raiz exclui `*.ts`/`*.tsx`). Podem ser
removidos de vez com segurança — o histórico do git preserva o conteúdo.
