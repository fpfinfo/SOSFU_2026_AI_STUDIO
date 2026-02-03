-- DESABILITA RLS TEMPORARIAMENTE PARA DEBUG (Ou configura permissões públicas de leitura)
-- Execute isso se "A equipe sumiu" ou "Gestão de perfil vazia"

-- 1. Perfis de Sistema (dperfil)
ALTER TABLE public.dperfil DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.dperfil TO anon, authenticated, service_role;

-- 2. Perfis de Usuário (profiles)
-- Importante: Isso permite que qualquer usuário logado veja a lista de outros usuários (necessário para TeamTable e Gestão de Perfis)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver todos perfis" ON public.profiles;
CREATE POLICY "Ver todos perfis" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Editar proprio perfil" ON public.profiles;
CREATE POLICY "Editar proprio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admin edita tudo" ON public.profiles;
CREATE POLICY "Admin edita tudo" ON public.profiles FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.dperfil d ON p.perfil_id = d.id
        WHERE p.id = auth.uid() AND d.slug IN ('ADMIN', 'SOSFU')
    )
);

-- 3. Configurações
ALTER TABLE public.app_config DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.app_config TO anon, authenticated;

-- 4. Solicitações
ALTER TABLE public.solicitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver proprias ou se for staff" ON public.solicitations;
CREATE POLICY "Ver proprias ou se for staff" ON public.solicitations FOR SELECT USING (
    user_id = auth.uid() OR
    manager_email = (SELECT email FROM public.profiles WHERE id = auth.uid()) OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.dperfil d ON p.perfil_id = d.id
        WHERE p.id = auth.uid() AND d.slug IN ('ADMIN', 'SOSFU', 'SEFIN')
    )
);
