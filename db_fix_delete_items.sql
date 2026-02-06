-- CORREÇÃO DE PERMISSÕES PARA EXCLUSÃO (CRUD)
-- Execute este script para permitir que o usuário exclua itens lançados incorretamente

-- 1. Garante que a tabela tenha RLS ativo
ALTER TABLE public.accountability_items ENABLE ROW LEVEL SECURITY;

-- 2. Remove política antiga de delete se existir (para evitar conflitos)
DROP POLICY IF EXISTS "Excluir itens proprios" ON public.accountability_items;

-- 3. Cria a política de DELETE
-- Permite excluir SE:
-- a) O usuário logado é o dono da solicitação (via join com accountabilities -> solicitations)
-- b) O status da prestação de contas ainda é 'DRAFT' (Rascunho) ou 'CORRECTION' (Correção)
CREATE POLICY "Excluir itens proprios" 
ON public.accountability_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.accountabilities a
    JOIN public.solicitations s ON a.solicitation_id = s.id
    WHERE a.id = accountability_items.accountability_id
    AND s.user_id = auth.uid()
    AND a.status IN ('DRAFT', 'CORRECTION')
  )
);

-- 4. Garante permissões de nível de tabela
GRANT DELETE ON TABLE public.accountability_items TO authenticated;
