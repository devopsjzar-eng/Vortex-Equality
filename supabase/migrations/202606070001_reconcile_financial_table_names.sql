-- Reconcile staging after an earlier version of 20260607_staging_financial_core.sql
-- created generic deposits/profit_claims/withdrawals tables. Keep those tables in
-- place, but move the financial engine to non-conflicting financial_* tables.

create extension if not exists pgcrypto;

do $$
begin
  create type public.ledger_entry_type as enum (
    'deposit',
    'top_up',
    'profit_allocation',
    'profit_claim',
    'withdrawal_request',
    'withdrawal_fee',
    'withdrawal_completed',
    'withdrawal_failed',
    'referral_commission',
    'admin_adjustment',
    'referral_correction'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.withdrawal_status as enum (
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.crypto_order_status as enum (
    'pending',
    'confirming',
    'confirmed',
    'failed',
    'expired'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.user_account_status (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_banned boolean not null default false,
  banned_at timestamptz,
  banned_by uuid references auth.users(id),
  ban_reason text,
  updated_at timestamptz not null default now()
);

create table if not exists public.financial_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  main_balance numeric(20, 8) not null default 0 check (main_balance >= 0),
  active_deposit numeric(20, 8) not null default 0 check (active_deposit >= 0),
  network_bonus_balance numeric(20, 8) not null default 0 check (network_bonus_balance >= 0),
  unclaimed_profit numeric(20, 8) not null default 0 check (unclaimed_profit >= 0),
  total_claimed_profit numeric(20, 8) not null default 0 check (total_claimed_profit >= 0),
  total_withdrawn numeric(20, 8) not null default 0 check (total_withdrawn >= 0),
  is_bep_reached boolean not null default false,
  is_maxed_out boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.referral_edges (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sponsor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint referral_edges_no_self_referral check (user_id is null or sponsor_id is null or user_id <> sponsor_id)
);

create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  related_user_id uuid references auth.users(id) on delete set null,
  entry_type public.ledger_entry_type not null,
  amount numeric(20, 8) not null,
  balance_after numeric(20, 8),
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create or replace function public.ensure_financial_wallet(p_user_id uuid)
returns public.financial_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.financial_wallets;
begin
  insert into public.financial_wallets(user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select *
  into v_wallet
  from public.financial_wallets
  where user_id = p_user_id;

  return v_wallet;
end;
$$;

create or replace function public.recalculate_wallet_state(p_user_id uuid)
returns public.financial_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.financial_wallets;
begin
  perform public.ensure_financial_wallet(p_user_id);

  update public.financial_wallets
  set
    is_bep_reached = total_withdrawn >= active_deposit and active_deposit > 0,
    is_maxed_out = active_deposit > 0 and total_claimed_profit >= (active_deposit * 4),
    updated_at = now()
  where user_id = p_user_id
  returning * into v_wallet;

  return v_wallet;
end;
$$;

create table if not exists public.financial_deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(20, 8) not null check (amount > 0),
  source text not null default 'manual',
  external_id text,
  status public.crypto_order_status not null default 'confirmed',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

do $$
begin
  if to_regclass('public.deposits') is not null
    and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'deposits'
      and column_name = 'source'
  )
  then
    insert into public.financial_deposits(id, user_id, amount, source, external_id, status, metadata, created_at, confirmed_at)
    select id, user_id, amount, source, external_id, status, metadata, created_at, confirmed_at
    from public.deposits
    on conflict (id) do nothing;
  end if;
end $$;

create unique index if not exists financial_deposits_source_external_id_unique
  on public.financial_deposits(source, external_id)
  where external_id is not null;

create index if not exists financial_deposits_user_id_created_at_idx
  on public.financial_deposits(user_id, created_at desc);

create table if not exists public.financial_profit_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  claim_date date not null,
  amount numeric(20, 8) not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (user_id, claim_date)
);

do $$
begin
  if to_regclass('public.profit_claims') is not null
    and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profit_claims'
      and column_name = 'claim_date'
  )
  then
    insert into public.financial_profit_claims(id, user_id, claim_date, amount, created_at)
    select id, user_id, claim_date, amount, created_at
    from public.profit_claims
    on conflict (id) do nothing;
  end if;
end $$;

create table if not exists public.financial_withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gross_amount numeric(20, 8) not null check (gross_amount > 0),
  fee_percentage numeric(5, 2) not null check (fee_percentage in (5, 20)),
  fee_amount numeric(20, 8) not null check (fee_amount >= 0),
  net_amount numeric(20, 8) not null check (net_amount > 0),
  status public.withdrawal_status not null default 'pending',
  wallet_address text,
  provider text,
  provider_payout_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

do $$
begin
  if to_regclass('public.withdrawals') is not null
    and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'withdrawals'
      and column_name = 'gross_amount'
  )
  then
    insert into public.financial_withdrawals(
      id,
      user_id,
      gross_amount,
      fee_percentage,
      fee_amount,
      net_amount,
      status,
      wallet_address,
      provider,
      provider_payout_id,
      metadata,
      created_at,
      processed_at
    )
    select
      id,
      user_id,
      gross_amount,
      fee_percentage,
      fee_amount,
      net_amount,
      status,
      wallet_address,
      provider,
      provider_payout_id,
      metadata,
      created_at,
      processed_at
    from public.withdrawals
    on conflict (id) do nothing;
  end if;
