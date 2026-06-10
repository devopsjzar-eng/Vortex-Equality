-- Migration: Add indexes to prevent duplicate financial transaction entries.
--
-- PostgreSQL does not support:
--   ALTER TABLE ... ADD CONSTRAINT ... UNIQUE (...) WHERE ...
--
-- Conditional uniqueness must be implemented with partial unique indexes.
-- This migration is defensive because fresh staging databases may not have the
-- legacy public.transactions table yet.

do $$
declare
  has_transactions boolean;
  has_user_id boolean;
  has_type boolean;
  has_status boolean;
  has_external_ref boolean;
  has_claim_date boolean;
  has_reference_id boolean;
begin
  select to_regclass('public.transactions') is not null
  into has_transactions;

  if not has_transactions then
    raise notice 'Skipping transaction constraints: public.transactions does not exist in this database.';
    return;
  end if;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'transactions'
      and column_name = 'user_id'
  ) into has_user_id;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'transactions'
      and column_name = 'type'
  ) into has_type;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'transactions'
      and column_name = 'status'
  ) into has_status;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'transactions'
      and column_name = 'external_ref'
  ) into has_external_ref;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'transactions'
      and column_name = 'claim_date'
  ) into has_claim_date;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'transactions'
      and column_name = 'reference_id'
  ) into has_reference_id;

  if has_user_id and has_type and has_status and has_external_ref then
    create unique index if not exists unique_profit_claim_per_day
    on public.transactions (user_id, type, external_ref)
    where type = 'profit_claim'
      and status = 'success'
      and external_ref is not null;

    create unique index if not exists unique_deposit_external_ref
    on public.transactions (user_id, external_ref)
    where type = 'deposit'
      and status = 'success'
      and external_ref is not null;

    create unique index if not exists unique_success_transaction_external_ref
    on public.transactions (external_ref)
    where status = 'success'
      and external_ref is not null;
  else
    raise notice 'Skipping external_ref transaction indexes: required columns are missing.';
  end if;

  if has_user_id and has_type and has_status and has_claim_date then
    create unique index if not exists unique_profit_claim_user_claim_date
    on public.transactions (user_id, claim_date)
    where type = 'profit_claim'
      and status = 'success'
      and claim_date is not null;
  else
    raise notice 'Skipping claim_date transaction index: required columns are missing.';
  end if;

  if has_user_id and has_type and has_status and has_reference_id then
    create unique index if not exists unique_withdrawal_reference
    on public.transactions (user_id, reference_id)
    where type = 'withdrawal'
      and status in ('pending', 'processing', 'success')
      and reference_id is not null;
  else
    raise notice 'Skipping withdrawal reference transaction index: required columns are missing.';
  end if;
end $$;
