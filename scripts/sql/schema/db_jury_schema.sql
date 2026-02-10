
-- Tabela para itens detalhados da solicitação (Júri e outros)
CREATE TABLE IF NOT EXISTS public.solicitation_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitation_id UUID REFERENCES public.solicitations(id) ON DELETE CASCADE NOT NULL,
  
  category TEXT NOT NULL, -- 'PARTICIPANT' ou 'EXPENSE'
  item_name TEXT NOT NULL,
  element_code TEXT, -- Para despesas (ex: 3.3.90.30.01)
  
  -- Valores Solicitados (Snapshot original)
  qty_requested NUMERIC(10,2) DEFAULT 0,
  unit_price_requested NUMERIC(10,2) DEFAULT 0,
  total_requested NUMERIC(10,2) GENERATED ALWAYS AS (qty_requested * unit_price_requested) STORED,
  
  -- Valores Aprovados (Editável pela SOSFU)
  qty_approved NUMERIC(10,2) DEFAULT 0,
  unit_price_approved NUMERIC(10,2) DEFAULT 0,
  -- total_approved é calculado na query ou view, mas podemos armazenar para facilitar
  total_approved NUMERIC(10,2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.solicitation_items ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.solicitation_items TO authenticated;
GRANT ALL ON TABLE public.solicitation_items TO service_role;

-- Políticas
CREATE POLICY "Acesso total a itens" ON public.solicitation_items FOR ALL USING (true);
