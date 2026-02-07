-- 1. Adicionar Coluna doc_type
-- Essencial para corrigir o erro 400 (Bad Request)
ALTER TABLE public.accountability_items 
ADD COLUMN IF NOT EXISTS doc_type TEXT DEFAULT 'OUTROS';

-- 2. Corrigir Política de Inserção (INSERT)
-- Essencial para corrigir o erro 500 (RLS violation)
-- Permite que o dono da solicitação insira itens na prestação de contas
DROP POLICY IF EXISTS "Inserir itens proprios" ON public.accountability_items;

CREATE POLICY "Inserir itens proprios" ON public.accountability_items 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.accountabilities a
    JOIN public.solicitations s ON a.solicitation_id = s.id
    WHERE a.id = accountability_items.accountability_id
    AND s.user_id = auth.uid()
    AND a.status IN ('DRAFT', 'CORRECTION')
  )
);

-- 3. Atualizar política de UPDATE para incluir doc_type se necessário
-- (A política existente "Editar itens proprios" geralmente usa USING, que cobre updates, mas é bom garantir)
GRANT ALL ON TABLE public.accountability_items TO authenticated;
