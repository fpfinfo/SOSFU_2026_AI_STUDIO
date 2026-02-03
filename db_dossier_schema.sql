-- Tabela de Documentos do Processo (Dossiê Digital)
CREATE TABLE IF NOT EXISTS public.process_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  solicitation_id UUID REFERENCES public.solicitations(id) ON DELETE CASCADE NOT NULL,
  
  title TEXT NOT NULL,          -- Ex: 'Capa do Processo', 'Requerimento Inicial'
  description TEXT,             -- Ex: 'Metadados estruturais', 'Assinado digitalmente'
  document_type TEXT NOT NULL,  -- 'COVER', 'REQUEST', 'INVOICE', 'PROOF'
  
  status TEXT DEFAULT 'GENERATED', -- 'GENERATED', 'SIGNED', 'PENDING_UPLOAD'
  
  -- Em um sistema real, aqui iria o URL do Supabase Storage. 
  -- Por enquanto, usaremos para renderizar o template dinamicamente.
  metadata JSONB DEFAULT '{}'::jsonb 
);

ALTER TABLE public.process_documents ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
GRANT ALL ON TABLE public.process_documents TO postgres, service_role;
GRANT ALL ON TABLE public.process_documents TO authenticated;

-- Policy: Ver documentos dos próprios processos ou se for ADMIN/SOSFU
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

CREATE POLICY "Criar documentos no fluxo" ON public.process_documents FOR INSERT WITH CHECK (true);
