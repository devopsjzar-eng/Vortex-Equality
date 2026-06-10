-- Phase 1 final backend rules:
-- - WIB profit trigger/claim windows.
-- - Daily profit overwrite before 10:00 WIB.
-- - Main/active-asset withdrawal reduces active_deposit when capital is withdrawn.
-- - Bonus wallet withdrawal uses flat 5% fee.

alter table public.financial_withdrawals
  add column if not exists wallet_source text not null default 'main';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'financial_withdrawals_wallet_source_check'
      and conrelid = 'public.financial_withdrawals'::regclass
  ) then
    alter table public.financial_withdrawals
      add constraint financial_withdrawals_wallet_source_check
      check (wallet_source in ('main', 'bonus'));
  end if;
end $$;

alter table public.profit_runs
  alter column percentage set not null;

do $$
begin
  alter table public.profit_runs
    drop constraint if exists profit_runs_percentage_check;

  alter table public.profit_runs
    add constraint profit_runs_percentage_check
    check (percentage >= 1 and percentage <= 2) not valid;
end $$;

create or replace function public.trigger_daily_profit(
  p_percentage numeric,
  p_run_date date default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run_id uuid;
  v_existing_run_id uuid;
  v_run_date date := coalesce(p_run_date, (now() at time zone 'Asia/Jakarta')::date);
  v_wib_now timestamp := now() at time zone 'Asia/Jakarta';
  v_wib_hour int := extract(hour from (now() at time zone 'Asia/Jakarta'));
begin
  if not public.is_app_admin(auth.uid()) then
    raise exception 'Only admins can trigger daily profit';
  end if;

  if p_percentage is null or p_percentage < 1 or p_percentage > 2 then
    raise exception 'Daily profit percentage must be between 1%% and 2%%';
  end if;

  if v_wib_hour < 1 or v_wib_hour >= 10 then
    raise exception 'Daily profit can only be set from 01:00 AM to 09:59 AM WIB';
  end if;

  select id
  into v_existing_run_id
  from public.profit_runs
  where run_date = v_run_date
  for update;

  if v_existing_run_id is not null then
    -- Before 10:00 WIB, overwriting the daily percent must not double count.
    update public.financial_wallets fw
    set
      unclaimed_profit = greatest(0, fw.unclaimed_profit - pa.amount),
      updated_at = now()
    from public.profit_allocations pa
    where pa.run_id = v_existing_run_id
      and pa.user_id = fw.user_id;

    delete from public.ledger_entries
    where entry_type = 'profit_allocation'
      and metadata->>'profit_run_id' = v_existing_run_id::text;

    delete from public.profit_allocations
    where run_id = v_existing_run_id;

    update public.profit_runs
    set
      percentage = p_percentage,
      triggered_by = auth.uid(),
      created_at = now()
    where id = v_existing_run_id
    returning id into v_run_id;
  else
    insert into public.profit_runs(run_date, percentage, triggered_by)
    values (v_run_date, p_percentage, auth.uid())
    returning id into v_run_id;
  end if;

  insert into public.profit_allocations(run_id, user_id, amount, active_deposit_snapshot)
  select
    v_run_id,
    fw.user_id,
    round((fw.active_deposit * p_percentage / 100)::numeric, 8),
    fw.active_deposit
  from public.financial_wallets fw
  left join public.user_account_status uas on uas.user_id = fw.user_id
  where fw.active_deposit > 0
    and fw.is_maxed_out = false
    and coalesce(uas.is_banned, false) = false
    and round((fw.active_deposit * p_percentage / 100)::numeric, 8) > 0;

  update public.financial_wallets fw
  set
    unclaimed_profit = fw.unclaimed_profit + pa.amount,
    updated_at = now()
  from public.profit_allocations pa
  where pa.run_id = v_run_id
    and pa.user_id = fw.user_id;

  insert into public.ledger_entries(user_id, entry_type, amount, balance_after, description, metadata)
  select
    pa.user_id,
    'profit_allocation',
    pa.amount,
    fw.unclaimed_profit,
    'Daily profit allocated to unclaimed profit',
    jsonb_build_object(
      'profit_run_id', v_run_id,
      'percentage', p_percentage,
      'run_date', v_run_date,
      'wib_triggered_at', v_wib_now
    )
  from public.profit_allocations pa
  join public.financial_wallets fw on fw.user_id = pa.user_id
  where pa.run_id = v_run_id;

  insert into public.admin_logs(admin_user_id, action, metadata)
  values (
    auth.uid(),
    case when v_existing_run_id is null then 'trigger_daily_profit' else 'overwrite_daily_profit' end,
    jsonb_build_object('profit_run_id', v_run_id, 'percentage', p_percentage, 'run_date', v_run_date, 'wib_triggered_at', v_wib_now)
  );

  return v_run_id;
end;
$$;

create or replace function public.claim_unclaimed_profit(p_claim_date date default null)
returns public.financial_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_wallet public.financial_wallets;
  v_claim_amount numeric(20, 8);
  v_claim_date date := coalesce(p_claim_date, (now() at time zone 'Asia/Jakarta')::date);
  v_wib_now timestamp := now() at time zone 'Asia/Jakarta';
  v_wib_hour int := extract(hour from (now() at time zone 'Asia/Jakarta'));
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if v_wib_hour < 10 then
    raise exception 'Profit can only be claimed from 10:00 AM to 11:59 PM WIB';
  end if;

  if exists (
    select 1
    from public.user_account_status
    where user_id = v_user_id
      and is_banned = true
  ) then
    raise exception 'Banned users cannot claim profits';
  end if;

  perform public.ensure_financial_wallet(v_user_id);

  select *
  into v_wallet
  from public.financial_wallets
  where user_id = v_user_id
  for update;

  if v_wallet.is_maxed_out then
    raise exception 'User has reached the 400%% maximum limit';
  end if;

  if v_wallet.unclaimed_profit <= 0 then
    raise exception 'No unclaimed profit available';
  end if;

  v_claim_amount := v_wallet.unclaimed_profit;

  insert into public.financial_profit_claims(user_id, claim_date, amount)
  values (v_user_id, v_claim_date, v_claim_amount);

  update public.financial_wallets
  set
    unclaimed_profit = 0,
    main_balance = main_balance + v_claim_amount,
    total_claimed_profit = total_claimed_profit + v_claim_amount,
    updated_at = now()
  where user_id = v_user_id
  returning * into v_wallet;

  insert into public.ledger_entries(user_id, entry_type, amount, balance_after, description, metadata)
  values (
    v_user_id,
    'profit_claim',
    v_claim_amount,
    v_wallet.main_balance,
    'Claimed unclaimed profit into main wallet',
    jsonb_build_object('claim_date', v_claim_date, 'wib_claimed_at', v_wib_now)
  );

  return public.recalculate_wallet_state(v_user_id);
exception
  when unique_violation then
    raise exception 'Profit already claimed for this date';
end;
$$;

create or replace function public.request_withdrawal(
  p_gross_amount numeric,
  p_wallet_address text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.financial_withdrawals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_wallet public.financial_wallets;
  v_fee_percentage numeric(5, 2);
  v_fee_amount numeric(20, 8);
  v_net_amount numeric(20, 8);
  v_withdrawal public.financial_withdrawals;
  v_wallet_address text;
  v_wallet_source text := lower(coalesce(p_metadata->>'walletType', p_metadata->>'wallet_source', 'main'));
  v_main_debit numeric(20, 8) := 0;
  v_active_deposit_reduction numeric(20, 8) := 0;
  v_bonus_debit numeric(20, 8) := 0;
  v_available_main numeric(20, 8) := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_gross_amount is null or p_gross_amount < 10 then
    raise exception 'Minimum withdrawal amount is $10';
  end if;

  if exists (
    select 1
    from public.user_account_status
    where user_id = v_user_id
      and is_banned = true
  ) then
    raise exception 'Banned users cannot request withdrawals';
  end if;

  v_wallet_source := case
    when v_wallet_source in ('bonus', 'network_bonus', 'network-bonus') then 'bonus'
    else 'main'
  end;

  perform public.ensure_financial_wallet(v_user_id);

  select *
  into v_wallet
  from public.financial_wallets
  where user_id = v_user_id
  for update;

  v_wallet_address := nullif(trim(coalesce(p_wallet_address, '')), '');

  if v_wallet_address is null then
    select wallet_address
    into v_wallet_address
    from public.user_crypto_wallets
    where user_id = v_user_id;
  end if;

  if v_wallet_address is null then
    raise exception 'Crypto wallet address is required';
  end if;

  if v_wallet_source = 'bonus' then
    if v_wallet.network_bonus_balance < p_gross_amount then
      raise exception 'Insufficient network bonus wallet balance';
    end if;

    v_fee_percentage := 5;
    v_bonus_debit := p_gross_amount;

    update public.financial_wallets
    set
      network_bonus_balance = network_bonus_balance - p_gross_amount,
      updated_at = now()
    where user_id = v_user_id
    returning * into v_wallet;
  else
    v_available_main := v_wallet.main_balance + v_wallet.active_deposit;

    if v_available_main < p_gross_amount then
      raise exception 'Insufficient main wallet and active asset balance';
    end if;

    v_fee_percentage := case
      when v_wallet.total_withdrawn >= v_wallet.active_deposit and v_wallet.active_deposit > 0 then 5
      else 20
    end;

    v_main_debit := least(v_wallet.main_balance, p_gross_amount);
    v_active_deposit_reduction := p_gross_amount - v_main_debit;

    update public.financial_wallets
    set
      main_balance = main_balance - v_main_debit,
      active_deposit = active_deposit - v_active_deposit_reduction,
      total_withdrawn = total_withdrawn + p_gross_amount,
      updated_at = now()
    where user_id = v_user_id
    returning * into v_wallet;
  end if;

  v_fee_amount := round((p_gross_amount * v_fee_percentage / 100)::numeric, 8);
  v_net_amount := p_gross_amount - v_fee_amount;

  insert into public.financial_withdrawals(
    user_id,
    gross_amount,
    fee_percentage,
    fee_amount,
    net_amount,
    wallet_address,
    wallet_source,
    metadata
  )
  values (
    v_user_id,
    p_gross_amount,
    v_fee_percentage,
    v_fee_amount,
    v_net_amount,
    v_wallet_address,
    v_wallet_source,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'wallet_source', v_wallet_source,
      'main_debit', v_main_debit,
      'active_deposit_reduction', v_active_deposit_reduction,
      'bonus_debit', v_bonus_debit
    )
  )
  returning * into v_withdrawal;

  insert into public.ledger_entries(user_id, entry_type, amount, balance_after, description, metadata)
  values (
    v_user_id,
    'withdrawal_request',
    p_gross_amount * -1,
    case when v_wallet_source = 'bonus' then v_wallet.network_bonus_balance else v_wallet.main_balance end,
    case when v_wallet_source = 'bonus' then 'Withdrawal requested from network bonus wallet' else 'Withdrawal requested from main wallet and active asset' end,
    jsonb_build_object(
      'withdrawal_id', v_withdrawal.id,
      'wallet_source', v_wallet_source,
      'fee_percentage', v_fee_percentage,
      'fee_amount', v_fee_amount,
      'net_amount', v_net_amount,
      'main_debit', v_main_debit,
      'active_deposit_reduction', v_active_deposit_reduction,
      'bonus_debit', v_bonus_debit
    )
  );

  insert into public.ledger_entries(user_id, entry_type, amount, balance_after, description, metadata)
  values (
    v_user_id,
    'withdrawal_fee',
    v_fee_amount * -1,
    case when v_wallet_source = 'bonus' then v_wallet.network_bonus_balance else v_wallet.main_balance end,
    'Withdrawal admin fee calculated',
    jsonb_build_object('withdrawal_id', v_withdrawal.id, 'wallet_source', v_wallet_source, 'fee_percentage', v_fee_percentage)
  );

  perform public.recalculate_wallet_state(v_user_id);
  return v_withdrawal;
end;
$$;

grant execute on function public.claim_unclaimed_profit(date) to authenticated;
grant execute on function public.request_withdrawal(numeric, text, jsonb) to authenticated;
grant execute on function public.trigger_daily_profit(numeric, date) to authenticated;
