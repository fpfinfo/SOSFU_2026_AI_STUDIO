-- Migration: add_responsavel_fk_dunidadesadmin
-- Substitui o campo TEXT 'responsavel' por FK para profiles
-- Mantém o campo 'responsavel' (TEXT) como fallback para nomes sem cadastro

-- 1. Adicionar coluna responsavel_id (FK para profiles)
ALTER TABLE public."dUnidadesAdmin"
  ADD COLUMN IF NOT EXISTS responsavel_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Index para joins performáticos
CREATE INDEX IF NOT EXISTS idx_dunidadesadmin_responsavel
  ON public."dUnidadesAdmin" (responsavel_id)
  WHERE responsavel_id IS NOT NULL;

-- 3. Comentários
COMMENT ON COLUMN public."dUnidadesAdmin".responsavel_id IS 'FK para profiles — titular/responsável da unidade. Traz avatar, nome, email, matrícula, cargo etc.';
COMMENT ON COLUMN public."dUnidadesAdmin".responsavel IS 'Nome do responsável (fallback textual, mantido para registros sem vínculo)';
