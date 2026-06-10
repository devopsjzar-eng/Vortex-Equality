-- Staging financial core: wallets, claims, profit runs, withdrawals, referrals, and ledger.
-- This migration is intentionally additive/idempotent so it can be tested safely on staging.

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

do $$
begin
  if to_regclass('public.profiles') is not null then
    insert into public.financial_wallets(
      user_id,
      main_balance,
      active_deposit,
      network_bonus_balance,
      total_claimed_profit,
      total_withdrawn
    )
    select
      p.id,
      coalesce((
        select sum(w.balance)
        from public.wallets w
        where w.user_id = p.id
          and w.wallet_type = 'asset'
      ), 0),
      greatest(
        coalesce(p.total_deposit, 0),
        coalesce(p.initial_capital, 0) + coalesce(p.total_topup, 0),
        coalesce((
          select max(w.initial_capital)
          from public.wallets w
          where w.user_id = p.id
            and w.wallet_type = 'asset'
        ), 0)
      ),
      coalesce((
        select sum(w.balance)
        from public.wallets w
        where w.user_id = p.id
          and w.wallet_type = 'bonus'
      ), 0),
      coalesce((
        select sum(t.net_amount)
        from public.transactions t
        where t.user_id = p.id
          and t.type = 'profit_claim'
          and t.status = 'success'
      ), 0),
      coalesce((
        select sum(wd.amount)
        from public.withdrawals wd
        where wd.user_id = p.id
          and wd.status in ('approved', 'completed')
      ), 0)
    from public.profiles p
    on conflict (user_id) do update
    set
      main_balance = excluded.main_balance,
      active_deposit = excluded.active_deposit,
      network_bonus_balance = excluded.network_bonus_balance,
      total_claimed_profit = excluded.total_claimed_profit,
      total_withdrawn = excluded.total_withdrawn,
      updated_at = now();
  end if;
end $$;

create table if not exists public.referral_edges (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sponsor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint referral_edges_no_self_referral check (user_id is null or sponsor_id is null or user_id <> sponsor_id)
);

create index if not exists referral_edges_sponsor_id_idx
  on public.referral_edges(sponsor_id);

do $$
begin
  if to_regclass('public.profiles') is not null then
    insert into public.referral_edges(user_id, sponsor_id)
    select id, referred_by
    from public.profiles
    where referred_by is not null
    on conflict (user_id) do update
    set sponsor_id = excluded.sponsor_id,
        updated_at = now();

    insert into public.app_admins(user_id)
    select id
    from public.profiles
    where coalesce(is_admin, false) = true
    on conflict (user_id) do nothing;
  end if;
end $$;

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

create index if not exists ledger_entries_user_id_created_at_idx
  on public.ledger_entries(user_id, created_at desc);

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

create unique index if not exists financial_deposits_source_external_id_unique
  on public.financial_deposits(source, external_id)
  where external_id is not null;

create index if not exists financial_deposits_user_id_created_at_idx
  on public.financial_deposits(user_id, created_at desc);

create table if not exists public.profit_runs (
  id uuid primary key default gen_random_uuid(),
  run_date date not null unique,
  percentage numeric(8, 4) not null check (percentage > 0 and percentage <= 100),
  triggered_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.profit_allocations (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.profit_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(20, 8) not null check (amount > 0),
  active_deposit_snapshot numeric(20, 8) not null check (active_deposit_snapshot > 0),
  created_at timestamptz not null default now(),
  unique (run_id, user_id)
);

create index if not exists profit_allocations_user_id_created_at_idx
  on public.profit_allocations(user_id, created_at desc);

create table if not exists public.financial_profit_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  claim_date date not null,
  amount numeric(20, 8) not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (user_id, claim_date)
);

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

create unique index if not exists financial_withdrawals_provider_payout_id_unique
  on public.financial_withdrawals(provider, provider_payout_id)
  where provider_payout_id is not null;

create index if not exists financial_withdrawals_user_id_created_at_idx
  on public.financial_withdrawals(user_id, created_at desc);

create table if not exists public.crypto_deposit_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'plisio',
  provider_payment_id text not null,
  coin text not null,
  pay_address text,
  expected_amount numeric(20, 8),
  confirmed_amount numeric(20, 8),
  status public.crypto_order_status not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (provider, provider_payment_id)
);

create index if not exists crypto_deposit_orders_user_id_created_at_idx
  on public.crypto_deposit_orders(user_id, created_at desc);

create table if not exists public.user_crypto_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  wallet_address text not null,
  coin text not null default 'USDT_TRC20',
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_app_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_admins aa
    where aa.user_id = p_user_id
  );
$$;

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

create or replace function public.financial_wallets_recalculate_state_trigger()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.is_bep_reached := new.total_withdrawn >= new.active_deposit and new.active_deposit > 0;
  new.is_maxed_out := new.active_deposit > 0 and new.total_claimed_profit >= (new.active_deposit * 4);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_financial_wallets_recalculate_state on public.financial_wallets;
