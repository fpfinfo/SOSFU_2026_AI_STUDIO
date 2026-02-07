-- 1. ATUALIZAR STATUS PERMITIDOS
ALTER TABLE public.solicitations DROP CONSTRAINT IF EXISTS solicitations_status_check;

ALTER TABLE public.solicitations 
ADD CONSTRAINT solicitations_status_check 
CHECK (status IN ('PENDING', 'WAITING_MANAGER', 'WAITING_SEFIN', 'APPROVED', 'REJECTED', 'PAID'));

-- 2. POLÍTICA PARA SEFIN VISUALIZAR E EDITAR
-- Se o usuário for SEFIN, pode ver tudo (como ADMIN) e editar processos em WAITING_SEFIN
DROP POLICY IF EXISTS "Sefin gerencia processos" ON public.solicitations;
CREATE POLICY "Sefin gerencia processos" ON public.solicitations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    JOIN public.dperfil dp ON p.perfil_id = dp.id
    WHERE p.id = auth.uid() AND dp.slug = 'SEFIN'
  )
);

-- 3. SEED DOS ORDENADORES (Opcional: Executar se precisar criar os usuários fictícios para teste)
-- Este bloco é apenas ilustrativo para o SQL Editor, caso precise criar os logins.
/*
DO $$
DECLARE
  v_sefin_role UUID;
BEGIN
  SELECT id INTO v_sefin_role FROM dperfil WHERE slug = 'SEFIN';
  
  -- Atualiza ou Cria Miguel (Se já existir o email no auth.users)
  UPDATE public.profiles 
  SET full_name = 'Miguel Lucivaldo Alves Santos', 
      cargo = 'Secretário de Planejamento', 
      perfil_id = v_sefin_role
  WHERE email = 'miguel.santos@tjpa.jus.br';

  -- Atualiza ou Cria Anailton
  UPDATE public.profiles 
  SET full_name = 'Anailton Paulo de Alecar', 
      cargo = 'Secretário Adjunto de Planejamento', 
      perfil_id = v_sefin_role
  WHERE email = 'anailton.alencar@tjpa.jus.br';
END $$;
*/