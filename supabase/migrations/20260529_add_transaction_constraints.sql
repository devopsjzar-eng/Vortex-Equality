-- Migration: Add constraints untuk prevent double entries

-- 1. Add UNIQUE constraint untuk profit_claim external_ref (prevent double claim same day)
ALTER TABLE transactions 
ADD CONSTRAINT unique_profit_claim_per_day 
UNIQUE (user_id, type, external_ref) 
WHERE type = 'profit_claim' AND status = 'success';

-- 2. Add UNIQUE constraint untuk deposit external_ref (prevent webhook double processing)
-- external_ref harus unique per user untuk prevent double deposits
ALTER TABLE transactions 
ADD CONSTRAINT unique_deposit_external_ref 
UNIQUE (user_id, external_ref) 
WHERE type = 'deposit' AND status = 'success';

-- 3. Add NOT NULL constraint untuk external_ref (ensure idempotency keys always present)
ALTER TABLE transactions 
ALTER COLUMN external_ref SET NOT NULL;

-- 4. Add index untuk faster query on date ranges
CREATE INDEX idx_transactions_user_type_date ON transactions(user_id, type, created_at) 
WHERE status = 'success';

-- 5. Add check constraint untuk prevent invalid amounts
ALTER TABLE transactions 
ADD CONSTRAINT check_positive_amount CHECK (amount > 0);

-- 6. Add trigger untuk auto-sync profile.total_deposit from successful deposits
CREATE OR REPLACE FUNCTION sync_total_deposit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'deposit' AND NEW.status = 'success' THEN
    UPDATE profiles 
    SET total_deposit = (
      SELECT COALESCE(SUM(amount), 0) 
      FROM transactions 
      WHERE user_id = NEW.user_id 
        AND type = 'deposit' 
        AND status = 'success'
    )
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger untuk auto-sync when deposit transaction created/updated
DROP TRIGGER IF EXISTS trigger_sync_total_deposit ON transactions;
CREATE TRIGGER trigger_sync_total_deposit
AFTER INSERT OR UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION sync_total_deposit();

-- 7. Add check untuk prevent deposits below $50
ALTER TABLE transactions 
ADD CONSTRAINT check_deposit_minimum 
CHECK (
  (type != 'deposit') OR 
  (type = 'deposit' AND amount >= 50)
);

-- 8. Add index untuk faster external_ref lookup (critical for webhook idempotency)
CREATE UNIQUE INDEX idx_deposit_external_ref ON transactions(external_ref) 
WHERE type = 'deposit' AND status = 'success';

COMMIT;
