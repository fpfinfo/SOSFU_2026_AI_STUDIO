-- ATUALIZAÇÃO DE STATUS: ADICIONANDO 'ARCHIVED'
-- Execute este script no SQL Editor do Supabase para permitir o status de Arquivamento

-- 1. Remove a constraint antiga
ALTER TABLE public.solicitations DROP CONSTRAINT IF EXISTS solicitations_status_check;

-- 2. Adiciona nova constraint com ARCHIVED
ALTER TABLE public.solicitations 
ADD CONSTRAINT solicitations_status_check 
CHECK (status IN (
    'PENDING',                      -- Rascunho
    'WAITING_MANAGER',              -- Aguardando Atesto do Gestor
    'WAITING_SOSFU_ANALYSIS',       -- Em Análise SOSFU
    'WAITING_SEFIN_SIGNATURE',      -- Aguardando SEFIN
    'WAITING_SOSFU_PAYMENT',        -- Processando Pagamento
    'WAITING_SUPRIDO_CONFIRMATION', -- Dinheiro Enviado
    'APPROVED',                     -- Aprovado (Legado)
    'PAID',                         -- Pago (Dinheiro na conta)
    'REJECTED',                     -- Indeferido
    'WAITING_CORRECTION',           -- Em Diligência
    'ARCHIVED'                      -- Arquivado (Processo Finalizado)
));

-- 3. Atualizar processos pagos antigos para Arquivados se já tiverem PC aprovada?
-- Opcional. Deixaremos como estão para histórico.
