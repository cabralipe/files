# Tenant Colônia Leopoldina / AL — RCCL 2025

Domínio (tenant) **isolado** do de Atalaia, com as mesmas funções da plataforma e
currículo próprio extraído do **Referencial Curricular de Colônia Leopoldina (RCCL)**.

- **Slug / URL:** `/colonia-leopoldina-al`
- **Currículo importado:** 2.279 habilidades
  - Educação Infantil: 104
  - Ensino Fundamental: 1.459
  - EJA (1º e 2º segmentos + Ed. Física): 716

## Arquivos gerados

| Arquivo | O que é |
|---|---|
| `colonia-leopoldina-tenant.sql` | Cria o município, isola o currículo e importa as 2.279 habilidades. Rode no SQL Editor do Supabase. |
| `colonia-leopoldina-skills.json` | Currículo estruturado (mesmo formato do `bncc-skills.json`). |
| `scripts/parse-rccl-colonia-leopoldina.py` | Parser que regenera o JSON a partir dos 3 arquivos `.md` da RCCL. |

## Como aplicar

1. **Pré-requisito:** ter aplicado `supabase-migration-multitenant.sql`.
2. No **SQL Editor do Supabase**, execute `colonia-leopoldina-tenant.sql`. Ele é idempotente e:
   - vincula as skills hoje globais (`municipality_id IS NULL`) ao tenant `atalaia-al`, garantindo isolamento real entre municípios;
   - troca o `UNIQUE(code)` global por um índice único **por município** `(code, municipality_id)`, permitindo que o mesmo código BNCC (ex.: `EF01LP02`) exista em mais de um município;
   - cria o município `colonia-leopoldina-al` (cor primária verde `#0F6E56`) com dados do município no `config`;
   - importa as 2.279 habilidades vinculadas a esse tenant.
3. Acesse `/<host>/colonia-leopoldina-al`. As mesmas telas de Atalaia (Explorar Habilidades, Criar Plano de Aula, Gerar Plano com IA, Ranking, AEE/PEI etc.) passam a operar sobre o currículo de Colônia Leopoldina.

## Mudanças de código (isolamento por tenant)

Para cada município ver **apenas** o seu currículo, dois arquivos foram ajustados
(mudança mínima e retrocompatível — sem município, o comportamento anterior é mantido):

- `lib/public-backend.ts` → `listSkills(municipalityId?)` filtra por `municipality_id`.
- `app/api/skills/route.ts` → resolve o município da requisição (via header `x-municipality-slug`, já injetado pelo `MunicipalityProvider`) e repassa o id.

## Observações

- Cobertura do Ensino Fundamental: 1.459 de 1.472 códigos citados (99,1%). Os ~13 restantes são, em sua maioria, referências cruzadas em prosa (ex.: "dialoga com a habilidade EFxxLPxx"), não linhas de habilidade.
- As descrições foram extraídas do texto da RCCL (objetivo/habilidade), separando, quando possível, das orientações didáticas. Para reprocessar após ajustes na RCCL, rode o parser:
  `python3 scripts/parse-rccl-colonia-leopoldina.py`
