
-- ==============================================================================
-- CORREÇÃO FINA DE NUMERAÇÃO (REFINAMENTO JÚRI VS EMERGENCIAL)
-- Corrige falsos positivos onde 'JURISDICIONAL' estava sendo lido como 'JURI'.
-- Execute este script no SQL Editor do Supabase.
-- ==============================================================================

DO $$
DECLARE
    r RECORD;
    new_prefix TEXT;
    numeric_part TEXT;
    new_process_number TEXT;
    count_updated INTEGER := 0;
    text_check TEXT;
BEGIN
    -- Itera sobre todas as solicitações para garantir consistência
    FOR r IN SELECT id, process_number, unit, justification FROM public.solicitations 
    LOOP
        -- Concatena Unit e Justification para análise
        text_check := UPPER(COALESCE(r.unit, '') || ' ' || COALESCE(r.justification, ''));

        -- 1. Lógica de Classificação Refinada
        -- Usa Regex (\y) para garantir que JURI seja uma palavra inteira, evitando 'JURISDICIONAL'
        -- Aceita JÚRI (com acento) como substring normal
        IF (
            text_check LIKE '%JÚRI%' OR 
            text_check LIKE '%JURADO%' OR 
            text_check LIKE '%CONSELHO DE SENTENÇA%' OR
            text_check ~* '\yJURI\y' -- Regex: Match "JURI" apenas se for palavra exata
        ) THEN
            new_prefix := 'TJPA-JUR-';
        ELSE
            -- Se não cair nos critérios estritos de Júri, é Extra-Emergencial
            new_prefix := 'TJPA-EXT-';
        END IF;

        -- 2. Extração da parte numérica (Ano/Numero)
        -- Regex para capturar padrão AAAA/NNNN independentemente do prefixo atual
        numeric_part := substring(r.process_number from '[0-9]{4}/[0-9]+');
        
        -- 3. Constrói e Atualiza
        IF numeric_part IS NOT NULL THEN
            new_process_number := new_prefix || numeric_part;

            -- Só atualiza se o número for diferente (Evita updates desnecessários)
            IF new_process_number != r.process_number THEN
                UPDATE public.solicitations
                SET process_number = new_process_number
                WHERE id = r.id;

                count_updated := count_updated + 1;
            END IF;
        END IF;

    END LOOP;

    RAISE NOTICE 'Refinamento concluído. % processos foram corrigidos.', count_updated;
END $$;
