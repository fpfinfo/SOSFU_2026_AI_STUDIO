-- =====================================================
-- SCRIPT DE CORREÇÃO: Processos com documentos assinados
-- mas status não avançado para WAITING_SOSFU_PAYMENT
-- =====================================================
-- Execute este script para corrigir processos que tiveram
-- todas as sefin_signing_tasks assinadas mas o status da
-- solicitation não foi atualizado (race condition bug).
-- =====================================================

-- 1. Identificar processos afetados
-- (tasks todas SIGNED mas solicitation.status ainda em WAITING_SEFIN_SIGNATURE ou WAITING_SOSFU)
WITH stuck_processes AS (
    -- Processos com signing tasks, onde NENHUMA task está PENDING
    SELECT DISTINCT st.solicitation_id
    FROM sefin_signing_tasks st
    WHERE NOT EXISTS (
        SELECT 1 FROM sefin_signing_tasks st2
        WHERE st2.solicitation_id = st.solicitation_id
        AND st2.status = 'PENDING'
    )
    AND EXISTS (
        SELECT 1 FROM sefin_signing_tasks st3
        WHERE st3.solicitation_id = st.solicitation_id
        AND st3.status = 'SIGNED'
    )
),
affected AS (
    SELECT s.id, s.process_number, s.status, s.beneficiary
    FROM solicitations s
    JOIN stuck_processes sp ON sp.solicitation_id = s.id
    WHERE s.status IN ('WAITING_SEFIN_SIGNATURE', 'WAITING_SOSFU', 'WAITING_SOSFU_ANALYSIS')
)
SELECT * FROM affected;

-- 2. Corrigir: atualizar o status para WAITING_SOSFU_PAYMENT
UPDATE solicitations
SET status = 'WAITING_SOSFU_PAYMENT'
WHERE id IN (
    SELECT DISTINCT st.solicitation_id
    FROM sefin_signing_tasks st
    WHERE NOT EXISTS (
        SELECT 1 FROM sefin_signing_tasks st2
        WHERE st2.solicitation_id = st.solicitation_id
        AND st2.status = 'PENDING'
    )
    AND EXISTS (
        SELECT 1 FROM sefin_signing_tasks st3
        WHERE st3.solicitation_id = st.solicitation_id
        AND st3.status = 'SIGNED'
    )
)
AND status IN ('WAITING_SEFIN_SIGNATURE', 'WAITING_SOSFU', 'WAITING_SOSFU_ANALYSIS');

-- 3. Inserir registro de histórico para os processos corrigidos
INSERT INTO historico_tramitacao (solicitation_id, status_from, status_to, actor_name, description, created_at)
SELECT 
    s.id,
    s.status,
    'WAITING_SOSFU_PAYMENT',
    'SISTEMA (Correção automática)',
    'Status corrigido automaticamente: documentos assinados pelo Ordenador detectados.',
    NOW()
FROM solicitations s
WHERE s.id IN (
    SELECT DISTINCT st.solicitation_id
    FROM sefin_signing_tasks st
    WHERE NOT EXISTS (
        SELECT 1 FROM sefin_signing_tasks st2
        WHERE st2.solicitation_id = st.solicitation_id
        AND st2.status = 'PENDING'
    )
    AND EXISTS (
        SELECT 1 FROM sefin_signing_tasks st3
        WHERE st3.solicitation_id = st.solicitation_id
        AND st3.status = 'SIGNED'
    )
)
AND s.status = 'WAITING_SOSFU_PAYMENT'; -- Only insert for rows we just updated
