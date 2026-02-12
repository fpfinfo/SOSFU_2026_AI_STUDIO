-- Migration: Adicionar statuses de Ressarcimento ao fluxo de solicitações
-- Data: 2026-02-11

-- 1. REMOVER A CONSTRAINT ANTIGA
ALTER TABLE public.solicitations DROP CONSTRAINT IF EXISTS solicitations_status_check;

-- 2. ADICIONAR NOVA CONSTRAINT COM STATUSES DE RESSARCIMENTO
ALTER TABLE public.solicitations
ADD CONSTRAINT solicitations_status_check
CHECK (status IN (
    'PENDING',                          -- Rascunho / Em Elaboração
    'WAITING_MANAGER',                  -- Aguardando Atesto do Gestor
    'WAITING_SOSFU_ANALYSIS',           -- Em Análise na SOSFU
    'WAITING_SEFIN_SIGNATURE',          -- Aguardando Assinatura SEFIN
    'WAITING_SOSFU_PAYMENT',            -- Processando Pagamento
    'WAITING_SUPRIDO_CONFIRMATION',     -- Dinheiro Enviado
    'APPROVED',                         -- Aprovado (Legado)
    'PAID',                             -- Pago / Finalizado
    'REJECTED',                         -- Indeferido
    'WAITING_CORRECTION',               -- Em Diligência
    'WAITING_RESSARCIMENTO_ANALYSIS',   -- Ressarcimento: Aguardando Análise SOSFU
    'WAITING_RESSARCIMENTO_EXECUTION',  -- Ressarcimento: Aguardando Execução Pagamento
    'ARCHIVED'                          -- Arquivado
));
