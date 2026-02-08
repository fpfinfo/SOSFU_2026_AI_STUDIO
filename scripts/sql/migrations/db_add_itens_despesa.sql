-- Adiciona coluna itens_despesa na tabela solicitations
-- JSONB para armazenar múltiplos itens de despesa por solicitação
-- Formato: [{ element: "3.3.90.30", description: "Material de Consumo", total: 100, qty: 1, val: 100 }]

ALTER TABLE public.solicitations
ADD COLUMN IF NOT EXISTS itens_despesa JSONB DEFAULT '[]'::jsonb;

-- Garante permissões
GRANT ALL ON TABLE public.solicitations TO authenticated;
