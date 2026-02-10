-- Tabela de Logs de Auditoria para rastreamento granular de alterações
-- "Quem alterou o quê" - Transparência total para o usuário

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    solicitation_id UUID REFERENCES public.solicitations(id) ON DELETE CASCADE,
    action TEXT NOT NULL,           -- 'VALUE_CHANGED', 'ITEM_ADDED', 'ITEM_REMOVED', 'DOCUMENT_CREATED', 'PAYMENT_CONFIRMED', etc.
    actor_id UUID,                  -- user who performed action
    actor_name TEXT,                -- display name (cached for performance)
    field_name TEXT,                -- e.g. 'value', 'status', 'itens_despesa'
    old_value TEXT,                 -- previous value (as text/JSON)
    new_value TEXT,                 -- new value (as text/JSON)
    description TEXT,               -- human-readable: "Alterou valor de R$80 para R$120"
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para queries rápidas por processo
CREATE INDEX IF NOT EXISTS idx_audit_logs_solicitation ON public.audit_logs(solicitation_id, created_at DESC);

-- RLS: Leitura para todos os autenticados, escrita para todos os autenticados
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura audit logs" ON public.audit_logs;
CREATE POLICY "Leitura audit logs" ON public.audit_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Escrita audit logs" ON public.audit_logs;
CREATE POLICY "Escrita audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- Permissões
GRANT ALL ON TABLE public.audit_logs TO postgres, service_role;
GRANT ALL ON TABLE public.audit_logs TO authenticated;
