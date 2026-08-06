-- Acesso da familia por link aprovado (substitui o cadastro por email/senha).
-- Fluxo: o AEE gera o link com o nome do responsavel -> fica "pending_approval";
-- a coordenacao aprova -> "approved" -> o link passa a funcionar no portal
-- publico da familia (sem login, so a posse do token).
CREATE TABLE IF NOT EXISTS public.family_access_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  municipality_id UUID NOT NULL REFERENCES public.municipalities(id),
  school_id UUID REFERENCES public.schools(id),
  responsible_name TEXT NOT NULL,
  relationship TEXT,
  -- Token opaco (32 bytes aleatorios, base64url) — unico segredo que protege
  -- o acesso; nunca deve ser previsivel nem reaproveitado.
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending_approval'
    CHECK (status IN ('pending_approval', 'approved', 'revoked')),
  created_by UUID NOT NULL REFERENCES public.users(id),
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES public.users(id),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_family_access_links_student ON public.family_access_links(student_id);
CREATE INDEX IF NOT EXISTS idx_family_access_links_token ON public.family_access_links(token);
CREATE INDEX IF NOT EXISTS idx_family_access_links_school_status ON public.family_access_links(school_id, status);

ALTER TABLE public.family_access_links ENABLE ROW LEVEL SECURITY;
-- Toda a leitura/escrita passa pelas rotas de API (service role); nenhuma
-- policy de client anonimo/autenticado é necessária aqui.
