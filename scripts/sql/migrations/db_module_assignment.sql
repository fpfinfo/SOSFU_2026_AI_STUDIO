-- ============================================================
-- MIGRAÇÃO: Lógica de Atribuição para Todos os Módulos
-- Data: 2026-02-09
-- Objetivo: Permitir que membros da equipe atribuam processos
--           para si e para colegas em SEFIN, AJSEFIN e SGP
-- ============================================================

-- 1. ADICIONAR COLUNA assigned_to EM process_documents (SEFIN)
-- Permite saber quem está responsável por assinar cada documento
ALTER TABLE public.process_documents 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id);

-- 1b. ADICIONAR COLUNA assigned_to EM sefin_signing_tasks (SEFIN)
-- Garante que a atribuição reflita na tabela de tarefas específica
CREATE TABLE IF NOT EXISTS public.sefin_signing_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitation_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  value NUMERIC,
  status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  signed_by UUID REFERENCES public.profiles(id),
  signed_at TIMESTAMP WITH TIME ZONE,
  origin TEXT
);
ALTER TABLE public.sefin_signing_tasks 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id);


-- 2. ADICIONAR COLUNA ajsefin_analyst_id EM solicitations
-- Permite atribuição específica para análise jurídica (AJSEFIN)
ALTER TABLE public.solicitations 
ADD COLUMN IF NOT EXISTS ajsefin_analyst_id UUID REFERENCES public.profiles(id);

-- 3. ADICIONAR COLUNA sgp_analyst_id EM solicitations  
-- Permite atribuição específica para autorização (SGP)
ALTER TABLE public.solicitations 
ADD COLUMN IF NOT EXISTS sgp_analyst_id UUID REFERENCES public.profiles(id);

-- 4. ADICIONAR COLUNA sefin_analyst_id EM solicitations
-- Permite atribuição específica para ordenação de despesa (SEFIN)
ALTER TABLE public.solicitations 
ADD COLUMN IF NOT EXISTS sefin_analyst_id UUID REFERENCES public.profiles(id);

-- 5. POLÍTICA DE ATUALIZAÇÃO PARA SEFIN
-- Garante que membros da SEFIN possam atualizar documentos
DROP POLICY IF EXISTS "SEFIN gerencia documentos" ON public.process_documents;
CREATE POLICY "SEFIN gerencia documentos" ON public.process_documents
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    JOIN public.dperfil dp ON p.perfil_id = dp.id
    WHERE p.id = auth.uid() AND dp.slug IN ('ADMIN', 'SEFIN')
  )
);

-- 6. POLÍTICA DE ATUALIZAÇÃO PARA AJSEFIN
-- Garante que membros da AJSEFIN possam atualizar solicitações
DROP POLICY IF EXISTS "AJSEFIN gerencia parecer" ON public.solicitations;
CREATE POLICY "AJSEFIN gerencia parecer" ON public.solicitations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    JOIN public.dperfil dp ON p.perfil_id = dp.id
    WHERE p.id = auth.uid() AND dp.slug IN ('ADMIN', 'AJSEFIN')
  )
);

-- 7. POLÍTICA DE ATUALIZAÇÃO PARA SGP
-- Garante que membros do SGP possam atualizar solicitações
DROP POLICY IF EXISTS "SGP gerencia autorizacao" ON public.solicitations;
CREATE POLICY "SGP gerencia autorizacao" ON public.solicitations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    JOIN public.dperfil dp ON p.perfil_id = dp.id
    WHERE p.id = auth.uid() AND dp.slug IN ('ADMIN', 'SGP')
  )
);

-- 8. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_process_documents_assigned_to ON public.process_documents(assigned_to);
CREATE INDEX IF NOT EXISTS idx_solicitations_ajsefin_analyst ON public.solicitations(ajsefin_analyst_id);
CREATE INDEX IF NOT EXISTS idx_solicitations_sgp_analyst ON public.solicitations(sgp_analyst_id);
CREATE INDEX IF NOT EXISTS idx_solicitations_sefin_analyst ON public.solicitations(sefin_analyst_id);

-- FIM DA MIGRAÇÃO
