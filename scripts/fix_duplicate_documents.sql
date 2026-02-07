-- ============================================================
-- REMOÇÃO DE DOCUMENTOS DUPLICADOS (process_documents)
-- TJPA - SOSFU - 07/02/2026
-- ============================================================
-- Este script identifica e remove duplicatas de COVER, REQUEST
-- e ATTESTATION mantendo APENAS o registro mais antigo de cada
-- tipo por solicitação (solicitation_id + document_type).
-- ============================================================

-- 1. DIAGNÓSTICO: Visualizar duplicatas antes de remover
SELECT 
    pd.solicitation_id,
    s.process_number,
    pd.document_type,
    COUNT(*) as total,
    COUNT(*) - 1 as duplicatas_a_remover
FROM process_documents pd
LEFT JOIN solicitations s ON s.id = pd.solicitation_id
WHERE pd.document_type IN ('COVER', 'REQUEST', 'ATTESTATION')
GROUP BY pd.solicitation_id, s.process_number, pd.document_type
HAVING COUNT(*) > 1
ORDER BY s.process_number, pd.document_type;

-- 2. REMOÇÃO: Deleta duplicatas mantendo o mais antigo (menor created_at)
DELETE FROM process_documents
WHERE id IN (
    SELECT id FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY solicitation_id, document_type 
                ORDER BY created_at ASC
            ) as rn
        FROM process_documents
        WHERE document_type IN ('COVER', 'REQUEST', 'ATTESTATION')
    ) ranked
    WHERE rn > 1
);

-- 3. VERIFICAÇÃO: Confirmar que não restam duplicatas
SELECT 
    pd.solicitation_id,
    s.process_number,
    pd.document_type,
    pd.title,
    pd.created_at
FROM process_documents pd
LEFT JOIN solicitations s ON s.id = pd.solicitation_id
WHERE pd.document_type IN ('COVER', 'REQUEST', 'ATTESTATION')
ORDER BY s.process_number, pd.document_type, pd.created_at;
