-- SOLUÇÃO DEFINITIVA PARA VISIBILIDADE DE PERFIS
-- Execute este script no Editor SQL do Supabase.

-- 1. Desabilita RLS na tabela dperfil
-- Como esta tabela contém apenas dados públicos do sistema (tipos de perfil),
-- não há risco crítico de segurança em deixá-la legível sem RLS.
ALTER TABLE public.dperfil DISABLE ROW LEVEL SECURITY;

-- 2. Garante permissões de SELECT para todos os roles
GRANT SELECT ON public.dperfil TO anon, authenticated, service_role;

-- 3. Confirmação
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT count(*) INTO v_count FROM public.dperfil;
  RAISE NOTICE 'RLS desabilitado para dperfil. Total de registros na tabela: %', v_count;
END $$;