end $$;

create unique index if not exists financial_withdrawals_provider_payout_id_unique
  on public.financial_withdrawals(provider, provider_payout_id)
  where provider_payout_id is not null;

create index if not exists financial_withdrawals_user_id_created_at_idx
  on public.financial_withdrawals(user_id, created_at desc);

drop function if exists public.apply_user_top_up(uuid, numeric, text, text, jsonb, numeric);
drop function if exists public.claim_unclaimed_profit(date);
drop function if exists public.request_withdrawal(numeric, text, jsonb);

create or replace function public.apply_user_top_up(
  p_user_id uuid,
  p_amount numeric,
  p_source text default 'manual',
  p_external_id text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_referral_commission_percentage numeric default 0
)
returns public.financial_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.financial_wallets;
  v_deposit_id uuid;
  v_sponsor_id uuid;
  v_commission numeric(20, 8);
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Top-up amount must be greater than zero';
  end if;

  perform public.ensure_financial_wallet(p_user_id);

  select *
  into v_wallet
  from public.financial_wallets
  where user_id = p_user_id
  for update;

  insert into public.financial_deposits(user_id, amount, source, external_id, status, metadata, confirmed_at)
  values (p_user_id, p_amount, coalesce(p_source, 'manual'), p_external_id, 'confirmed', coalesce(p_metadata, '{}'::jsonb), now())
  on conflict (source, external_id) where external_id is not null
  do nothing
  returning id into v_deposit_id;

  if v_deposit_id is null then
    return public.recalculate_wallet_state(p_user_id);
  end if;

  update public.financial_wallets
  set active_deposit = active_deposit + p_amount
  where user_id = p_user_id
  returning * into v_wallet;

  insert into public.ledger_entries(user_id, entry_type, amount, balance_after, description, metadata)
  values (
    p_user_id,
    case when coalesce(p_source, 'manual') = 'manual' then 'top_up'::public.ledger_entry_type else 'deposit'::public.ledger_entry_type end,
    p_amount,
    v_wallet.active_deposit,
    'Active deposit top-up',
    jsonb_build_object('deposit_id', v_deposit_id, 'source', coalesce(p_source, 'manual')) || coalesce(p_metadata, '{}'::jsonb)
  );

  select sponsor_id
  into v_sponsor_id
  from public.referral_edges
  where user_id = p_user_id;

  if v_sponsor_id is not null and coalesce(p_referral_commission_percentage, 0) > 0 then
    perform public.ensure_financial_wallet(v_sponsor_id);
    v_commission := round((p_amount * p_referral_commission_percentage / 100)::numeric, 8);

    if v_commission > 0 then
      update public.financial_wallets
      set network_bonus_balance = network_bonus_balance + v_commission
      where user_id = v_sponsor_id
      returning * into v_wallet;

      insert into public.ledger_entries(user_id, related_user_id, entry_type, amount, balance_after, description, metadata)
      values (
        v_sponsor_id,
        p_user_id,
        'referral_commission',
        v_commission,
        v_wallet.network_bonus_balance,
        'Referral commission from downline deposit',
        jsonb_build_object('deposit_id', v_deposit_id, 'commission_percentage', p_referral_commission_percentage)
      );
    end if;
  end if;

  return public.recalculate_wallet_state(p_user_id);
end;
$$;

create or replace function public.claim_unclaimed_profit(p_claim_date date default current_date)
returns public.financial_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_wallet public.financial_wallets;
  v_claim_amount numeric(20, 8);
