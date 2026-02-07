-- ==============================================================================
-- CORREÇÃO DE PERMISSÕES (RLS) - PRESTAÇÃO DE CONTAS
-- Execute este script para resolver o Erro 403 ao clicar em "Iniciar PC"
-- ==============================================================================

-- 1. Garante que RLS está habilitado
ALTER TABLE public.accountabilities ENABLE ROW LEVEL SECURITY;

-- 2. Limpa políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Ver minhas prestacoes" ON public.accountabilities;
DROP POLICY IF EXISTS "Criar prestacao" ON public.accountabilities;
DROP POLICY IF EXISTS "Editar prestacao" ON public.accountabilities;
DROP POLICY IF EXISTS "Staff gerencia prestacoes" ON public.accountabilities;
DROP POLICY IF EXISTS "Users can insert own accountability" ON public.accountabilities;
DROP POLICY IF EXISTS "Users can view own accountability" ON public.accountabilities;
DROP POLICY IF EXISTS "Ver prestacoes permitidas" ON public.accountabilities;
DROP POLICY IF EXISTS "Editar minha prestacao" ON public.accountabilities;
DROP POLICY IF EXISTS "Staff gerencia tudo" ON public.accountabilities;

-- 3. CRIAR NOVAS POLÍTICAS DE ACESSO

-- A. VISUALIZAÇÃO (SELECT)
-- O usuário vê suas próprias prestações.
-- Perfis de gestão (ADMIN, SOSFU, SEFIN) veem todas.
CREATE POLICY "Ver prestacoes permitidas" ON public.accountabilities
FOR SELECT
USING (
  requester_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles p 
    JOIN public.dperfil dp ON p.perfil_id = dp.id
    WHERE p.id = auth.uid() AND dp.slug IN ('ADMIN', 'SOSFU', 'SEFIN')
  )
);

-- B. CRIAÇÃO (INSERT)
-- O usuário autenticado pode criar uma prestação de contas,
-- desde que o campo requester_id seja o seu próprio ID.
CREATE POLICY "Criar prestacao" ON public.accountabilities
FOR INSERT
WITH CHECK (
  auth.uid() = requester_id
);

-- C. ATUALIZAÇÃO (UPDATE) - USUÁRIO SUPRIDO
-- O usuário pode editar se for o dono E o status permitir (Rascunho ou Correção).
CREATE POLICY "Editar minha prestacao" ON public.accountabilities
FOR UPDATE
USING (
  requester_id = auth.uid() 
  AND status IN ('DRAFT', 'CORRECTION')
);

-- D. GERENCIAMENTO TOTAL (STAFF)
-- Admin e SOSFU têm poder total para editar (mudar status, aprovar, rejeitar, etc).
CREATE POLICY "Staff gerencia tudo" ON public.accountabilities
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    JOIN public.dperfil dp ON p.perfil_id = dp.id
    WHERE p.id = auth.uid() AND dp.slug IN ('ADMIN', 'SOSFU')
  )
);

-- 4. GARANTIAS FINAIS DE GRANT
GRANT ALL ON TABLE public.accountabilities TO authenticated;
GRANT ALL ON TABLE public.accountabilities TO service_role;

-- Confirmação no log
DO $$
BEGIN
  RAISE NOTICE 'Políticas de segurança da tabela accountabilities aplicadas com sucesso.';
END $$;
