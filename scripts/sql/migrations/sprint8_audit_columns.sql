-- Sprint 8: Audit Columns Migration
-- Applied: 2026-02-08
-- Purpose: Add structured audit tracking to accountability_items for SOSFU auditors

-- 1. Add audit tracking columns to accountability_items
ALTER TABLE accountability_items 
ADD COLUMN IF NOT EXISTS audit_reason TEXT,
ADD COLUMN IF NOT EXISTS audit_reason_code TEXT,
ADD COLUMN IF NOT EXISTS audited_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS audited_at TIMESTAMPTZ;

-- 2. Add diligencia and parecer fields to accountabilities
ALTER TABLE accountabilities
ADD COLUMN IF NOT EXISTS diligencia_notes TEXT,
ADD COLUMN IF NOT EXISTS diligencia_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS parecer_text TEXT,
ADD COLUMN IF NOT EXISTS parecer_generated_at TIMESTAMPTZ;

-- 3. Comments for documentation
COMMENT ON COLUMN accountability_items.audit_reason IS 'Free-text reason for glosa/rejection by SOSFU auditor';
COMMENT ON COLUMN accountability_items.audit_reason_code IS 'Coded reason: DATE_INVALID, ELEMENT_INVALID, NO_DISCRIMINATION, SUPPLIER_IRREGULAR, DUPLICATE, VALUE_MISMATCH, OTHER';
COMMENT ON COLUMN accountability_items.audited_by IS 'UUID of the SOSFU analyst who audited this item';
COMMENT ON COLUMN accountability_items.audited_at IS 'Timestamp of the audit decision';
COMMENT ON COLUMN accountabilities.diligencia_notes IS 'Notes from the SOSFU auditor when returning for correction';
COMMENT ON COLUMN accountabilities.diligencia_count IS 'Number of times this PC was returned for correction';
COMMENT ON COLUMN accountabilities.parecer_text IS 'AI-generated or manually edited technical opinion text';
COMMENT ON COLUMN accountabilities.parecer_generated_at IS 'Timestamp of parecer generation';

-- Reason codes reference:
-- DATE_INVALID     = Nota fiscal com data anterior à liberação do recurso (Art. 4º)
-- ELEMENT_INVALID  = Elemento de despesa fora dos autorizados (3.3.90.30/33/36/39)
-- NO_DISCRIMINATION = Nota fiscal não discrimina os itens adquiridos (Art. 4º, §2º)
-- SUPPLIER_IRREGULAR = Fornecedor com situação cadastral irregular perante a Receita Federal
-- DUPLICATE        = Comprovante já utilizado em outra prestação de contas
-- VALUE_MISMATCH   = Valor informado difere do constatado no comprovante original
-- OTHER            = Motivo especificado manualmente pelo auditor
