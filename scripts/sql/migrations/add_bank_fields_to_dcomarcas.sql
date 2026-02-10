-- ============================================================
-- Migration: add_bank_fields_to_dcomarcas
-- Date: 2026-02-07
-- Description: Adiciona campos bancários à tabela dcomarcas
--              para armazenar a conta institucional da comarca.
--
-- REGRA DE NEGÓCIO:
--   EXTRA-JÚRI   → usa conta da COMARCA (dcomarcas.conta_corrente)
--   EXTRA-EMERGENCIAL → usa conta do SUPRIDO (profiles.conta_corrente)
-- ============================================================

ALTER TABLE public.dcomarcas 
ADD COLUMN IF NOT EXISTS nome_banco TEXT,
ADD COLUMN IF NOT EXISTS cod_banco TEXT,
ADD COLUMN IF NOT EXISTS agencia TEXT,
ADD COLUMN IF NOT EXISTS conta_corrente TEXT;

COMMENT ON COLUMN public.dcomarcas.nome_banco IS 'Nome do banco da conta institucional da comarca (ex: Banco do Brasil)';
COMMENT ON COLUMN public.dcomarcas.cod_banco IS 'Código do banco (ex: 001)';
COMMENT ON COLUMN public.dcomarcas.agencia IS 'Número da agência bancária da comarca';
COMMENT ON COLUMN public.dcomarcas.conta_corrente IS 'Conta corrente institucional da comarca (usada em processos Extra-Júri)';
