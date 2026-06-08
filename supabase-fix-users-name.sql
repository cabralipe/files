-- =====================================================================
-- CORRECAO: coluna legada "name" NOT NULL na tabela users
-- ---------------------------------------------------------------------
-- O codigo padroniza em "full_name", mas o banco de producao ainda tem
-- a coluna antiga "name" com restricao NOT NULL. Isso causava erro 23502
-- ("null value in column name violates not-null constraint") ao criar o
-- perfil de qualquer usuario novo (login, cadastro de aluno, etc).
--
-- Este script preenche os registros existentes e remove a obrigatoriedade
-- da coluna legada. Rode no SQL Editor do Supabase. E idempotente.
-- =====================================================================

DO $$
BEGIN
  -- So executa se a coluna "name" existir na tabela users
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'name'
  ) THEN
    -- Preenche quem esta nulo usando full_name (ou email como ultimo recurso)
    EXECUTE $sql$
      UPDATE users
      SET name = COALESCE(name, full_name, email)
      WHERE name IS NULL
    $sql$;

    -- Remove a obrigatoriedade da coluna legada
    EXECUTE 'ALTER TABLE users ALTER COLUMN name DROP NOT NULL';
  END IF;
END $$;

-- Garante que o PostgREST recarregue o cache de schema
NOTIFY pgrst, 'reload schema';
