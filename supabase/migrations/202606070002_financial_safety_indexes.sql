-- Hardening indexes for staging financial safety.
-- These are separated because earlier staging attempts may have created tables
-- before table-level UNIQUE constraints were present.

create extension if not exists pgcrypto;

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

create table if not exists public.financial_profit_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  claim_date date not null,
  amount numeric(20, 8) not null check (amount > 0),
  created_at timestamptz not null default now()
);

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
  created_at timestamptz not null default now()
);

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
  confirmed_at timestamptz
);

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

create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  related_user_id uuid references auth.users(id) on delete set null,
  entry_type text not null,
  amount numeric(20, 8) not null,
  balance_after numeric(20, 8),
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.referral_edges (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sponsor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists financial_profit_claims_user_claim_date_unique
  on public.financial_profit_claims(user_id, claim_date);

create unique index if not exists profit_allocations_run_user_unique
  on public.profit_allocations(run_id, user_id);

create unique index if not exists crypto_deposit_orders_provider_payment_unique
  on public.crypto_deposit_orders(provider, provider_payment_id);

create unique index if not exists financial_deposits_source_external_id_unique
  on public.financial_deposits(source, external_id)
  where external_id is not null;

create unique index if not exists financial_withdrawals_provider_payout_id_unique
  on public.financial_withdrawals(provider, provider_payout_id)
  where provider_payout_id is not null;

create index if not exists financial_wallets_maxed_out_idx
  on public.financial_wallets(is_maxed_out)
  where is_maxed_out = false and active_deposit > 0;

create index if not exists ledger_entries_user_id_created_at_idx
  on public.ledger_entries(user_id, created_at desc);

create index if not exists referral_edges_sponsor_id_idx
  on public.referral_edges(sponsor_id);
