-- 1. ATUALIZAR CONSTRAINT DE STATUS
ALTER TABLE public.solicitations DROP CONSTRAINT IF EXISTS solicitations_status_check;

ALTER TABLE public.solicitations 
ADD CONSTRAINT solicitations_status_check 
CHECK (status IN (
    'PENDING',                      -- Criação inicial (rascunho/envio)
    'WAITING_MANAGER',              -- Aguardando Atesto do Gestor
    'WAITING_SOSFU_ANALYSIS',       -- Aguardando Análise e Geração de Docs pela SOSFU
    'WAITING_SEFIN_SIGNATURE',      -- Aguardando Assinatura do Ordenador (SEFIN)
    'WAITING_SOSFU_PAYMENT',        -- Retorno à SOSFU para execução bancária
    'WAITING_SUPRIDO_CONFIRMATION', -- Dinheiro enviado, aguardando confirmação do Suprido
    'APPROVED',                     -- Legado (manter por segurança)
    'PAID',                         -- Finalizado (Dinheiro na conta confirmado)
    'REJECTED'                      -- Recusado
));

-- 2. MIGRAÇÃO DE DADOS (Para não quebrar processos existentes)
-- Mapeia status antigos para o novo fluxo
UPDATE public.solicitations SET status = 'WAITING_SOSFU_ANALYSIS' WHERE status = 'PENDING';
UPDATE public.solicitations SET status = 'WAITING_SEFIN_SIGNATURE' WHERE status = 'WAITING_SEFIN';
-- APPROVED e PAID mantêm-se ou migram conforme necessidade. Deixaremos como estão pois PAID é o final.
