-- Migração para controle de sequenciais de NUP por prefixo e ano
CREATE TABLE IF NOT EXISTS public.nup_sequences (
  prefix TEXT NOT NULL,
  year INTEGER NOT NULL,
  last_value INTEGER DEFAULT 0,
  PRIMARY KEY (prefix, year)
);

-- Habilitar RLS na tabela de sequencial
ALTER TABLE public.nup_sequences ENABLE ROW LEVEL SECURITY;

-- Política para permitir que qualquer usuário autenticado use a função via RPC (a função é SECURITY DEFINER)
CREATE POLICY "Acesso controlado pelo sistema" ON public.nup_sequences
FOR ALL TO authenticated USING (true);

-- Função para gerar o próximo NUP de forma atômica
CREATE OR REPLACE FUNCTION generate_next_nup(p_prefix TEXT)
RETURNS TEXT AS $$
DECLARE
  v_year INTEGER;
  v_next_val INTEGER;
  v_separator TEXT := '-';
BEGIN
  -- Definir separador baseado no prefixo (seguindo o exemplo da tabela)
  -- Para ORD e DIP/REE usa-se '/' em alguns exemplos, mas manteremos '-' para padronizar ou '/' se explicitado.
  -- O usuário mostrou: TJPA-ORD-2026/0001 e TJPA-DIP-2026/0001
  -- Vamos usar '/' no separador final se for ORD, DIP ou REE.
  
  v_year := EXTRACT(YEAR FROM NOW())::INTEGER;
  
  INSERT INTO public.nup_sequences (prefix, year, last_value)
  VALUES (p_prefix, v_year, 1)
  ON CONFLICT (prefix, year) 
  DO UPDATE SET last_value = nup_sequences.last_value + 1
  RETURNING last_value INTO v_next_val;
  
  IF p_prefix IN ('ORD', 'DIP', 'REE') THEN
    v_separator := '/';
  END IF;

  RETURN 'TJPA-' || p_prefix || '-' || v_year::TEXT || v_separator || LPAD(v_next_val::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
