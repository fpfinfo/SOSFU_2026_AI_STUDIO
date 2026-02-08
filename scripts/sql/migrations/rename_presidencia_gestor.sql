DO $$
BEGIN
    -- Update the name of the PRESIDENCIA_GESTOR role
    UPDATE public.dperfil
    SET name = 'Presidente do Tribunal'
    WHERE slug = 'PRESIDENCIA_GESTOR';

    RAISE NOTICE 'Role PRESIDENCIA_GESTOR renamed to Presidente do Tribunal';
END $$;
