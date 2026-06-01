-- ============================================================
--  SETUP SUPER ADMIN + ANALYTICS
--  Cole este arquivo no Supabase SQL Editor e execute.
--  Edite o email e senha nas duas variáveis abaixo (linhas 12-13).
-- ============================================================

DO $$
DECLARE
  _uid  uuid;
  _email    text := 'admin@seusite.com';   -- << TROQUE pelo seu e-mail
  _password text := 'SenhaForte123!';      -- << TROQUE pela sua senha
BEGIN

  -- Garante que não existe usuário duplicado
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = _email) THEN
    RAISE NOTICE 'Usuário % já existe. Atualizando para super_admin...', _email;
    UPDATE auth.users
    SET raw_user_meta_data = raw_user_meta_data || '{"role":"super_admin"}'::jsonb,
        updated_at = now()
    WHERE email = _email;
    RETURN;
  END IF;

  -- Cria o usuário na tabela de autenticação do Supabase
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    raw_app_meta_data,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    _email,
    crypt(_password, gen_salt('bf')),
    now(),
    '{"role": "super_admin", "name": "Super Admin"}'::jsonb,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    now(),
    now()
  ) RETURNING id INTO _uid;

  -- Cria a identidade de e-mail (necessário para o login funcionar)
  INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    _email,
    _uid,
    jsonb_build_object(
      'sub',            _uid::text,
      'email',          _email,
      'email_verified', true,
      'provider',       'email'
    ),
    'email',
    now(),
    now(),
    now()
  );

  RAISE NOTICE '✓ Super admin criado: % (id: %)', _email, _uid;
END $$;


-- ============================================================
--  TABELA DE ANALYTICS (visitas + planos gerados)
--  Registra pageviews e cada plano de aula gerado pela IA.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text        NOT NULL,          -- 'pageview' | 'bncc_plan_gen'
  page       text,                          -- '/' | '/bncc-nacional'
  school     text,                          -- escola informada no formulário
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índice principal para contagens por período
CREATE INDEX IF NOT EXISTS analytics_events_type_time_idx
  ON public.analytics_events (event_type, created_at DESC);

-- Índice para ranking de escolas
CREATE INDEX IF NOT EXISTS analytics_events_school_idx
  ON public.analytics_events (school)
  WHERE school IS NOT NULL;

-- Habilita RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Qualquer visitante pode registrar evento (pageview anônimo)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'analytics_events' AND policyname = 'analytics_insert_public'
  ) THEN
    CREATE POLICY analytics_insert_public ON public.analytics_events
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Leitura apenas pelo service role (o dashboard admin usa service role, passa automaticamente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'analytics_events' AND policyname = 'analytics_select_admin'
  ) THEN
    CREATE POLICY analytics_select_admin ON public.analytics_events
      FOR SELECT USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'municipality_admin', 'super_admin')
      );
  END IF;
END $$;

-- ============================================================
--  VERIFICAÇÃO FINAL
-- ============================================================
SELECT
  (SELECT COUNT(*) FROM auth.users
   WHERE raw_user_meta_data->>'role' = 'super_admin')  AS super_admins_criados,
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name = 'analytics_events') AS tabela_analytics_ok;
