-- ================================================================================================
-- CREATE OR UPDATE 'elementos_despesa' TABLE FOR EXPENSE MANAGEMENT
-- ------------------------------------------------------------------------------------------------
-- Objective: Ensure 'elementos_despesa' table exists and has a 'module' column for scoping.
-- SCOPE: SOSFU, SODPA, AMBOS
-- ================================================================================================

-- 1. Create table if not exists
CREATE TABLE IF NOT EXISTS elementos_despesa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    categoria TEXT,
    ativo BOOLEAN DEFAULT true,
    module TEXT DEFAULT 'AMBOS',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add seed data if table is empty
INSERT INTO elementos_despesa (codigo, descricao, categoria, module)
SELECT '3.3.90.30', 'Material de Consumo', 'Despesas Correntes', 'SOSFU'
WHERE NOT EXISTS (SELECT 1 FROM elementos_despesa WHERE codigo = '3.3.90.30');

INSERT INTO elementos_despesa (codigo, descricao, categoria, module)
SELECT '3.3.90.39', 'Outros Serviços de Terceiros - Pessoa Jurídica', 'Despesas Correntes', 'AMBOS'
WHERE NOT EXISTS (SELECT 1 FROM elementos_despesa WHERE codigo = '3.3.90.39');

INSERT INTO elementos_despesa (codigo, descricao, categoria, module)
SELECT '3.3.90.14', 'Diárias - Civil', 'Despesas Correntes', 'SODPA'
WHERE NOT EXISTS (SELECT 1 FROM elementos_despesa WHERE codigo = '3.3.90.14');

INSERT INTO elementos_despesa (codigo, descricao, categoria, module)
SELECT '3.3.90.33', 'Passagens e Despesas com Locomoção', 'Despesas Correntes', 'SODPA'
WHERE NOT EXISTS (SELECT 1 FROM elementos_despesa WHERE codigo = '3.3.90.33');

-- 3. Enable RLS
ALTER TABLE elementos_despesa ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Public Read, Admin Write)
DROP POLICY IF EXISTS "Enable read access for all users" ON elementos_despesa;
CREATE POLICY "Enable read access for all users" ON elementos_despesa FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable write access for admins and managers" ON elementos_despesa;
CREATE POLICY "Enable write access for admins and managers" ON elementos_despesa FOR ALL USING (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
  )
);
