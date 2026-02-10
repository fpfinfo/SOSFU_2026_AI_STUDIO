-- ============================================================
-- Migration: add_nome_banco_to_profiles
-- Date: 2026-02-07
-- Description: Adiciona campo nome_banco à tabela profiles
--              para armazenar o nome completo do banco do suprido.
--
-- O campo existente 'banco' armazena o código (ex: "037").
-- O novo campo 'nome_banco' armazena o nome (ex: "Banco Bradesco").
-- ============================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS nome_banco TEXT;

COMMENT ON COLUMN public.profiles.nome_banco IS 'Nome do banco do suprido (ex: Banco Bradesco). O campo banco armazena o código (ex: 037).';
