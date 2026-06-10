-- Add UNIQUE INDEX for external_ref idempotency on deposits
-- This prevents ANY duplicate payment_id from creating multiple transactions
-- Even if webhook called multiple times, only first insert succeeds

DO $$
BEGIN
  IF to_regclass('public.transactions') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'transactions'
         AND column_name = 'user_id'
     )
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'transactions'
         AND column_name = 'external_ref'
     )
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'transactions'
         AND column_name = 'type'
     )
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'transactions'
         AND column_name = 'status'
     )
  THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_deposit_external_ref
    ON public.transactions (user_id, external_ref)
    WHERE type = 'deposit'
      AND status = 'success'
      AND external_ref IS NOT NULL;
  ELSE
    RAISE NOTICE 'Skipping uq_deposit_external_ref: public.transactions table/columns do not exist in this database.';
  END IF;
END $$;

-- Verify constraint is applied
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'transactions'
  AND constraint_name = 'uq_deposit_external_ref';
