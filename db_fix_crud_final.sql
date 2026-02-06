-- REPARO GERAL: Permissões de Itens e Estrutura
-- Execute este script para corrigir o erro 400 (Coluna) e 500 (Permissão)

-- 1. Garante que a coluna doc_type existe (Correção do Erro 400)
ALTER TABLE public.accountability_items 
ADD COLUMN IF NOT EXISTS doc_type TEXT DEFAULT 'OUTROS';

-- 2. Limpeza de Políticas Antigas (Evita conflitos de RLS)
DROP POLICY IF EXISTS "Inserir itens proprios" ON public.accountability_items;
DROP POLICY IF EXISTS "Editar itens proprios" ON public.accountability_items;
DROP POLICY IF EXISTS "Excluir itens proprios" ON public.accountability_items;
DROP POLICY IF EXISTS "Ver itens permitidos" ON public.accountability_items;
DROP POLICY IF EXISTS "CRUD Itens Dono" ON public.accountability_items;

-- 3. Habilita RLS
ALTER TABLE public.accountability_items ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICA UNIFICADA DE CRUD (Create, Read, Update, Delete)
-- Permite que o dono da prestação de contas gerencie seus itens livremente
CREATE POLICY "CRUD Itens Dono" 
ON public.accountability_items
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.accountabilities a
    WHERE a.id = accountability_items.accountability_id
    AND a.requester_id = auth.uid() -- Verifica se é o dono da PC
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.accountabilities a
    WHERE a.id = accountability_items.accountability_id
    AND a.requester_id = auth.uid()
    AND a.status IN ('DRAFT', 'CORRECTION') -- Só pode editar em Rascunho ou Correção
  )
);

-- 5. Permissão de Leitura para Staff (Gestor, SOSFU, etc)
CREATE POLICY "Leitura Itens Staff" 
ON public.accountability_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    JOIN public.dperfil dp ON p.perfil_id = dp.id
    WHERE p.id = auth.uid() AND dp.slug IN ('ADMIN', 'SOSFU', 'GESTOR', 'SEFIN')
  )
);

-- 6. Garante permissões de nível de tabela
GRANT ALL ON TABLE public.accountability_items TO authenticated;
GRANT ALL ON TABLE public.accountabilities TO authenticated;
