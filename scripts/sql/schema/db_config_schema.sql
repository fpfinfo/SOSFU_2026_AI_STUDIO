-- 1. TABELA DE CONFIGURAÇÕES GLOBAIS
-- Tabela "Singleton" (deve ter apenas 1 linha)
CREATE TABLE IF NOT EXISTS public.app_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id),
  
  -- Limites Financeiros
  max_value_extraordinary NUMERIC(10,2) DEFAULT 15000.00,
  
  -- Valores Unitários de Alimentação
  price_lunch NUMERIC(10,2) DEFAULT 30.00,
  price_dinner NUMERIC(10,2) DEFAULT 30.00,
  price_snack NUMERIC(10,2) DEFAULT 11.00,
  
  -- Limites de Pessoal (Júri)
  limit_servidor INTEGER DEFAULT 7,
  limit_defensor INTEGER DEFAULT 2,
  limit_promotor INTEGER DEFAULT 2,
  limit_policia INTEGER DEFAULT 5,
  limit_magistrado INTEGER DEFAULT 1,
  limit_apoio INTEGER DEFAULT 5,
  
  -- Controle do Sistema
  maintenance_mode BOOLEAN DEFAULT FALSE,
  version TEXT DEFAULT 'v3.1.0-beta'
);

-- 2. HABILITAR RLS
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS DE ACESSO
-- Todos (autenticados) podem LER as configurações para os formulários funcionarem
CREATE POLICY "Configurações visíveis para todos" 
ON public.app_config FOR SELECT 
USING (true);

-- Apenas ADMIN e SOSFU podem ATUALIZAR
CREATE POLICY "SOSFU atualiza configurações" 
ON public.app_config FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    JOIN public.dperfil dp ON p.perfil_id = dp.id
    WHERE p.id = auth.uid() AND dp.slug IN ('ADMIN', 'SOSFU')
  )
);

-- 4. SEED INICIAL (Garante que existe 1 linha)
INSERT INTO public.app_config (
    max_value_extraordinary, 
    price_lunch, price_dinner, price_snack,
    limit_servidor, limit_defensor, limit_promotor, limit_policia
)
SELECT 15000.00, 30.00, 30.00, 11.00, 10, 2, 2, 10
WHERE NOT EXISTS (SELECT 1 FROM public.app_config);
