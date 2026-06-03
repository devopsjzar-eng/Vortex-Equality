-- PERMANENT FIX: Block $0 deposit members from claiming profit at DATABASE LEVEL
-- This ensures NO WAY member dapat bypass dengan caching atau stale data

-- STEP 1: Add database TRIGGER untuk validate member activation sebelum profit claim di-insert
CREATE OR REPLACE FUNCTION validate_profit_claim_member_activation()
RETURNS TRIGGER AS $$
DECLARE
  total_actual_deposits NUMERIC;
BEGIN
  -- Calculate actual successful deposits for this user
  SELECT COALESCE(SUM(amount), 0)
  INTO total_actual_deposits
  FROM transactions
  WHERE user_id = NEW.user_id
    AND type = 'deposit'
    AND status = 'success';
  
  -- BLOCK: If member has $0 actual deposits, reject profit claim
  IF total_actual_deposits < 50 THEN
    RAISE EXCEPTION 'Member has insufficient deposits ($%). Cannot claim profit.', total_actual_deposits;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_validate_profit_claim_activation ON transactions;

-- Create trigger to run BEFORE insert on profit_claim
CREATE TRIGGER trg_validate_profit_claim_activation
BEFORE INSERT ON transactions
FOR EACH ROW
WHEN (NEW.type = 'profit_claim')
EXECUTE FUNCTION validate_profit_claim_member_activation();

-- STEP 2: Add CHECK CONSTRAINT untuk ensure profit claim only for active members
-- (this is redundant with trigger but provides additional database safety)
ALTER TABLE transactions
ADD CONSTRAINT chk_profit_claim_requires_deposit
CHECK (
  type != 'profit_claim' OR (
    -- For profit claims, verify user has deposit >= 50
    (SELECT COALESCE(SUM(amount), 0) 
     FROM transactions t2 
     WHERE t2.user_id = transactions.user_id 
       AND t2.type = 'deposit' 
       AND t2.status = 'success') >= 50
  )
);

-- STEP 3: Clean up historical data - DELETE illegal $0 deposit profit claims
DELETE FROM transactions
WHERE type = 'profit_claim'
  AND status = 'success'
  AND user_id IN (
    SELECT id FROM profiles
    WHERE is_admin = false
      AND COALESCE((SELECT SUM(amount) FROM transactions t2 
                   WHERE t2.user_id = profiles.id 
                     AND t2.type = 'deposit' 
                     AND t2.status = 'success'), 0) = 0
  );

-- Log deleted claims
-- Result: This will delete Tioria Sitompul's 4 illegal claims

COMMENT ON FUNCTION validate_profit_claim_member_activation() IS 
'Database-level validation: Prevents profit claims if member has less than $50 actual deposit. Ensures NO BYPASS possible.';
