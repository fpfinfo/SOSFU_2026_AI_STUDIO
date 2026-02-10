-- ============================================================
-- Migration: add_archive_fields_to_solicitations
-- Date: 2026-02-07
-- Description: Adiciona campos nl_siafe e data_baixa à tabela
--              solicitations para processos arquivados (baixados).
-- ============================================================

ALTER TABLE public.solicitations
ADD COLUMN IF NOT EXISTS nl_siafe TEXT,
ADD COLUMN IF NOT EXISTS data_baixa TIMESTAMPTZ;

COMMENT ON COLUMN public.solicitations.nl_siafe IS 'Número da Nota de Liquidação do SIAFE para processos arquivados (baixados)';
COMMENT ON COLUMN public.solicitations.data_baixa IS 'Data em que o processo foi baixado no SIAFE e arquivado';
