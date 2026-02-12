-- ================================================================================================
-- ADD PERFORMANCE INDEXES FOR SOLICITATIONS AND RELATED TABLES
-- ------------------------------------------------------------------------------------------------
-- Objetivo: Acelerar as queries mais frequentes identificadas nos cockpits e dashboards.
-- As queries filtram predominantemente por: status, analyst_id, user_id, created_at.
-- ================================================================================================

-- 1. Indice em solicitations.status (filtro mais usado em todos os cockpits)
CREATE INDEX IF NOT EXISTS idx_solicitations_status
    ON solicitations (status);

-- 2. Indice em solicitations.analyst_id (filtro "minha mesa")
CREATE INDEX IF NOT EXISTS idx_solicitations_analyst_id
    ON solicitations (analyst_id);

-- 3. Indice em solicitations.created_at (ordenacao padrao DESC)
CREATE INDEX IF NOT EXISTS idx_solicitations_created_at
    ON solicitations (created_at DESC);

-- 4. Indice composto status + created_at (query mais comum: listar por status ordenado por data)
CREATE INDEX IF NOT EXISTS idx_solicitations_status_created_at
    ON solicitations (status, created_at DESC);

-- 5. Indice em solicitations.requester_id (filtro do gestor)
CREATE INDEX IF NOT EXISTS idx_solicitations_requester_id
    ON solicitations (requester_id);

-- 6. Indice em solicitations.user_id (filtro do suprido)
CREATE INDEX IF NOT EXISTS idx_solicitations_user_id
    ON solicitations (user_id);

-- 7. Indice em accountabilities.status (filtro de prestacoes de contas)
CREATE INDEX IF NOT EXISTS idx_accountabilities_status
    ON accountabilities (status);

-- 8. Indice em accountabilities.analyst_id
CREATE INDEX IF NOT EXISTS idx_accountabilities_analyst_id
    ON accountabilities (analyst_id);

-- 9. Indice em accountabilities.solicitation_id (JOIN frequente)
CREATE INDEX IF NOT EXISTS idx_accountabilities_solicitation_id
    ON accountabilities (solicitation_id);

-- 10. Indice em team_members.module (filtro de equipe por modulo)
CREATE INDEX IF NOT EXISTS idx_team_members_module
    ON team_members (module);

-- 11. Indice em team_members.user_id (lookup de membro)
CREATE INDEX IF NOT EXISTS idx_team_members_user_id
    ON team_members (user_id);
