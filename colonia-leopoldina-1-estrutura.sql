-- PARTE 1 — ESTRUTURA  (Colônia Leopoldina / AL)
-- Rode PRIMEIRO no SQL Editor do Supabase. Pequeno e idempotente.

-- 1) Isola o currículo de Atalaia (skills globais -> tenant atalaia-al)
UPDATE skills
   SET municipality_id = (SELECT id FROM municipalities WHERE slug='atalaia-al')
 WHERE municipality_id IS NULL
   AND EXISTS (SELECT 1 FROM municipalities WHERE slug='atalaia-al');

-- 2) Unicidade de código POR MUNICÍPIO (colunas simples)
ALTER TABLE skills DROP CONSTRAINT IF EXISTS skills_code_key;
DROP INDEX IF EXISTS skills_code_key;
DROP INDEX IF EXISTS skills_code_muni_uniq;
ALTER TABLE skills DROP CONSTRAINT IF EXISTS skills_code_muni_key;
ALTER TABLE skills ADD CONSTRAINT skills_code_muni_key UNIQUE (code, municipality_id);

-- 3) Cria o município (tenant) Colônia Leopoldina
INSERT INTO municipalities (slug, name, state, primary_color, secondary_color, contact_email, config)
VALUES ('colonia-leopoldina-al','Colônia Leopoldina','AL','#0F6E56','#185FA5',NULL,'{"ibge": "2702108", "regiao_planejamento": "Norte", "data_emancipacao": "1904-07-16", "populacao_estimada_2024": 15949, "populacao_censitaria_2022": 15816, "area_km2": 201.463, "segmentos": ["educacao_infantil", "ensino_fundamental", "eja"], "fonte_curriculo": "Referencial Curricular de Colônia Leopoldina (RCCL) 2025", "secretaria": "SEMED - Secretaria Municipal de Educação"}'::jsonb)
ON CONFLICT (slug) DO UPDATE
  SET name=EXCLUDED.name, state=EXCLUDED.state,
      primary_color=EXCLUDED.primary_color, secondary_color=EXCLUDED.secondary_color,
      config=EXCLUDED.config, is_active=true, updated_at=now();
