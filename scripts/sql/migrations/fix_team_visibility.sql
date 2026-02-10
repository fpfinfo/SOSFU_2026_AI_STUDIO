-- ============================================================
-- CORREÇÃO: Visibilidade de Equipe
-- Data: 2026-02-09
-- Objetivo: Permitir que usuários vejam a lista de colegas para atribuição no Modal
-- ============================================================

-- 1. HABILITAR leitura de perfis para autenticados
-- Sem isso, o usuário só vê a si mesmo no modal
DROP POLICY IF EXISTS "Authenticated users can select all profiles" ON public.profiles;
CREATE POLICY "Authenticated users can select all profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

-- 2. HABILITAR leitura da definição de perfis (dperfil)
DROP POLICY IF EXISTS "Authenticated users can select dperfil" ON public.dperfil;
CREATE POLICY "Authenticated users can select dperfil" 
ON public.dperfil FOR SELECT 
TO authenticated 
USING (true);

-- 3. HABILITAR leitura da tabela team_members (se existir)
DO $$ 
BEGIN
    -- Verificar se a tabela team_members existe
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'team_members') THEN
        -- Remover política anterior se existir
        DROP POLICY IF EXISTS "Team members visible to authenticated" ON public.team_members;
        
        -- Criar nova política
        CREATE POLICY "Team members visible to authenticated" 
        ON public.team_members FOR SELECT 
        TO authenticated 
        USING (true);
    END IF;
END $$;
