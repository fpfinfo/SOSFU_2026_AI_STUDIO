-- ================================================================================================
-- PREVENT CONFLICT OF INTEREST AND ENFORCE ACCOUNTABILITY SEGREGATION
-- ------------------------------------------------------------------------------------------------
-- Objective: Ensure that the analyst who processed/paid the ORIGINAL SOLICITATION cannot be assigned
--            as the analyst for the subsequent ACCOUNTABILITY analysis.
--
-- Logic:
-- 1. Create a trigger function `check_accountability_analyst_conflict`.
-- 2. On UPDATE/INSERT of `accountabilities.analyst_id`:
--    a. Join with `solicitations` table via `solicitation_id`.
--    b. Compare `solicitations.analyst_id` (Original Payer) with `NEW.analyst_id` (Accountability Analyst).
--    c. If they match, RAISE EXCEPTION 'CONSOL_CONFLICT: Analyst responsible for payment cannot audit accountability.'.
-- 3. Attach trigger to `accountabilities` table.
-- ================================================================================================

CREATE OR REPLACE FUNCTION check_accountability_analyst_conflict()
RETURNS TRIGGER AS $$
DECLARE
    original_analyst_id UUID;
BEGIN
    -- Only check if analyst_id is being set/changed and is not null
    IF NEW.analyst_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.analyst_id IS DISTINCT FROM OLD.analyst_id) THEN
        
        -- Get the analyst_id from the linked solicitation
        SELECT analyst_id INTO original_analyst_id
        FROM solicitations
        WHERE id = NEW.solicitation_id;

        -- If the new analyst is the same as the original payer, block it
        IF original_analyst_id IS NOT NULL AND NEW.analyst_id = original_analyst_id THEN
            RAISE EXCEPTION 'CONSOL_CONFLICT: O analista responsável pelo pagamento não pode auditar a prestação de contas deste processo. (Segregação de Função)';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to allow clean re-run
DROP TRIGGER IF EXISTS trg_check_accountability_conflict ON accountabilities;

-- Create Trigger
CREATE TRIGGER trg_check_accountability_conflict
    BEFORE INSERT OR UPDATE OF analyst_id ON accountabilities
    FOR EACH ROW
    EXECUTE FUNCTION check_accountability_analyst_conflict();
