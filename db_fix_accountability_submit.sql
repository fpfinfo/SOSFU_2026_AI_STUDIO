-- CORREÇÃO DE PERMISSÃO DE ENVIO (403 Forbidden)
-- Este script corrige a política de segurança que impedia o usuário de mudar o status de 'DRAFT' para 'WAITING_MANAGER'.

-- 1. Garante que RLS está ativo na tabela correta
ALTER TABLE public.accountabilities ENABLE ROW LEVEL SECURITY;

-- 2. Remove política antiga que estava bloqueando a mudança de status
DROP POLICY IF EXISTS "Editar minha prestacao" ON public.accountabilities;

-- 3. Cria a nova política que permite a transição de status
CREATE POLICY "Editar minha prestacao" ON public.accountabilities
FOR UPDATE
USING (
  -- Condição para VER/SELECIONAR a linha para edição:
  -- Deve ser o dono E estar em modo de edição (Rascunho ou Correção)
  requester_id = auth.uid() 
  AND status IN ('DRAFT', 'CORRECTION')
)
WITH CHECK (
  -- Condição para VALIDAR o novo estado da linha após o update:
  -- Deve continuar sendo o dono
  requester_id = auth.uid() 
  -- IMPORTANTE: Aqui permitimos que o novo status seja 'WAITING_MANAGER' (Enviado)
  AND status IN ('DRAFT', 'CORRECTION', 'WAITING_MANAGER')
);

-- 4. Garante permissões de nível de tabela
GRANT UPDATE ON public.accountabilities TO authenticated;
