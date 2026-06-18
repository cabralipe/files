# Tenant Colônia Leopoldina / AL — RCCL 2025

Domínio (tenant) **isolado** do de Atalaia, com as mesmas funções da plataforma e
currículo próprio extraído do **Referencial Curricular de Colônia Leopoldina (RCCL)**.

- **Slug / URL:** `/colonia-leopoldina-al`
- **Currículo importado:** 2.279 habilidades — Educação Infantil (104), Ensino Fundamental (1.459), EJA (716).

## Arquivos

| Arquivo | O que é |
|---|---|
| `colonia-leopoldina-1-estrutura.sql` | Cria o município, isola o currículo de Atalaia e ajusta a unicidade por município. **Rode primeiro.** Pequeno. |
| `colonia-leopoldina-2-skills-parte-01..05.sql` | O currículo dividido em 5 partes (≈115–252 KB), para caber no SQL Editor. |
| `colonia-leopoldina-tenant.sql` | Tudo num arquivo só (≈1 MB) — **só funciona via psql/CLI**, é grande demais para o SQL Editor. |
| `scripts/seed-colonia-leopoldina.cjs` | Alternativa por terminal: importa o currículo de uma vez (supabase-js). |
| `colonia-leopoldina-skills.json` | Currículo estruturado (mesmo formato do `bncc-skills.json`). |
| `scripts/parse-rccl-colonia-leopoldina.py` | Parser que regenera o JSON a partir dos 3 `.md` da RCCL. |

## Como aplicar (Supabase Dashboard — recomendado)

Pré-requisito: ter rodado antes a migration multi-tenant (`supabase-migration-multitenant.sql`).

1. **app.supabase.com** → seu projeto → **SQL Editor** → **New query**.
2. Cole o conteúdo de `colonia-leopoldina-1-estrutura.sql` e clique **Run**.
3. Rode, **em ordem**, cada parte do currículo: abra `...parte-01.sql`, cole, **Run**; depois `...parte-02.sql`, e assim até a `parte-05.sql`. (Cada arquivo é um Run separado.)
4. Confira:
   ```sql
   select count(*) from skills s
   join municipalities m on m.id = s.municipality_id
   where m.slug = 'colonia-leopoldina-al';   -- esperado: 2279
   ```
5. Faça o deploy do código com os dois arquivos ajustados (`lib/public-backend.ts` e `app/api/skills/route.ts`) e acesse `/colonia-leopoldina-al`.

## Alternativa por terminal (um comando)

```bash
# 1) rode só a estrutura no SQL Editor: colonia-leopoldina-1-estrutura.sql
# 2) depois, na raiz do projeto:
node scripts/seed-colonia-leopoldina.cjs
```
Requer no `.env.local`: `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.

## Alternativa por psql/CLI (sem dividir)

```bash
psql "$DATABASE_URL" -f colonia-leopoldina-tenant.sql
```

## Mudanças de código (isolamento por tenant)

Para cada município ver **apenas** o seu currículo (mudança mínima e retrocompatível):

- `lib/public-backend.ts` → `listSkills(municipalityId?)` filtra por `municipality_id`.
- `app/api/skills/route.ts` → resolve o município da requisição (header `x-municipality-slug`, já injetado pelo `MunicipalityProvider`) e repassa o id.

## Observações

- Cobertura do Ensino Fundamental: 1.459 de 1.472 códigos citados (99,1%). Os ~13 restantes são, em sua maioria, referências cruzadas em prosa, não linhas de habilidade.
- As descrições foram extraídas do texto da RCCL (objetivo/habilidade), separando, quando possível, das orientações didáticas. Para reprocessar: `python3 scripts/parse-rccl-colonia-leopoldina.py`.
