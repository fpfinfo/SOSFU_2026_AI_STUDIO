-- Script para renomear/migrar o papel SODPA para SOSFU
-- Execute no Editor SQL do Supabase

DO $$
DECLARE
    v_sodpa_id UUID;
    v_sosfu_id UUID;
BEGIN
    -- 1. Identificar IDs
    SELECT id INTO v_sodpa_id FROM public.dperfil WHERE slug = 'SODPA';
    SELECT id INTO v_sosfu_id FROM public.dperfil WHERE slug = 'SOSFU';

    -- 2. Lógica de Migração
    IF v_sodpa_id IS NOT NULL THEN
        IF v_sosfu_id IS NOT NULL THEN
            -- Cenário A: Ambos existem.
            -- Ação: Movemos todos os usuários de SODPA para SOSFU e apagamos o SODPA.
            UPDATE public.profiles 
            SET perfil_id = v_sosfu_id 
            WHERE perfil_id = v_sodpa_id;

            DELETE FROM public.dperfil WHERE id = v_sodpa_id;
            
            RAISE NOTICE 'Conflito resolvido: Usuários migrados de SODPA para SOSFU. Perfil SODPA removido.';
        ELSE
            -- Cenário B: Apenas SODPA existe.
            -- Ação: Renomeamos SODPA para SOSFU.
            UPDATE public.dperfil 
            SET 
                slug = 'SOSFU', 
                name = 'Equipe Técnica SOSFU',
                description = 'Análise técnica de suprimentos de fundos.'
            WHERE id = v_sodpa_id;
            
            RAISE NOTICE 'Sucesso: Perfil SODPA renomeado para Equipe Técnica SOSFU.';
        END IF;
    ELSE
        -- Cenário C: SODPA não existe. Verificamos se SOSFU existe para garantir o nome correto.
        IF v_sosfu_id IS NOT NULL THEN
            UPDATE public.dperfil 
            SET name = 'Equipe Técnica SOSFU' 
            WHERE id = v_sosfu_id;
            
            RAISE NOTICE 'Ajuste: Nome do perfil SOSFU atualizado para Equipe Técnica SOSFU.';
        ELSE
            RAISE NOTICE 'Nada a fazer: Nenhum perfil SODPA ou SOSFU encontrado.';
        END IF;
    END IF;

    -- 3. Atualizar permissões/módulos do SOSFU para garantir acesso
    UPDATE public.dperfil
    SET allowed_modules = '["dashboard", "solicitations", "accountability", "reports", "settings"]'::jsonb
    WHERE slug = 'SOSFU';

END $$;