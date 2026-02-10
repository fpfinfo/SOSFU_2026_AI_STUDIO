DO $$
DECLARE
    v_user_id UUID;
    v_role_id UUID;
BEGIN
    -- 1. Get User ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'des.roberto.moura@tjpa.jus.br';
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User des.roberto.moura@tjpa.jus.br not found';
    END IF;

    -- 2. Get Role ID
    SELECT id INTO v_role_id FROM public.dperfil WHERE slug = 'PRESIDENCIA_GESTOR';

    IF v_role_id IS NULL THEN
        RAISE EXCEPTION 'Role PRESIDENCIA_GESTOR not found.';
    END IF;

    -- 3. Update main profile
    UPDATE public.profiles 
    SET perfil_id = v_role_id,
        cargo = 'Presidente do Tribunal',
        lotacao = 'Gabinete da Presidência'
    WHERE id = v_user_id;

    RAISE NOTICE 'Successfully assigned Presidente do Tribunal to Roberto Gonçalves de Moura';
END $$;
