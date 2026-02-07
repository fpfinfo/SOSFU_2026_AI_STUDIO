-- 1. ATUALIZAR STATUS PERMITIDOS EM SOLICITATIONS
-- Remove a constraint antiga de status
ALTER TABLE public.solicitations DROP CONSTRAINT IF EXISTS solicitations_status_check;

-- Adiciona a nova constraint com WAITING_MANAGER
ALTER TABLE public.solicitations 
ADD CONSTRAINT solicitations_status_check 
CHECK (status IN ('PENDING', 'WAITING_MANAGER', 'APPROVED', 'REJECTED', 'PAID'));

-- 2. ALTERAR TRIGGER DE GERAÇÃO AUTOMÁTICA
-- Quando o suprido cria, o status agora é WAITING_MANAGER se tiver gestor?
-- Vamos manter a criação padrão como 'PENDING' no código do frontend, mas o frontend pode mandar 'WAITING_MANAGER' se quiser.
-- O frontend já foi atualizado para mandar PENDING por padrão, mas para testar o gestor, vamos forçar WAITING_MANAGER na criação se houver gestor.

-- 3. CRIAR USUÁRIO TESTE GESTOR (Opcional, mas útil)
-- Se quiser testar, crie um usuário com email 'gestor@tjpa.jus.br' e rode este script:
-- UPDATE public.profiles SET perfil_id = (SELECT id FROM dperfil WHERE slug = 'GESTOR') WHERE email = 'gestor@tjpa.jus.br';

-- 4. GARANTIR PERMISSÃO PARA ATUALIZAR STATUS
-- A política "Criar solicitações" permite INSERT. Precisamos de UPDATE para o Gestor.
DROP POLICY IF EXISTS "Gestor aprova solicitacoes" ON public.solicitations;
CREATE POLICY "Gestor aprova solicitacoes" ON public.solicitations
FOR UPDATE
USING (
  -- O usuário pode editar se for o gestor designado (pelo email)
  manager_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  OR 
  -- Ou se for ADMIN/SOSFU
  EXISTS (
    SELECT 1 FROM public.profiles p 
    JOIN public.dperfil dp ON p.perfil_id = dp.id
    WHERE p.id = auth.uid() AND dp.slug IN ('ADMIN', 'SOSFU')
  )
);