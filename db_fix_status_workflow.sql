-- 1. CORREÇÃO DA CONSTRAINT DE STATUS
-- Garante que 'WAITING_MANAGER' e outros status sejam aceitos na coluna status da tabela solicitations
ALTER TABLE public.solicitations DROP CONSTRAINT IF EXISTS solicitations_status_check;

ALTER TABLE public.solicitations 
ADD CONSTRAINT solicitations_status_check 
CHECK (status IN (
    'PENDING',                      -- Rascunho / Em Elaboração
    'WAITING_MANAGER',              -- Aguardando Atesto do Gestor
    'WAITING_SOSFU_ANALYSIS',       -- Em Análise na SOSFU
    'WAITING_SEFIN_SIGNATURE',      -- Aguardando Assinatura SEFIN
    'WAITING_SOSFU_PAYMENT',        -- Processando Pagamento
    'WAITING_SUPRIDO_CONFIRMATION', -- Dinheiro Enviado
    'APPROVED',                     -- Aprovado (Legado)
    'PAID',                         -- Pago / Finalizado
    'REJECTED',                     -- Indeferido
    'WAITING_CORRECTION'            -- Em Diligência
));

-- 2. POLÍTICA DE ATUALIZAÇÃO (UPDATE)
-- Permite que o Suprido (dono do processo) atualize o status para WAITING_MANAGER
-- Permite que o Gestor (manager_email) atualize para WAITING_SOSFU_ANALYSIS
DROP POLICY IF EXISTS "Atualizar solicitacoes fluxo" ON public.solicitations;

CREATE POLICY "Atualizar solicitacoes fluxo"
ON public.solicitations
FOR UPDATE
USING (
    -- O usuário é o dono (pode enviar para gestor)
    auth.uid() = user_id 
    OR
    -- O usuário é o gestor designado (pelo email)
    manager_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    OR
    -- O usuário é Staff (Admin/SOSFU/SEFIN)
    EXISTS (
        SELECT 1 FROM public.profiles p 
        JOIN public.dperfil dp ON p.perfil_id = dp.id 
        WHERE p.id = auth.uid() AND dp.slug IN ('ADMIN', 'SOSFU', 'SEFIN')
    )
);