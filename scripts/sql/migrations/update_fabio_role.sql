-- Execute este script no Editor SQL do Supabase para atualizar as permissões imediatamente

DO $$
DECLARE
    v_role_id UUID;
BEGIN
    -- 1. Busca o ID do perfil SOSFU (Garante que pegamos o ID correto da tabela dperfil)
    SELECT id INTO v_role_id FROM public.dperfil WHERE slug = 'SOSFU' LIMIT 1;

    -- 2. Verifica se encontrou o perfil
    IF v_role_id IS NOT NULL THEN
        
        -- 3. Atualiza o usuário pelo E-mail
        UPDATE public.profiles
        SET 
            perfil_id = v_role_id,
            cargo = 'Analista Judiciário - SOSFU',
            matricula = '203424',
            status = 'ACTIVE',
            is_verified = TRUE
        WHERE email = 'fabio.freitas@tjpa.jus.br';

        -- 4. Atualiza também pelo Nome (caso o e-mail no cadastro esteja diferente ou login social)
        UPDATE public.profiles
        SET 
            perfil_id = v_role_id,
             cargo = 'Analista Judiciário - SOSFU',
            matricula = '203424',
             status = 'ACTIVE',
            is_verified = TRUE
        WHERE full_name ILIKE '%Fabio Pereira de Freitas%' 
          AND perfil_id IS DISTINCT FROM v_role_id;
          
        RAISE NOTICE 'Perfil de Fabio Pereira de Freitas atualizado para SOSFU.';
    ELSE
        RAISE WARNING 'Perfil SOSFU não encontrado na tabela dperfil. Rode o seed_profiles.sql primeiro.';
    END IF;
END $$;