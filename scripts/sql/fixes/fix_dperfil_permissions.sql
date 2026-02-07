-- Script de Correção de Permissões para a Tabela dperfil
-- Execute este script no Editor SQL do Supabase.
-- Problema: A lista de perfis não aparece no modal de "Conceder Papel" porque o RLS está ativo sem política de leitura.

-- 1. Habilita RLS (caso não esteja)
ALTER TABLE public.dperfil ENABLE ROW LEVEL SECURITY;

-- 2. Remove política antiga se existir (para evitar duplicidade/erro)
DROP POLICY IF EXISTS "Permitir Leitura de Perfis" ON public.dperfil;
DROP POLICY IF EXISTS "Public Perfil View" ON public.dperfil;

-- 3. Cria a política que permite leitura para todos os usuários (autenticados ou não)
-- Isso é necessário para preencher o dropdown de seleção de papéis.
CREATE POLICY "Permitir Leitura de Perfis"
ON public.dperfil
FOR SELECT
USING (true);

-- 4. Garante permissões de SELECT a nível de role do Postgres
GRANT SELECT ON public.dperfil TO anon, authenticated, service_role;

-- 5. Verifica se há dados (apenas para log no painel SQL)
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT count(*) INTO v_count FROM public.dperfil;
  RAISE NOTICE 'Permissões aplicadas com sucesso. Existem % perfis na tabela dperfil.', v_count;
END $$;