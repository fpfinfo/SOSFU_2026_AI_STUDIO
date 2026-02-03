-- 1. REMOVER A CONSTRAINT ANTIGA (LIMITADORA)
ALTER TABLE public.solicitations DROP CONSTRAINT IF EXISTS solicitations_status_check;

-- 2. ADICIONAR NOVA CONSTRAINT COM O FLUXO COMPLETO
ALTER TABLE public.solicitations 
ADD CONSTRAINT solicitations_status_check 
CHECK (status IN (
    'PENDING',                      -- Rascunho / Em Elaboração
    'WAITING_MANAGER',              -- Aguardando Atesto do Gestor (Etapa atual do problema)
    'WAITING_SOSFU_ANALYSIS',       -- Em Análise na SOSFU
    'WAITING_SEFIN_SIGNATURE',      -- Aguardando Assinatura SEFIN
    'WAITING_SOSFU_PAYMENT',        -- Processando Pagamento
    'WAITING_SUPRIDO_CONFIRMATION', -- Dinheiro Enviado
    'APPROVED',                     -- Aprovado (Legado)
    'PAID',                         -- Pago / Finalizado
    'REJECTED',                     -- Indeferido
    'WAITING_CORRECTION'            -- Em Diligência
));

-- 3. AJUSTE DE DADOS EXISTENTES (CORREÇÃO)
-- Se houver processos que deveriam estar no gestor mas estão travados, podemos movê-los manualmente se necessário.
-- Exemplo: UPDATE public.solicitations SET status = 'WAITING_MANAGER' WHERE status = 'PENDING' AND manager_email IS NOT NULL;
