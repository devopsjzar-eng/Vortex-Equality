-- Import production-compatible public schema into staging.
-- This restores the legacy tables the current app still reads while the new
-- financial engine uses the separate financial_* tables.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  referral_code text not null unique,
  referred_by uuid references public.profiles(id),
  rank text default 'Bronze'::text check (rank = any (array['Bronze'::text, 'P1'::text, 'P2'::text, 'P3'::text, 'P4'::text, 'P5'::text])),
  total_deposit numeric default 0,
  total_direct_referrals integer default 0,
  group_turnover numeric default 0,
  booster_percentage numeric default 0 check (booster_percentage <= 3.0),
  is_admin boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  strategic_booster numeric default 0,
  strategic_booster_count integer default 0,
  initial_capital numeric default 0,
  total_topup numeric default 0
);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  wallet_type text not null check (wallet_type = any (array['asset'::text, 'bonus'::text])),
  balance numeric default 0,
  total_profit_earned numeric default 0,
  initial_capital numeric default 0,
  cap_reached boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists wallets_user_wallet_type_unique
  on public.wallets(user_id, wallet_type);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  wallet_type text not null check (wallet_type = any (array['asset'::text, 'bonus'::text])),
  type text not null check (type = any (array['deposit'::text, 'withdrawal'::text, 'profit_claim'::text, 'referral_bonus'::text, 'rank_reward'::text, 'admin_credit'::text])),
  amount numeric not null,
  fee numeric default 0,
  net_amount numeric not null,
  status text default 'pending'::text check (status = any (array['pending'::text, 'success'::text, 'failed'::text, 'expired'::text, 'completed'::text])),
  external_ref text,
  crypto_address text,
  admin_notes text,
  receipt_data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  sponsor_bonus_processed boolean default false
);

create unique index if not exists uq_deposit_external_ref
  on public.transactions(user_id, external_ref)
  where type = 'deposit'
    and status = 'success'
    and external_ref is not null;

create unique index if not exists unique_profit_claim_per_day
  on public.transactions(user_id, type, external_ref)
  where type = 'profit_claim'
    and status in ('success', 'completed')
    and external_ref is not null;

create table if not exists public.daily_profits (
  id uuid primary key default gen_random_uuid(),
  profit_date date not null unique,
  global_profit_percentage numeric not null check (global_profit_percentage >= 1.0 and global_profit_percentage <= 2.0),
  company_share numeric default 50,
  member_share numeric default 50,
  distribution_time timestamptz,
  expiry_time timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.profit_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  daily_profit_id uuid not null references public.daily_profits(id) on delete cascade,
  base_percentage numeric not null,
  booster_percentage numeric default 0,
  total_percentage numeric not null,
  amount numeric not null,
  status text default 'available'::text check (status = any (array['available'::text, 'claimed'::text, 'expired'::text])),
  claimed_at timestamptz,
  created_at timestamptz default now()
);

create unique index if not exists profit_claims_user_daily_profit_unique
  on public.profit_claims(user_id, daily_profit_id);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  invitee_deposit numeric default 0,
  inviter_deposit_at_time numeric default 0,
  qualifies_for_booster boolean default false,
  booster_applied boolean default false,
  created_at timestamptz default now()
);

create unique index if not exists referrals_inviter_invitee_unique
  on public.referrals(inviter_id, invitee_id);

create table if not exists public.system_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  description text,
  updated_at timestamptz default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.broadcast_messages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  type text default 'info'::text check (type = any (array['info'::text, 'warning'::text, 'success'::text, 'event'::text, 'promo'::text])),
  is_active boolean default true,
  priority integer default 0,
  starts_at timestamptz default now(),
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric not null,
  crypto_type text not null,
  payment_id text,
  payment_status text default 'waiting'::text,
  pay_address text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists deposits_payment_id_unique
  on public.deposits(payment_id)
  where payment_id is not null;

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric not null,
  fee numeric default 0,
  net_amount numeric not null,
  wallet_type text not null check (wallet_type = any (array['asset'::text, 'bonus'::text])),
  crypto_address text not null,
  status text default 'pending'::text check (status = any (array['pending'::text, 'approved'::text, 'rejected'::text, 'completed'::text])),
  admin_notes text,
  created_at timestamptz default now(),
  processed_at timestamptz
);

