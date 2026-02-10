-- 1. Tabela de Itens da Prestação de Contas (Notas Fiscais/Recibos)
CREATE TABLE IF NOT EXISTS public.accountability_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  accountability_id UUID REFERENCES public.accountabilities(id) ON DELETE CASCADE NOT NULL,
  
  item_date DATE NOT NULL,
  description TEXT NOT NULL, -- Descrição do item/serviço
  supplier TEXT NOT NULL,    -- Fornecedor/Prestador
  doc_number TEXT,           -- Número da NF/Recibo
  
  element_code TEXT,         -- Elemento de Despesa (ex: 3.3.90.30)
  
  value NUMERIC(10,2) NOT NULL,
  
  receipt_url TEXT,          -- URL do comprovante (Storage)
  status TEXT DEFAULT 'PENDING' -- PENDING, APPROVED, REJECTED (pela SOSFU)
);

-- 2. Atualizar Status permitidos na tabela accountabilities
ALTER TABLE public.accountabilities DROP CONSTRAINT IF EXISTS accountabilities_status_check;
ALTER TABLE public.accountabilities 
ADD CONSTRAINT accountabilities_status_check 
CHECK (status IN ('DRAFT', 'WAITING_MANAGER', 'WAITING_SOSFU', 'APPROVED', 'CORRECTION', 'LATE'));

-- Adiciona campos de resumo na tabela accountabilities
ALTER TABLE public.accountabilities ADD COLUMN IF NOT EXISTS total_spent NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.accountabilities ADD COLUMN IF NOT EXISTS balance NUMERIC(10,2) DEFAULT 0; -- Saldo (A devolver ou zerado)
ALTER TABLE public.accountabilities ADD COLUMN IF NOT EXISTS return_proof_url TEXT; -- Comprovante de devolução de saldo (GRU)

-- 3. RLS e Permissões
ALTER TABLE public.accountability_items ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.accountability_items TO authenticated;

-- Policy: Ver itens
CREATE POLICY "Ver itens permitidos" ON public.accountability_items 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.accountabilities a
    JOIN public.solicitations s ON a.solicitation_id = s.id
    WHERE a.id = accountability_items.accountability_id
    AND (
        s.user_id = auth.uid() OR -- Dono
        s.manager_email = (SELECT email FROM public.profiles WHERE id = auth.uid()) OR -- Gestor
        EXISTS (SELECT 1 FROM public.profiles p JOIN public.dperfil dp ON p.perfil_id = dp.id WHERE p.id = auth.uid() AND dp.slug IN ('ADMIN', 'SOSFU', 'SEFIN')) -- Staff
    )
  )
);

-- Policy: Editar itens (Apenas dono se estiver em DRAFT ou CORRECTION)
CREATE POLICY "Editar itens proprios" ON public.accountability_items 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.accountabilities a
    JOIN public.solicitations s ON a.solicitation_id = s.id
    WHERE a.id = accountability_items.accountability_id
    AND s.user_id = auth.uid()
    AND a.status IN ('DRAFT', 'CORRECTION')
  )
);
