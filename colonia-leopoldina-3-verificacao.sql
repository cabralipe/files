-- ============================================================================
-- VERIFICAÇÃO — Tenant Colônia Leopoldina / AL
-- Rode no SQL Editor APÓS a estrutura + as 5 partes do currículo.
-- Cada bloco devolve uma linha com status OK/ERRO e o valor encontrado.
-- ============================================================================

-- 1) Município existe e está ativo (esperado: 1 linha, is_active = true)
SELECT '1. municipio' AS checagem,
       CASE WHEN count(*) = 1 THEN 'OK' ELSE 'ERRO' END AS status,
       count(*) AS encontrado
FROM municipalities
WHERE slug = 'colonia-leopoldina-al' AND is_active;

-- 2) Branding/config aplicados (cor + segmentos)
SELECT '2. branding/config' AS checagem,
       name, state, primary_color,
       config->>'ibge'        AS ibge,
       config->'segmentos'    AS segmentos
FROM municipalities
WHERE slug = 'colonia-leopoldina-al';

-- 3) Total de habilidades do tenant (esperado: 2279)
SELECT '3. total skills' AS checagem,
       CASE WHEN count(*) = 2279 THEN 'OK' ELSE 'CONFERIR' END AS status,
       count(*) AS encontrado, 2279 AS esperado
FROM skills s
JOIN municipalities m ON m.id = s.municipality_id
WHERE m.slug = 'colonia-leopoldina-al';

-- 4) Distribuição por segmento (esperado: EI 104, EF 1459, EJA 716)
SELECT '4. por segmento' AS checagem,
       CASE WHEN s.code LIKE 'EJA%' THEN 'EJA'
            WHEN s.code LIKE 'EI%'  THEN 'Educacao Infantil'
            ELSE 'Ensino Fundamental' END AS segmento,
       count(*) AS qtd
FROM skills s
JOIN municipalities m ON m.id = s.municipality_id
WHERE m.slug = 'colonia-leopoldina-al'
GROUP BY 2
ORDER BY 2;

-- 5) Distribuição por componente/subject (visão geral)
SELECT '5. por subject' AS checagem, s.subject, count(*) AS qtd
FROM skills s
JOIN municipalities m ON m.id = s.municipality_id
WHERE m.slug = 'colonia-leopoldina-al'
GROUP BY s.subject
ORDER BY qtd DESC;

-- 6) Isolamento: nenhuma skill com municipality_id NULL (esperado: 0)
SELECT '6. skills sem municipio (NULL)' AS checagem,
       CASE WHEN count(*) = 0 THEN 'OK' ELSE 'ERRO' END AS status,
       count(*) AS encontrado
FROM skills WHERE municipality_id IS NULL;

-- 7) Isolamento: nenhum código de CL "vazando" para outro município
--    (mesmo code em CL e em outro tenant é permitido; aqui só listamos
--     se algum registro de CL ficou sem o municipality_id correto)
SELECT '7. skills CL fora do tenant' AS checagem,
       CASE WHEN count(*) = 0 THEN 'OK' ELSE 'CONFERIR' END AS status,
       count(*) AS encontrado
FROM skills s
JOIN municipalities m ON m.id = s.municipality_id
WHERE m.slug <> 'colonia-leopoldina-al'
  AND (s.code LIKE 'EJA-CL%');   -- códigos exclusivos da RCCL

-- 8) Integridade: campos críticos vazios (esperado: 0)
SELECT '8. campos vazios' AS checagem,
       CASE WHEN count(*) = 0 THEN 'OK' ELSE 'ERRO' END AS status,
       count(*) AS encontrado
FROM skills s
JOIN municipalities m ON m.id = s.municipality_id
WHERE m.slug = 'colonia-leopoldina-al'
  AND (s.code IS NULL OR s.name IS NULL OR s.description IS NULL
       OR s.grade_level IS NULL OR btrim(s.description) = '');

-- 9) Duplicidade de código dentro do tenant (esperado: 0)
SELECT '9. codigos duplicados no tenant' AS checagem,
       CASE WHEN count(*) = 0 THEN 'OK' ELSE 'ERRO' END AS status,
       count(*) AS encontrado
FROM (
  SELECT s.code
  FROM skills s
  JOIN municipalities m ON m.id = s.municipality_id
  WHERE m.slug = 'colonia-leopoldina-al'
  GROUP BY s.code HAVING count(*) > 1
) d;

-- 10) Constraint de unicidade por município existe (esperado: 1 linha)
SELECT '10. constraint (code, municipality_id)' AS checagem,
       CASE WHEN count(*) >= 1 THEN 'OK' ELSE 'ERRO' END AS status
FROM pg_constraint
WHERE conname = 'skills_code_muni_key';

-- 11) Amostra de 8 habilidades (conferência visual)
SELECT s.code, s.grade_level, s.subject, left(s.description, 80) AS descricao
FROM skills s
JOIN municipalities m ON m.id = s.municipality_id
WHERE m.slug = 'colonia-leopoldina-al'
ORDER BY random()
LIMIT 8;
