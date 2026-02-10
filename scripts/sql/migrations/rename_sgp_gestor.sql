DO $$
BEGIN
    -- Update the name of the SGP_GESTOR role
    UPDATE public.dperfil
    SET name = 'Secretária de Gestão de Pessoas'
    WHERE slug = 'SGP_GESTOR';

    RAISE NOTICE 'Role SGP_GESTOR renamed to Secretária de Gestão de Pessoas';
END $$;