create trigger trg_financial_wallets_recalculate_state
before insert or update of active_deposit, total_claimed_profit, total_withdrawn
on public.financial_wallets
for each row
execute function public.financial_wallets_recalculate_state_trigger();

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

create or replace function public.trigger_daily_profit(
  p_percentage numeric,
  p_run_date date default current_date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run_id uuid;
begin
  if not public.is_app_admin(auth.uid()) then
    raise exception 'Only admins can trigger daily profit';
  end if;

  if p_percentage is null or p_percentage <= 0 or p_percentage > 100 then
    raise exception 'Profit percentage must be greater than 0 and less than or equal to 100';
  end if;

  insert into public.profit_runs(run_date, percentage, triggered_by)
  values (p_run_date, p_percentage, auth.uid())
  returning id into v_run_id;

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
  set unclaimed_profit = fw.unclaimed_profit + pa.amount
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
    jsonb_build_object('profit_run_id', v_run_id, 'percentage', p_percentage, 'run_date', p_run_date)
  from public.profit_allocations pa
  join public.financial_wallets fw on fw.user_id = pa.user_id
  where pa.run_id = v_run_id;

  insert into public.admin_logs(admin_user_id, action, metadata)
  values (auth.uid(), 'trigger_daily_profit', jsonb_build_object('profit_run_id', v_run_id, 'percentage', p_percentage, 'run_date', p_run_date));

  return v_run_id;
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

create or replace function public.set_user_ban_status(
  p_user_id uuid,
  p_is_banned boolean,
  p_reason text default null
)
returns public.user_account_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.user_account_status;
begin
  if not public.is_app_admin(auth.uid()) then
    raise exception 'Only admins can ban or unban users';
  end if;

  insert into public.user_account_status(user_id, is_banned, banned_at, banned_by, ban_reason, updated_at)
  values (
    p_user_id,
    p_is_banned,
    case when p_is_banned then now() else null end,
    case when p_is_banned then auth.uid() else null end,
    p_reason,
    now()
  )
  on conflict (user_id) do update
  set
    is_banned = excluded.is_banned,
    banned_at = excluded.banned_at,
    banned_by = excluded.banned_by,
    ban_reason = excluded.ban_reason,
    updated_at = now()
  returning * into v_status;

  insert into public.admin_logs(admin_user_id, action, target_user_id, metadata)
  values (auth.uid(), case when p_is_banned then 'ban_user' else 'unban_user' end, p_user_id, jsonb_build_object('reason', p_reason));

  return v_status;
end;
$$;

create or replace function public.set_referral_sponsor(
  p_user_id uuid,
  p_sponsor_id uuid,
  p_reason text default 'manual referral correction'
)
returns public.referral_edges
language plpgsql
security definer
set search_path = public
as $$
declare
  v_edge public.referral_edges;
begin
  if not public.is_app_admin(auth.uid()) then
    raise exception 'Only admins can update referral sponsors';
  end if;

  if p_user_id = p_sponsor_id then
    raise exception 'A user cannot sponsor themselves';
  end if;

  if exists (
    with recursive downline as (
      select user_id, sponsor_id
      from public.referral_edges
      where sponsor_id = p_user_id
      union all
      select re.user_id, re.sponsor_id
      from public.referral_edges re
      join downline d on re.sponsor_id = d.user_id
    )
    select 1
    from downline
    where user_id = p_sponsor_id
  ) then
    raise exception 'Cannot move user under their own downline';
  end if;

  insert into public.referral_edges(user_id, sponsor_id, updated_at)
  values (p_user_id, p_sponsor_id, now())
  on conflict (user_id) do update
  set sponsor_id = excluded.sponsor_id,
      updated_at = now()
  returning * into v_edge;

  if to_regclass('public.profiles') is not null then
    update public.profiles
    set referred_by = p_sponsor_id,
        updated_at = now()
    where id = p_user_id;
  end if;

  if to_regclass('public.referrals') is not null then
    update public.referrals
    set inviter_id = p_sponsor_id
    where invitee_id = p_user_id;

    if not found then
      insert into public.referrals(inviter_id, invitee_id, invitee_deposit, inviter_deposit_at_time)
      select
        p_sponsor_id,
        p_user_id,
        coalesce(target.total_deposit, 0),
        coalesce(sponsor.total_deposit, 0)
      from public.profiles target
      cross join public.profiles sponsor
      where target.id = p_user_id
        and sponsor.id = p_sponsor_id;
    end if;
  end if;

  insert into public.ledger_entries(user_id, related_user_id, entry_type, amount, description, metadata, created_by)
  values (
    p_user_id,
    p_sponsor_id,
    'referral_correction',
    0,
    'Referral sponsor manually corrected',
    jsonb_build_object('reason', p_reason),
    auth.uid()
  );

  insert into public.admin_logs(admin_user_id, action, target_user_id, metadata)
  values (auth.uid(), 'set_referral_sponsor', p_user_id, jsonb_build_object('sponsor_id', p_sponsor_id, 'reason', p_reason));

  return v_edge;
end;
$$;

create or replace function public.get_referral_tree(p_root_user_id uuid default auth.uid())
returns table (
  user_id uuid,
  sponsor_id uuid,
  level integer,
  active_deposit numeric,
  is_maxed_out boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with recursive tree as (
    select
      re.user_id,
      re.sponsor_id,
      1 as level
    from public.referral_edges re
    where re.sponsor_id = p_root_user_id

    union all

    select
      re.user_id,
      re.sponsor_id,
      tree.level + 1
    from public.referral_edges re
    join tree on re.sponsor_id = tree.user_id
  )
  select
    tree.user_id,
    tree.sponsor_id,
    tree.level,
    coalesce(fw.active_deposit, 0) as active_deposit,
    coalesce(fw.is_maxed_out, false) as is_maxed_out
  from tree
  left join public.financial_wallets fw on fw.user_id = tree.user_id
  order by tree.level, tree.user_id;
$$;

alter table public.financial_wallets enable row level security;
alter table public.user_account_status enable row level security;
alter table public.referral_edges enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.financial_deposits enable row level security;
alter table public.profit_runs enable row level security;
alter table public.profit_allocations enable row level security;
alter table public.financial_profit_claims enable row level security;
alter table public.financial_withdrawals enable row level security;
alter table public.crypto_deposit_orders enable row level security;
alter table public.user_crypto_wallets enable row level security;
alter table public.admin_logs enable row level security;

drop policy if exists "Users can read own wallet" on public.financial_wallets;
create policy "Users can read own wallet"
on public.financial_wallets
for select
using (auth.uid() = user_id or public.is_app_admin(auth.uid()));

drop policy if exists "Users can read own account status" on public.user_account_status;
create policy "Users can read own account status"
on public.user_account_status
for select
using (auth.uid() = user_id or public.is_app_admin(auth.uid()));

drop policy if exists "Users can read own referral edge" on public.referral_edges;
create policy "Users can read own referral edge"
on public.referral_edges
for select
using (auth.uid() = user_id or auth.uid() = sponsor_id or public.is_app_admin(auth.uid()));

drop policy if exists "Users can read own ledger" on public.ledger_entries;
create policy "Users can read own ledger"
on public.ledger_entries
for select
using (auth.uid() = user_id or public.is_app_admin(auth.uid()));

drop policy if exists "Users can read own financial deposits" on public.financial_deposits;
create policy "Users can read own financial deposits"
on public.financial_deposits
for select
using (auth.uid() = user_id or public.is_app_admin(auth.uid()));

drop policy if exists "Users can read own profit allocations" on public.profit_allocations;
create policy "Users can read own profit allocations"
on public.profit_allocations
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

drop policy if exists "Users can manage own crypto wallet" on public.user_crypto_wallets;
create policy "Users can manage own crypto wallet"
on public.user_crypto_wallets
for all
using (auth.uid() = user_id or public.is_app_admin(auth.uid()))
with check (auth.uid() = user_id or public.is_app_admin(auth.uid()));

drop policy if exists "Users can read own crypto deposit orders" on public.crypto_deposit_orders;
create policy "Users can read own crypto deposit orders"
on public.crypto_deposit_orders
for select
using (auth.uid() = user_id or public.is_app_admin(auth.uid()));

drop policy if exists "Admins can read profit runs" on public.profit_runs;
create policy "Admins can read profit runs"
on public.profit_runs
for select
using (public.is_app_admin(auth.uid()));

drop policy if exists "Admins can read admin logs" on public.admin_logs;
create policy "Admins can read admin logs"
on public.admin_logs
for select
using (public.is_app_admin(auth.uid()));

grant usage on schema public to anon, authenticated;
grant select on public.financial_wallets to authenticated;
grant select on public.user_account_status to authenticated;
grant select on public.referral_edges to authenticated;
grant select on public.ledger_entries to authenticated;
grant select on public.financial_deposits to authenticated;
grant select on public.profit_allocations to authenticated;
grant select on public.financial_profit_claims to authenticated;
grant select on public.financial_withdrawals to authenticated;
grant select, insert, update on public.user_crypto_wallets to authenticated;
grant execute on function public.claim_unclaimed_profit(date) to authenticated;
grant execute on function public.request_withdrawal(numeric, text, jsonb) to authenticated;
grant execute on function public.get_referral_tree(uuid) to authenticated;
grant execute on function public.trigger_daily_profit(numeric, date) to authenticated;
grant execute on function public.set_user_ban_status(uuid, boolean, text) to authenticated;
grant execute on function public.set_referral_sponsor(uuid, uuid, text) to authenticated;
