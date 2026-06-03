-- Add UNIQUE CONSTRAINT for external_ref idempotency on deposits
-- This prevents ANY duplicate payment_id from creating multiple transactions
-- Even if webhook called multiple times, only first insert succeeds

ALTER TABLE transactions
ADD CONSTRAINT uq_deposit_external_ref 
UNIQUE (user_id, external_ref)
WHERE type = 'deposit' AND status = 'success';

-- Verify constraint is applied
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'transactions'
  AND constraint_name = 'uq_deposit_external_ref';
