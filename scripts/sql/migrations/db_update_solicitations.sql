-- Adiciona colunas para controle de período, aprovação gerencial e justificativa completa
ALTER TABLE public.solicitations
ADD COLUMN IF NOT EXISTS event_start_date DATE,
ADD COLUMN IF NOT EXISTS event_end_date DATE,
ADD COLUMN IF NOT EXISTS manager_name TEXT,
ADD COLUMN IF NOT EXISTS manager_email TEXT,
ADD COLUMN IF NOT EXISTS justification TEXT;

-- Garante permissões
GRANT ALL ON TABLE public.solicitations TO authenticated;