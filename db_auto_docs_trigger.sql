-- ============================================================
-- SCRIPT DE CORREÇÃO E AUTOMAÇÃO DO DOSSIÊ DIGITAL
-- Execute este script completo no SQL Editor do Supabase
-- ============================================================

-- 1. LIMPEZA PREVENTIVA
-- Removemos a função e trigger antigos para garantir que a nova versão seja aplicada
DROP TRIGGER IF EXISTS trg_generate_docs ON public.solicitations;
DROP FUNCTION IF EXISTS public.handle_new_solicitation_docs();

-- 2. CRIAÇÃO DA FUNÇÃO GERADORA
-- Esta função é chamada automaticamente sempre que uma nova linha entra na tabela 'solicitations'
CREATE OR REPLACE FUNCTION public.handle_new_solicitation_docs()
RETURNS TRIGGER AS $$
BEGIN
  -- A. GERAÇÃO DA CAPA DO PROCESSO
  -- Verifica se já existe para evitar duplicidade (em casos de update)
  IF NOT EXISTS (SELECT 1 FROM public.process_documents WHERE solicitation_id = NEW.id AND document_type = 'COVER') THEN
      INSERT INTO public.process_documents (
        solicitation_id, 
        title, 
        description, 
        document_type, 
        status, 
        created_at
      )
      VALUES (
        NEW.id,
        'CAPA DO PROCESSO',
        'Identificação oficial do protocolo e metadados estruturais.',
        'COVER',
        'GENERATED',
        NEW.created_at
      );
  END IF;

  -- B. GERAÇÃO DO REQUERIMENTO INICIAL
  IF NOT EXISTS (SELECT 1 FROM public.process_documents WHERE solicitation_id = NEW.id AND document_type = 'REQUEST') THEN
      INSERT INTO public.process_documents (
        solicitation_id, 
        title, 
        description, 
        document_type, 
        status, 
        created_at
      )
      VALUES (
        NEW.id,
        'REQUERIMENTO INICIAL',
        'Justificativa e plano de aplicação assinado digitalmente.',
        'REQUEST',
        'GENERATED',
        NEW.created_at + interval '1 second' -- Adiciona 1 segundo para garantir a ordem visual
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 
-- 'SECURITY DEFINER' é crucial: permite que a função rode com permissões de admin, 
-- ignorando restrições de RLS do usuário que está inserindo.

-- 3. CRIAÇÃO DO TRIGGER (GATILHO)
-- Vincula a função acima à tabela de solicitações
CREATE TRIGGER trg_generate_docs
  AFTER INSERT ON public.solicitations
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_solicitation_docs();

-- 4. CORREÇÃO RETROATIVA (IMPORTANTÍSSIMO)
-- Este bloco varre todas as solicitações existentes que porventura ficaram sem documentos
-- e gera os documentos faltantes agora.

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Loop para Capas faltantes
    FOR r IN SELECT * FROM public.solicitations s 
             WHERE NOT EXISTS (SELECT 1 FROM public.process_documents pd WHERE pd.solicitation_id = s.id AND pd.document_type = 'COVER')
    LOOP
        INSERT INTO public.process_documents (solicitation_id, title, description, document_type, status, created_at)
        VALUES (r.id, 'CAPA DO PROCESSO', 'Identificação oficial (Gerado via Correção)', 'COVER', 'GENERATED', r.created_at);
    END LOOP;

    -- Loop para Requerimentos faltantes
    FOR r IN SELECT * FROM public.solicitations s 
             WHERE NOT EXISTS (SELECT 1 FROM public.process_documents pd WHERE pd.solicitation_id = s.id AND pd.document_type = 'REQUEST')
    LOOP
        INSERT INTO public.process_documents (solicitation_id, title, description, document_type, status, created_at)
        VALUES (r.id, 'REQUERIMENTO INICIAL', 'Justificativa e plano (Gerado via Correção)', 'REQUEST', 'GENERATED', r.created_at + interval '1 second');
    END LOOP;
    
    RAISE NOTICE 'Script executado com sucesso. Automação reativada e documentos retroativos gerados.';
END $$;
