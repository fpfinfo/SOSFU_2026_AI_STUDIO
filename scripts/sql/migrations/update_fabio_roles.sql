DO $$
DECLARE
    v_user_id UUID;
    v_sosfu_gestor_id UUID;
    v_admin_id UUID;
BEGIN
    -- 1. Get User ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'fabio.freitas@tjpa.jus.br';
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User fabio.freitas@tjpa.jus.br not found';
    END IF;

    -- 2. Get Role IDs
    SELECT id INTO v_sosfu_gestor_id FROM public.dperfil WHERE slug = 'SOSFU_GESTOR';
    SELECT id INTO v_admin_id FROM public.dperfil WHERE slug = 'ADMIN';

    IF v_sosfu_gestor_id IS NULL OR v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Roles not found. Make sure seed_roles_modern.sql was run.';
    END IF;

    -- 3. Update main profile to SOSFU_GESTOR (Primary Dashboard)
    -- This ensures App.tsx routes him to SOSFU context
    UPDATE public.profiles 
    SET perfil_id = v_sosfu_gestor_id, 
        cargo = 'Diretor SOSFU'
    WHERE id = v_user_id;

    -- 4. Insert into sys_user_roles (RBAC V2) if table exists
    -- This grants "Accumulated" roles for systems that check this table
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sys_user_roles') THEN
        EXECUTE 'INSERT INTO public.sys_user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING' 
        USING v_user_id, v_sosfu_gestor_id;
        
        EXECUTE 'INSERT INTO public.sys_user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING' 
        USING v_user_id, v_admin_id;
        
        RAISE NOTICE 'Assigned SOSFU_GESTOR and ADMIN to sys_user_roles';
    ELSE
        RAISE NOTICE 'Table sys_user_roles not found. Only profiles.perfil_id was updated.';
    END IF;

    RAISE NOTICE 'Successfully updated roles for Fabio Pereira de Freitas';
END $$;
