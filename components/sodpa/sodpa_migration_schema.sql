-- ════════════════════════════════════════════════════════════════════════════════
-- Módulo SODPA - Tabelas de Suporte
-- ════════════════════════════════════════════════════════════════════════════════

-- 0. Garantir Role SODPA
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.sys_roles WHERE slug = 'SODPA') THEN
        INSERT INTO public.sys_roles (slug, name, description, is_system_role)
        VALUES ('SODPA', 'Gestão de Diárias', 'Equipe de Análise de Diárias e Passagens', true);
    END IF;
END $$;

-- 1. Tabela para gestão de processos de diárias e passagens
CREATE TABLE IF NOT EXISTS public.solicitations_sodpa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solicitation_id UUID REFERENCES public.solicitations(id) ON DELETE CASCADE,
    process_number VARCHAR(20) NOT NULL UNIQUE,
    beneficiary_name VARCHAR(255) NOT NULL,
    beneficiary_cpf VARCHAR(14) NOT NULL,
    beneficiary_cargo VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count DECIMAL(5, 1) NOT NULL,
    daily_rate DECIMAL(10, 2) NOT NULL,
    total_value DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'WAITING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadados de Passagem
    passage_requested BOOLEAN DEFAULT FALSE,
    passage_status VARCHAR(50),
    voucher_code VARCHAR(50),
    airline VARCHAR(100),
    flight_cost DECIMAL(10, 2) DEFAULT 0
);

-- 2. Tabela para prestação de contas
CREATE TABLE IF NOT EXISTS public.accountabilities_sodpa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_id UUID REFERENCES public.solicitations_sodpa(id) ON DELETE CASCADE,
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    trip_start_date DATE,
    trip_end_date DATE,
    actual_days_count DECIMAL(5, 1),
    amount_granted DECIMAL(10, 2),
    amount_spent DECIMAL(10, 2),
    amount_to_return DECIMAL(10, 2) GENERATED ALWAYS AS (amount_granted - amount_spent) STORED,
    status VARCHAR(50) DEFAULT 'PENDING',
    analyst_comments TEXT,
    
    -- Flags de Documentos
    has_boarding_pass BOOLEAN DEFAULT FALSE,
    has_receipts BOOLEAN DEFAULT FALSE,
    has_trip_report BOOLEAN DEFAULT FALSE,
    documents_url TEXT[] DEFAULT '{}'
);

-- 3. Tabela de Configurações do Módulo
CREATE TABLE IF NOT EXISTS public.sodpa_configs (
    key VARCHAR(50) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Seed Inicial de Configurações
INSERT INTO public.sodpa_configs (key, value)
VALUES 
    ('diarias_rates', '[
        {"cargo": "DESEMBARGADOR", "nacional": 680.00, "internacional": 450.00},
        {"cargo": "JUIZ_TITULAR", "nacional": 578.00, "internacional": 382.50}
    ]'),
    ('limites', '{
        "max_dias_viagem": 30,
        "valor_maximo_passagem": 5000.00
    }')
ON CONFLICT (key) DO NOTHING;

-- Índices e Segurança
CREATE INDEX IF NOT EXISTS idx_sodpa_solicitations_status ON public.solicitations_sodpa(status);
CREATE INDEX IF NOT EXISTS idx_sodpa_accountabilities_status ON public.accountabilities_sodpa(status);

ALTER TABLE public.solicitations_sodpa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountabilities_sodpa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sodpa_configs ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS Corrigidas (RBAC via sys_roles)

-- Excluir políticas antigas se existirem para evitar conflitos
DROP POLICY IF EXISTS "SODPA Analysts can view all" ON public.solicitations_sodpa;
DROP POLICY IF EXISTS "Beneficiaries can view own" ON public.solicitations_sodpa;

CREATE POLICY "SODPA Analysts can view all" ON public.solicitations_sodpa
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.sys_user_roles sur
            JOIN public.sys_roles sr ON sur.role_id = sr.id
            WHERE sur.user_id = auth.uid()
            AND sr.slug IN ('SODPA', 'ADMIN', 'SOSFU')
        )
    );

CREATE POLICY "Beneficiaries can view own" ON public.solicitations_sodpa
    FOR SELECT USING (
        beneficiary_cpf = (SELECT cpf FROM public.profiles WHERE id = auth.uid())
    );
