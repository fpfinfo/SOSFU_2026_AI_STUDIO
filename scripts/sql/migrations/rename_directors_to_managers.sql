DO $$
BEGIN
    -- Rename SOSFU Director to Manager
    UPDATE public.dperfil
    SET name = 'Gerente SOSFU'
    WHERE slug = 'SOSFU_GESTOR';

    -- Rename SODPA Director to Manager
    UPDATE public.dperfil
    SET name = 'Gerente SODPA'
    WHERE slug = 'SODPA_GESTOR';

    RAISE NOTICE 'Roles SOSFU_GESTOR and SODPA_GESTOR renamed from Diretor to Gerente';
END $$;
