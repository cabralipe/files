-- Associação N:N entre usuários e escolas.
-- Mantém users.school_id como escola padrão para compatibilidade legada.
CREATE TABLE IF NOT EXISTS public.user_schools (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, school_id)
);

CREATE INDEX IF NOT EXISTS idx_user_schools_school ON public.user_schools(school_id);

INSERT INTO public.user_schools (user_id, school_id)
SELECT id, school_id FROM public.users
WHERE school_id IS NOT NULL
ON CONFLICT (user_id, school_id) DO NOTHING;

ALTER TABLE public.user_schools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_schools_select_own ON public.user_schools;
CREATE POLICY user_schools_select_own ON public.user_schools
  FOR SELECT USING (auth.uid() = user_id);
