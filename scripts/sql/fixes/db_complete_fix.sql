-- ==============================================================================
-- SCRIPT DE CORREÇÃO GERAL E REPARO DO DOSSIÊ DIGITAL (SOSFU TJPA)
-- Execute este script no SQL Editor do Supabase para corrigir falhas de documentos.
-- ==============================================================================

-- 1. GARANTIA DE TABELAS (Estrutura do Dossiê)
CREATE TABLE IF NOT EXISTS public.process_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  solicitation_id UUID REFERENCES public.solicitations(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL, -- Ex: 'COVER', 'REQUEST', 'ATTESTATION'
  status TEXT DEFAULT 'GENERATED',
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. CORREÇÃO DE PERMISSÕES DE SEGURANÇA (RLS)
-- Habilita segurança nas tabelas críticas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dperfil ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_documents ENABLE ROW LEVEL SECURITY;

-- Política: Perfis e Cargos devem ser visíveis para o sistema funcionar
DROP POLICY IF EXISTS "Leitura Geral Perfis" ON public.profiles;
CREATE POLICY "Leitura Geral Perfis" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Leitura Geral Cargos" ON public.dperfil;
CREATE POLICY "Leitura Geral Cargos" ON public.dperfil FOR SELECT USING (true);

-- Política: Documentos devem ser visíveis e criáveis
DROP POLICY IF EXISTS "Acesso Total Documentos" ON public.process_documents;
CREATE POLICY "Acesso Total Documentos" ON public.process_documents FOR ALL USING (true);

-- 3. RECRIAÇÃO DA LÓGICA DE AUTOMAÇÃO (Trigger)
-- Removemos versões antigas para evitar conflitos
DROP TRIGGER IF EXISTS trg_generate_docs ON public.solicitations;
DROP FUNCTION IF EXISTS public.handle_new_solicitation_docs();

-- Função que insere a Capa e o Requerimento automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_solicitation_docs()
RETURNS TRIGGER AS $$
BEGIN
  -- A. Gera a Capa do Processo
  INSERT INTO public.process_documents (solicitation_id, title, description, document_type, status, created_at)
  VALUES (NEW.id, 'CAPA DO PROCESSO', 'Identificação oficial do protocolo e metadados.', 'COVER', 'GENERATED', NEW.created_at);

  -- B. Gera o Requerimento Inicial
  INSERT INTO public.process_documents (solicitation_id, title, description, document_type, status, created_at)
  VALUES (NEW.id, 'REQUERIMENTO INICIAL', 'Justificativa e plano de aplicação.', 'REQUEST', 'GENERATED', NEW.created_at + interval '1 second');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- 'SECURITY DEFINER' garante permissão de admin ao trigger

-- Ativa o Trigger na tabela de solicitações
CREATE TRIGGER trg_generate_docs
  AFTER INSERT ON public.solicitations
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_solicitation_docs();

-- 4. CORREÇÃO RETROATIVA (O "Pulo do Gato")
-- Varre o banco em busca de solicitações que ficaram sem documentos e corrige agora.
DO $$
DECLARE
    r RECORD;
    count_fixed INTEGER := 0;
BEGIN
    FOR r IN SELECT * FROM public.solicitations s 
             WHERE NOT EXISTS (SELECT 1 FROM public.process_documents pd WHERE pd.solicitation_id = s.id)
    LOOP
        -- Inserção manual para processos órfãos
        INSERT INTO public.process_documents (solicitation_id, title, description, document_type, status, created_at)
        VALUES (r.id, 'CAPA DO PROCESSO', 'Gerado via Correção Automática', 'COVER', 'GENERATED', r.created_at);
        
        INSERT INTO public.process_documents (solicitation_id, title, description, document_type, status, created_at)
        VALUES (r.id, 'REQUERIMENTO INICIAL', 'Gerado via Correção Automática', 'REQUEST', 'GENERATED', r.created_at + interval '1 second');
        
        count_fixed := count_fixed + 1;
    END LOOP;
    
    RAISE NOTICE 'Correção concluída. % processos foram reparados.', count_fixed;
END $$;
