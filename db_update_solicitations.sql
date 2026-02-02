-- Adiciona colunas para controle de período e aprovação gerencial
ALTER TABLE public.solicitations
ADD COLUMN IF NOT EXISTS event_start_date DATE,
ADD COLUMN IF NOT EXISTS event_end_date DATE,
ADD COLUMN IF NOT EXISTS manager_name TEXT,
ADD COLUMN IF NOT EXISTS manager_email TEXT;

-- Atualiza permissões (caso necessário, embora policies existentes devam cobrir)
GRANT ALL ON TABLE public.solicitations TO authenticated;