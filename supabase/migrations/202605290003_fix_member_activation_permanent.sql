-- Permanent member activation fix.
--
-- The original version of this migration targeted the legacy public.transactions
-- table. A fresh staging database may not include that table, so this migration
-- is intentionally defensive. The new staging financial logic is implemented in
-- 20260607_staging_financial_core.sql.

do $$
begin
  if to_regclass('public.transactions') is null then
    raise notice 'Skipping member activation trigger fix: public.transactions does not exist in this database.';
    return;
  end if;

  raise notice 'public.transactions exists. Legacy activation trigger fix skipped in staging compatibility migration.';
end $$;
