
-- ==========================================
-- 4. CONFIGURAÇÕES DE GESTÃO (PARÂMETROS)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.management_settings (
  module TEXT PRIMARY KEY, -- 'suprimento', 'diarias', 'reembolsos', 'contas'
  expense_limit DECIMAL(12,2) DEFAULT 5000.00,
  submission_deadline_days INTEGER DEFAULT 5,
  audit_auto_approve_score INTEGER DEFAULT 85,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.management_settings ENABLE ROW LEVEL SECURITY;

-- Política de Leitura (Todos os autenticados podem ver as regras do sistema)
CREATE POLICY "Permitir leitura de settings para todos" ON public.management_settings
FOR SELECT TO authenticated USING (true);

-- Política de Escrita (Apenas ADMIN ou gestores do respectivo módulo podem editar)
-- Para simplificar, permitiremos apenas ADMIN por enquanto
CREATE POLICY "Apenas ADMIN edita settings" ON public.management_settings
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.system_role = 'ADMIN'
  )
);

-- Carga inicial de parâmetros padrão
INSERT INTO public.management_settings (module, expense_limit, submission_deadline_days, audit_auto_approve_score) VALUES
('suprimento', 8000.00, 5, 90),
('diarias', 3500.00, 7, 85),
('reembolsos', 2000.00, 30, 80),
('contas', 10000.00, 10, 95)
ON CONFLICT (module) DO NOTHING;
