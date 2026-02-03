-- 0. CRIAÇÃO DA TABELA (Garante que existe antes do trigger)
CREATE TABLE IF NOT EXISTS public.process_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  solicitation_id UUID REFERENCES public.solicitations(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL,
  status TEXT DEFAULT 'GENERATED',
  metadata JSONB DEFAULT '{}'::jsonb 
);

-- Habilitar RLS
ALTER TABLE public.process_documents ENABLE ROW LEVEL SECURITY;

-- Permissões
GRANT ALL ON TABLE public.process_documents TO postgres, service_role;
GRANT ALL ON TABLE public.process_documents TO authenticated;

-- Políticas de Segurança (Bloco DO para evitar erro se já existirem)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'process_documents' AND policyname = 'Ver documentos permitidos') THEN
        CREATE POLICY "Ver documentos permitidos" ON public.process_documents 
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM public.solicitations s
            WHERE s.id = process_documents.solicitation_id
            AND (s.user_id = auth.uid() OR 
                 EXISTS (
                    SELECT 1 FROM public.profiles p 
                    JOIN public.dperfil dp ON p.perfil_id = dp.id
                    WHERE p.id = auth.uid() AND dp.slug IN ('ADMIN', 'SOSFU', 'SEFIN')
                 )
            )
          )
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'process_documents' AND policyname = 'Criar documentos no fluxo') THEN
        CREATE POLICY "Criar documentos no fluxo" ON public.process_documents FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- 1. FUNÇÃO: Gerar Documentos do Dossiê Automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_solicitation_docs()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir CAPA DO PROCESSO
  INSERT INTO public.process_documents (solicitation_id, title, description, document_type, status, created_at)
  VALUES (
    NEW.id,
    'CAPA DO PROCESSO',
    'Identificação oficial do protocolo e metadados estruturais.',
    'COVER',
    'GENERATED',
    NEW.created_at
  );

  -- Inserir REQUERIMENTO INICIAL
  INSERT INTO public.process_documents (solicitation_id, title, description, document_type, status, created_at)
  VALUES (
    NEW.id,
    'REQUERIMENTO INICIAL',
    'Justificativa e plano de aplicação assinado digitalmente.',
    'REQUEST',
    'GENERATED',
    NEW.created_at + interval '1 second' -- Adiciona 1 segundo para ordenação visual
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. TRIGGER: Aciona a função após inserir na tabela solicitations
DROP TRIGGER IF EXISTS trg_generate_docs ON public.solicitations;
CREATE TRIGGER trg_generate_docs
  AFTER INSERT ON public.solicitations
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_solicitation_docs();

-- 3. CORREÇÃO RETROATIVA (FIX): Gera documentos para quem não tem (incluindo o que deu erro)
-- Insere Capa
INSERT INTO public.process_documents (solicitation_id, title, description, document_type, status, created_at)
SELECT s.id, 'CAPA DO PROCESSO', 'Identificação oficial do protocolo (Gerado via Correção).', 'COVER', 'GENERATED', s.created_at
FROM public.solicitations s
WHERE NOT EXISTS (
    SELECT 1 FROM public.process_documents pd 
    WHERE pd.solicitation_id = s.id AND pd.document_type = 'COVER'
);

-- Insere Requerimento
INSERT INTO public.process_documents (solicitation_id, title, description, document_type, status, created_at)
SELECT s.id, 'REQUERIMENTO INICIAL', 'Justificativa e plano de aplicação (Gerado via Correção).', 'REQUEST', 'GENERATED', s.created_at + interval '1 second'
FROM public.solicitations s
WHERE NOT EXISTS (
    SELECT 1 FROM public.process_documents pd 
    WHERE pd.solicitation_id = s.id AND pd.document_type = 'REQUEST'
);