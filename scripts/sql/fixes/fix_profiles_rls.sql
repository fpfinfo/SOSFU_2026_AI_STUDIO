-- Script de Correção de Permissões de Busca de Usuários (Profiles)
-- Execute no Editor SQL do Supabase

-- 1. Garante que RLS está ativo
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Remove políticas antigas que podem estar restringindo o acesso
DROP POLICY IF EXISTS "Perfis visíveis para autenticados" ON public.profiles;
DROP POLICY IF EXISTS "Public Profiles Access" ON public.profiles;

-- 3. Cria uma política permissiva para LEITURA (SELECT)
-- Permite que qualquer usuário autenticado pesquise outros usuários
CREATE POLICY "Permitir Busca de Perfis"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 4. Garante permissões de nível de banco
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO service_role;

-- 5. Confirmação
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT count(*) INTO v_count FROM public.profiles;
  RAISE NOTICE 'Permissões de busca aplicadas. Total de usuários visíveis: %', v_count;
END $$;