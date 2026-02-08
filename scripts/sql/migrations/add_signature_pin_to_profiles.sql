-- ============================================================
-- Migration: add_signature_pin_to_profiles
-- Date: 2026-02-08
-- Description: Adiciona campo signature_pin à tabela profiles
--              para assinatura eletrônica de documentos.
--              Define PIN padrão "1234" para todos os usuários
--              existentes (ambiente de teste).
--
-- REGRA DE NEGÓCIO:
--   Todo usuário precisa de um PIN para assinar documentos.
--   Em produção, cada usuário deverá configurar seu próprio PIN.
--   Para testes, todos recebem o PIN padrão "1234".
-- ============================================================

-- 1. Adicionar coluna signature_pin
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS signature_pin TEXT DEFAULT '1234';

-- 2. Atualizar todos os usuários existentes com o PIN padrão
UPDATE public.profiles 
SET signature_pin = '1234' 
WHERE signature_pin IS NULL;

-- 3. Comentário descritivo
COMMENT ON COLUMN public.profiles.signature_pin IS 'PIN de assinatura eletrônica do usuário (4 dígitos). Padrão de teste: 1234';