create table if not exists public.referral_bonuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  deposit_id uuid references public.deposits(id) on delete set null,
  level integer not null check (level = any (array[1, 2, 3])),
  percentage numeric not null,
  amount numeric not null,
  created_at timestamptz default now()
);

create table if not exists public.password_reset_otps (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  otp text not null,
  expires_at timestamptz not null,
  used boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.rank_config (
  id uuid primary key default gen_random_uuid(),
  rank_code varchar not null unique,
  rank_name varchar not null,
  reward_amount numeric not null,
  direct_required integer default 0,
  min_legs integer default 0,
  leg_amount numeric default 0,
  group_amount numeric not null,
  personal_asset numeric not null,
  created_at timestamptz default now()
);

create table if not exists public.rank_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  rank_code varchar not null,
  rank_name varchar not null,
  reward_amount numeric not null,
  status varchar default 'pending'::varchar,
  eligible_at timestamptz not null,
  claimed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.deposit_bonus_tracking (
  id uuid primary key default gen_random_uuid(),
  deposit_transaction_id uuid not null unique,
  depositor_id uuid not null,
  deposit_amount numeric not null,
  bonus_distributed_at timestamp default now(),
  created_at timestamp default now()
);

create table if not exists public.leg_omzet (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  leg_number integer not null check (leg_number >= 1 and leg_number <= 3),
  leg_head_id uuid references public.profiles(id) on delete set null,
  total_omzet numeric not null default 0 check (total_omzet >= 0),
  active_downlines integer not null default 0,
  last_updated timestamptz default now(),
  created_at timestamptz default now()
);

create unique index if not exists leg_omzet_user_leg_unique
  on public.leg_omzet(user_id, leg_number);

alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;
alter table public.daily_profits enable row level security;
alter table public.profit_claims enable row level security;
alter table public.referrals enable row level security;
alter table public.system_settings enable row level security;
alter table public.broadcast_messages enable row level security;
alter table public.deposits enable row level security;
alter table public.withdrawals enable row level security;
alter table public.referral_bonuses enable row level security;
alter table public.password_reset_otps enable row level security;
alter table public.rank_config enable row level security;
alter table public.rank_rewards enable row level security;
alter table public.deposit_bonus_tracking enable row level security;
alter table public.leg_omzet enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
using (auth.uid() = id or coalesce(is_admin, false) = true);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can read own wallets" on public.wallets;
create policy "Users can read own wallets"
on public.wallets
for select
using (auth.uid() = user_id);

drop policy if exists "Users can read own transactions" on public.transactions;
create policy "Users can read own transactions"
on public.transactions
for select
using (auth.uid() = user_id);

drop policy if exists "Users can read own profit claims" on public.profit_claims;
create policy "Users can read own profit claims"
on public.profit_claims
for select
using (auth.uid() = user_id);

drop policy if exists "Users can read own deposits" on public.deposits;
create policy "Users can read own deposits"
on public.deposits
for select
using (auth.uid() = user_id);

drop policy if exists "Users can read own withdrawals" on public.withdrawals;
create policy "Users can read own withdrawals"
on public.withdrawals
for select
using (auth.uid() = user_id);

drop policy if exists "Users can read own referral bonuses" on public.referral_bonuses;
create policy "Users can read own referral bonuses"
on public.referral_bonuses
for select
using (auth.uid() = user_id or auth.uid() = from_user_id);

drop policy if exists "Users can read own rank rewards" on public.rank_rewards;
create policy "Users can read own rank rewards"
on public.rank_rewards
for select
using (auth.uid() = user_id);

drop policy if exists "Public can read active broadcasts" on public.broadcast_messages;
create policy "Public can read active broadcasts"
on public.broadcast_messages
for select
using (is_active = true and starts_at <= now() and (expires_at is null or expires_at > now()));

grant select, insert, update on public.profiles to authenticated;
grant select on public.wallets to authenticated;
grant select on public.transactions to authenticated;
grant select on public.daily_profits to authenticated;
grant select on public.profit_claims to authenticated;
grant select on public.referrals to authenticated;
grant select on public.system_settings to authenticated;
grant select on public.broadcast_messages to authenticated, anon;
grant select on public.deposits to authenticated;
grant select on public.withdrawals to authenticated;
grant select on public.referral_bonuses to authenticated;
grant select on public.rank_config to authenticated;
grant select on public.rank_rewards to authenticated;
grant select on public.leg_omzet to authenticated;