begin
  if v_user_id is null then
    raise exception 'Authentication required';
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
  values (v_user_id, p_claim_date, v_claim_amount);

  update public.financial_wallets
  set
    unclaimed_profit = 0,
    main_balance = main_balance + v_claim_amount,
    total_claimed_profit = total_claimed_profit + v_claim_amount
  where user_id = v_user_id
  returning * into v_wallet;

  insert into public.ledger_entries(user_id, entry_type, amount, balance_after, description, metadata)
  values (
    v_user_id,
    'profit_claim',
    v_claim_amount,
    v_wallet.main_balance,
    'Claimed unclaimed profit into main wallet',
    jsonb_build_object('claim_date', p_claim_date)
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
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_gross_amount is null or p_gross_amount <= 0 then
    raise exception 'Withdrawal amount must be greater than zero';
  end if;

  if exists (
    select 1
    from public.user_account_status
    where user_id = v_user_id
      and is_banned = true
  ) then
    raise exception 'Banned users cannot request withdrawals';
  end if;

  perform public.ensure_financial_wallet(v_user_id);

  select *
  into v_wallet
  from public.financial_wallets
  where user_id = v_user_id
  for update;

  if v_wallet.main_balance < p_gross_amount then
    raise exception 'Insufficient main wallet balance';
  end if;

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

  v_fee_percentage := case when v_wallet.total_withdrawn >= v_wallet.active_deposit and v_wallet.active_deposit > 0 then 5 else 20 end;
  v_fee_amount := round((p_gross_amount * v_fee_percentage / 100)::numeric, 8);
  v_net_amount := p_gross_amount - v_fee_amount;

  update public.financial_wallets
  set
    main_balance = main_balance - p_gross_amount,
    total_withdrawn = total_withdrawn + p_gross_amount
  where user_id = v_user_id
  returning * into v_wallet;

  insert into public.financial_withdrawals(user_id, gross_amount, fee_percentage, fee_amount, net_amount, wallet_address, metadata)
  values (v_user_id, p_gross_amount, v_fee_percentage, v_fee_amount, v_net_amount, v_wallet_address, coalesce(p_metadata, '{}'::jsonb))
  returning * into v_withdrawal;

  insert into public.ledger_entries(user_id, entry_type, amount, balance_after, description, metadata)
  values (
    v_user_id,
    'withdrawal_request',
    p_gross_amount * -1,
    v_wallet.main_balance,
    'Withdrawal requested from main wallet',
    jsonb_build_object('withdrawal_id', v_withdrawal.id, 'fee_percentage', v_fee_percentage, 'fee_amount', v_fee_amount, 'net_amount', v_net_amount)
  );

  insert into public.ledger_entries(user_id, entry_type, amount, balance_after, description, metadata)
  values (
    v_user_id,
    'withdrawal_fee',
    v_fee_amount * -1,
    v_wallet.main_balance,
    'Withdrawal fee calculated',
    jsonb_build_object('withdrawal_id', v_withdrawal.id, 'fee_percentage', v_fee_percentage)
  );

  return v_withdrawal;
end;
$$;

alter table public.financial_deposits enable row level security;
alter table public.financial_profit_claims enable row level security;
alter table public.financial_withdrawals enable row level security;

drop policy if exists "Users can read own financial deposits" on public.financial_deposits;
create policy "Users can read own financial deposits"
on public.financial_deposits
for select
using (auth.uid() = user_id or public.is_app_admin(auth.uid()));

drop policy if exists "Users can read own financial profit claims" on public.financial_profit_claims;
create policy "Users can read own financial profit claims"
on public.financial_profit_claims
for select
using (auth.uid() = user_id or public.is_app_admin(auth.uid()));

drop policy if exists "Users can read own financial withdrawals" on public.financial_withdrawals;
create policy "Users can read own financial withdrawals"
on public.financial_withdrawals
for select
using (auth.uid() = user_id or public.is_app_admin(auth.uid()));

grant select on public.financial_deposits to authenticated;
grant select on public.financial_profit_claims to authenticated;
grant select on public.financial_withdrawals to authenticated;
grant execute on function public.apply_user_top_up(uuid, numeric, text, text, jsonb, numeric) to authenticated;
grant execute on function public.claim_unclaimed_profit(date) to authenticated;
grant execute on function public.request_withdrawal(numeric, text, jsonb) to authenticated;
