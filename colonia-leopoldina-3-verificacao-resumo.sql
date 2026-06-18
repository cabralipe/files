-- ============================================================================
-- VERIFICAÇÃO RESUMIDA — Colônia Leopoldina (uma única tabela de resultado)
-- ============================================================================
WITH m AS (SELECT id FROM municipalities WHERE slug='colonia-leopoldina-al'),
s AS (SELECT * FROM skills WHERE municipality_id = (SELECT id FROM m))
SELECT * FROM (
  SELECT 1 AS n, 'Municipio existe e ativo' AS checagem,
         (SELECT count(*) FROM municipalities WHERE slug='colonia-leopoldina-al' AND is_active)::text AS encontrado,
         '1' AS esperado,
         CASE WHEN (SELECT count(*) FROM municipalities WHERE slug='colonia-leopoldina-al' AND is_active)=1 THEN 'OK' ELSE 'ERRO' END AS status
  UNION ALL
  SELECT 2, 'Total de habilidades', (SELECT count(*) FROM s)::text, '2279',
         CASE WHEN (SELECT count(*) FROM s)=2279 THEN 'OK' ELSE 'CONFERIR' END
  UNION ALL
  SELECT 3, 'Educacao Infantil', (SELECT count(*) FROM s WHERE code LIKE 'EI%')::text, '104',
         CASE WHEN (SELECT count(*) FROM s WHERE code LIKE 'EI%')=104 THEN 'OK' ELSE 'CONFERIR' END
  UNION ALL
  SELECT 4, 'Ensino Fundamental', (SELECT count(*) FROM s WHERE code LIKE 'EF%')::text, '1459',
         CASE WHEN (SELECT count(*) FROM s WHERE code LIKE 'EF%')=1459 THEN 'OK' ELSE 'CONFERIR' END
  UNION ALL
  SELECT 5, 'EJA', (SELECT count(*) FROM s WHERE code LIKE 'EJA%')::text, '716',
         CASE WHEN (SELECT count(*) FROM s WHERE code LIKE 'EJA%')=716 THEN 'OK' ELSE 'CONFERIR' END
  UNION ALL
  SELECT 6, 'Skills sem municipio (NULL)', (SELECT count(*) FROM skills WHERE municipality_id IS NULL)::text, '0',
         CASE WHEN (SELECT count(*) FROM skills WHERE municipality_id IS NULL)=0 THEN 'OK' ELSE 'ERRO' END
  UNION ALL
  SELECT 7, 'Campos criticos vazios', (SELECT count(*) FROM s WHERE code IS NULL OR name IS NULL OR description IS NULL OR grade_level IS NULL OR btrim(description)='')::text, '0',
         CASE WHEN (SELECT count(*) FROM s WHERE code IS NULL OR name IS NULL OR description IS NULL OR grade_level IS NULL OR btrim(description)='')=0 THEN 'OK' ELSE 'ERRO' END
  UNION ALL
  SELECT 8, 'Codigos duplicados no tenant',
         (SELECT count(*) FROM (SELECT code FROM s GROUP BY code HAVING count(*)>1) d)::text, '0',
         CASE WHEN (SELECT count(*) FROM (SELECT code FROM s GROUP BY code HAVING count(*)>1) d)=0 THEN 'OK' ELSE 'ERRO' END
  UNION ALL
  SELECT 9, 'Constraint (code, municipality_id)',
         (SELECT count(*) FROM pg_constraint WHERE conname='skills_code_muni_key')::text, '1',
         CASE WHEN (SELECT count(*) FROM pg_constraint WHERE conname='skills_code_muni_key')>=1 THEN 'OK' ELSE 'ERRO' END
) r
ORDER BY n;
