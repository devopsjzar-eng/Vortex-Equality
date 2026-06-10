-- Phase 4: P1-P5 recurring monthly salary engine.
-- Uses real financial_wallets.active_deposit and referral_edges so group volume drops when capital is withdrawn.

create table if not exists public.rank_rules (
  rank_code text primary key,
  rank_order integer not null unique,
  rank_name text not null,
  monthly_salary numeric(20, 8) not null check (monthly_salary >= 0),
  direct_required integer not null default 0 check (direct_required >= 0),
  group_volume_required numeric(20, 8) not null default 0 check (group_volume_required >= 0),
  personal_asset_required numeric(20, 8) not null default 0 check (personal_asset_required >= 0),
  legs_required integer not null default 0 check (legs_required >= 0),
  leg_volume_required numeric(20, 8) not null default 0 check (leg_volume_required >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.rank_rules(
  rank_code,
  rank_order,
  rank_name,
  monthly_salary,
  direct_required,
  group_volume_required,
  personal_asset_required,
  legs_required,
  leg_volume_required
) values
  ('Bronze', 0, 'Starter', 0, 0, 0, 0, 0, 0),
  ('P1', 1, 'P1 Spark', 100, 5, 5000, 50, 0, 0),
  ('P2', 2, 'P2 Rank', 300, 0, 15000, 200, 3, 5000),
  ('P3', 3, 'P3 Rank', 500, 0, 45000, 600, 3, 15000),
  ('P4', 4, 'P4 Rank', 3000, 0, 135000, 1000, 3, 45000),
  ('P5', 5, 'P5 Elite', 5000, 0, 300000, 2000, 3, 100000)
on conflict (rank_code) do update
set
  rank_order = excluded.rank_order,
  rank_name = excluded.rank_name,
  monthly_salary = excluded.monthly_salary,
  direct_required = excluded.direct_required,
  group_volume_required = excluded.group_volume_required,
  personal_asset_required = excluded.personal_asset_required,
  legs_required = excluded.legs_required,
  leg_volume_required = excluded.leg_volume_required,
  updated_at = now();

create table if not exists public.user_rank_status (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_rank text not null default 'Bronze' references public.rank_rules(rank_code),
  highest_rank text not null default 'Bronze' references public.rank_rules(rank_code),
  last_claimed_rank text references public.rank_rules(rank_code),
  last_claim_at timestamptz,
  next_claim_available_at timestamptz,
  dropped_below_requirement_at timestamptz,
  suspended_until timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists user_rank_status_next_claim_idx
  on public.user_rank_status(next_claim_available_at);

create table if not exists public.rank_reward_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rank_code text not null references public.rank_rules(rank_code),
  rank_name text not null,
  reward_amount numeric(20, 8) not null check (reward_amount > 0),
  status text not null default 'claimed' check (status in ('claimed', 'scrubbed')),
  claimed_at timestamptz not null default now(),
  next_claim_available_at timestamptz not null,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists rank_reward_claims_user_claimed_idx
  on public.rank_reward_claims(user_id, claimed_at desc);

create or replace function public.rank_order(p_rank_code text)
returns integer
language sql
stable
set search_path = public
as $$
  select coalesce((select rank_order from public.rank_rules where rank_code = p_rank_code), 0);
$$;

create or replace function public.get_rank_progress(p_user_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requested_by uuid := auth.uid();
  v_user_id uuid := coalesce(p_user_id, auth.uid());
  v_wallet public.financial_wallets;
  v_status public.user_rank_status;
  v_direct_count integer := 0;
  v_group_volume numeric(20, 8) := 0;
  v_leg_volumes jsonb := '[]'::jsonb;
  v_top_three_legs jsonb := '[]'::jsonb;
  v_rules jsonb := '[]'::jsonb;
  v_rule record;
  v_qualified_rule public.rank_rules%rowtype;
  v_personal_block_rule public.rank_rules%rowtype;
  v_qualified_legs integer := 0;
  v_is_qualified boolean := false;
  v_group_and_legs_ok boolean := false;
  v_is_rank_upgrade boolean := false;
  v_is_banned boolean := false;
  v_can_claim boolean := false;
  v_claim_reason text := 'No qualified salary rank yet.';
  v_now timestamptz := now();
  v_last_rule public.rank_rules%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if v_requested_by is not null
    and v_requested_by <> v_user_id
    and not public.is_app_admin(v_requested_by)
  then
    raise exception 'Only admins can inspect another user rank';
  end if;

  perform public.ensure_financial_wallet(v_user_id);

  select *
  into v_wallet
  from public.financial_wallets
  where user_id = v_user_id;

  insert into public.user_rank_status(user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  select *
  into v_status
  from public.user_rank_status
  where user_id = v_user_id
  for update;

  select count(*)
  into v_direct_count
  from public.referral_edges
  where sponsor_id = v_user_id;

  with recursive downline(direct_user_id, user_id, path) as (
    select re.user_id, re.user_id, array[re.user_id]
    from public.referral_edges re
    where re.sponsor_id = v_user_id

    union all

    select d.direct_user_id, child.user_id, d.path || child.user_id
    from public.referral_edges child
    join downline d on d.user_id = child.sponsor_id
    where not child.user_id = any(d.path)
  ),
  leg_totals as (
    select
      d.direct_user_id,
      coalesce(sum(coalesce(fw.active_deposit, 0)), 0)::numeric(20, 8) as volume
    from downline d
    left join public.financial_wallets fw on fw.user_id = d.user_id
    group by d.direct_user_id
  )
  select
    coalesce(sum(volume), 0)::numeric(20, 8),
    coalesce(jsonb_agg(jsonb_build_object('user_id', direct_user_id, 'volume', volume) order by volume desc), '[]'::jsonb),
    coalesce(jsonb_agg(jsonb_build_object('user_id', direct_user_id, 'volume', volume) order by volume desc) filter (where volume is not null), '[]'::jsonb)
  into v_group_volume, v_leg_volumes, v_top_three_legs
  from leg_totals;

  v_top_three_legs := coalesce((
    select jsonb_agg(t.value)
    from jsonb_array_elements(v_leg_volumes) with ordinality as t(value, ordinality)
    where t.ordinality <= 3
  ), '[]'::jsonb);

  for v_rule in
    select *
    from public.rank_rules
    order by rank_order desc
  loop
    select count(*)
    into v_qualified_legs
    from jsonb_to_recordset(v_leg_volumes) as leg(user_id uuid, volume numeric)
    where leg.volume >= v_rule.leg_volume_required;

    v_group_and_legs_ok :=
      v_group_volume >= v_rule.group_volume_required
      and v_direct_count >= v_rule.direct_required
      and (v_rule.legs_required = 0 or v_qualified_legs >= v_rule.legs_required);

    v_is_qualified :=
      v_group_and_legs_ok
      and v_wallet.active_deposit >= v_rule.personal_asset_required;

    if v_group_and_legs_ok
      and v_wallet.active_deposit < v_rule.personal_asset_required
      and v_personal_block_rule.rank_code is null
      and v_rule.rank_order > 0
    then
      v_personal_block_rule := v_rule;
    end if;

    if v_is_qualified then
      v_qualified_rule := v_rule;
      exit;
    end if;
  end loop;

  if v_qualified_rule.rank_code is null then
    select * into v_qualified_rule from public.rank_rules where rank_code = 'Bronze';
  end if;

  if v_status.last_claimed_rank is not null then
    select *
    into v_last_rule
    from public.rank_rules
    where rank_code = v_status.last_claimed_rank;

    if v_last_rule.rank_code is not null and v_status.last_claim_at is not null then
      if v_wallet.active_deposit < v_last_rule.personal_asset_required
        and v_status.dropped_below_requirement_at is null
      then
        update public.user_rank_status
        set dropped_below_requirement_at = v_now,
            updated_at = v_now
        where user_id = v_user_id
        returning * into v_status;
      elsif v_wallet.active_deposit >= v_last_rule.personal_asset_required
        and v_status.dropped_below_requirement_at is not null
      then
        update public.user_rank_status
        set suspended_until = greatest(coalesce(suspended_until, v_now), v_now + interval '30 days'),
            dropped_below_requirement_at = null,
            updated_at = v_now
        where user_id = v_user_id
        returning * into v_status;
      end if;
    end if;
  end if;

  v_is_rank_upgrade := v_qualified_rule.rank_order > public.rank_order(v_status.last_claimed_rank);

  update public.user_rank_status
  set
    current_rank = v_qualified_rule.rank_code,
    highest_rank = case
      when v_qualified_rule.rank_order > public.rank_order(highest_rank) then v_qualified_rule.rank_code
      else highest_rank
    end,
    updated_at = v_now
  where user_id = v_user_id
  returning * into v_status;

  if to_regclass('public.profiles') is not null then
    update public.profiles
    set rank = v_qualified_rule.rank_code,
        total_direct_referrals = v_direct_count,
        group_turnover = v_group_volume,
        updated_at = v_now
    where id = v_user_id;
  end if;

  select coalesce(is_banned, false)
  into v_is_banned
  from public.user_account_status
  where user_id = v_user_id;

  if v_is_banned then
    v_claim_reason := 'Banned users cannot claim rank salary.';
  elsif v_qualified_rule.rank_order = 0 then
    if v_personal_block_rule.rank_code is not null then
      v_claim_reason := 'Please Top-Up your Active Asset to claim this reward.';
    else
      v_claim_reason := 'Rank requirements are not met yet.';
    end if;
  elsif v_status.suspended_until is not null and v_status.suspended_until > v_now then
    v_claim_reason := 'Next monthly salary claim is suspended because Active Asset dropped after the last claim.';
  elsif v_status.next_claim_available_at is not null
    and v_status.next_claim_available_at > v_now
    and not v_is_rank_upgrade
  then
    v_claim_reason := 'Monthly salary is locked for 30 days after the last claim.';
  else
    v_can_claim := true;
    if v_is_rank_upgrade and v_status.last_claimed_rank is not null then
      v_claim_reason := 'Rank upgrade detected. New rank salary is available immediately.';
    else
      v_claim_reason := 'Rank salary is available to claim.';
    end if;
  end if;

  select jsonb_agg(to_jsonb(rr) order by rr.rank_order)
  into v_rules
  from public.rank_rules rr;

  return jsonb_build_object(
    'userId', v_user_id,
    'currentRank', v_status.current_rank,
    'highestRank', v_status.highest_rank,
    'qualifiedRank', jsonb_build_object(
      'code', v_qualified_rule.rank_code,
      'name', v_qualified_rule.rank_name,
      'reward', v_qualified_rule.monthly_salary,
      'order', v_qualified_rule.rank_order
    ),
    'personalAsset', v_wallet.active_deposit,
    'directCount', v_direct_count,
    'groupVolume', v_group_volume,
    'groupOmset', v_group_volume,
    'legVolumes', v_leg_volumes,
    'legOmsets', coalesce((select jsonb_agg((value->>'volume')::numeric) from jsonb_array_elements(v_leg_volumes)), '[]'::jsonb),
    'topThreeLegs', v_top_three_legs,
    'rules', coalesce(v_rules, '[]'::jsonb),
    'canClaim', v_can_claim,
    'claimReason', v_claim_reason,
    'isRankUpgrade', v_is_rank_upgrade,
    'nextClaimAvailableAt', v_status.next_claim_available_at,
    'suspendedUntil', v_status.suspended_until,
    'droppedBelowRequirementAt', v_status.dropped_below_requirement_at,
    'personalAssetWarning', case
      when v_personal_block_rule.rank_code is null then null
      else jsonb_build_object(
        'rankCode', v_personal_block_rule.rank_code,
        'required', v_personal_block_rule.personal_asset_required,
        'current', v_wallet.active_deposit,
        'message', 'Please Top-Up your Active Asset to claim this reward.'
      )
    end
  );
end;
$$;

create or replace function public.claim_monthly_rank_reward()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_progress jsonb;
  v_status public.user_rank_status;
  v_rank_code text;
  v_rank_name text;
  v_reward_amount numeric(20, 8);
  v_claim_id uuid;
  v_next_available_at timestamptz := now() + interval '30 days';
  v_wallet public.financial_wallets;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  v_progress := public.get_rank_progress(v_user_id);

  if coalesce((v_progress->>'canClaim')::boolean, false) = false then
    raise exception '%', coalesce(v_progress->>'claimReason', 'Rank salary is not available.');
  end if;

  select *
  into v_status
  from public.user_rank_status
  where user_id = v_user_id
  for update;

  v_rank_code := v_progress #>> '{qualifiedRank,code}';
  v_rank_name := v_progress #>> '{qualifiedRank,name}';
  v_reward_amount := (v_progress #>> '{qualifiedRank,reward}')::numeric;

  if v_rank_code is null or v_rank_code = 'Bronze' or v_reward_amount <= 0 then
    raise exception 'No qualified salary rank to claim';
  end if;

  perform public.ensure_financial_wallet(v_user_id);

  update public.financial_wallets
  set network_bonus_balance = network_bonus_balance + v_reward_amount,
      updated_at = now()
  where user_id = v_user_id
  returning * into v_wallet;

  insert into public.rank_reward_claims(
    user_id,
    rank_code,
    rank_name,
    reward_amount,
    next_claim_available_at,
    snapshot
  )
  values (
    v_user_id,
    v_rank_code,
    v_rank_name,
    v_reward_amount,
    v_next_available_at,
    v_progress
  )
  returning id into v_claim_id;

  insert into public.ledger_entries(user_id, entry_type, amount, balance_after, description, metadata)
  values (
    v_user_id,
    'rank_reward',
    v_reward_amount,
    v_wallet.network_bonus_balance,
    v_rank_name || ' monthly salary claimed',
    jsonb_build_object('rank_reward_claim_id', v_claim_id, 'rank_code', v_rank_code)
  );

  update public.user_rank_status
  set
    current_rank = v_rank_code,
    highest_rank = case
      when public.rank_order(v_rank_code) > public.rank_order(highest_rank) then v_rank_code
      else highest_rank
    end,
    last_claimed_rank = v_rank_code,
    last_claim_at = now(),
    next_claim_available_at = v_next_available_at,
    dropped_below_requirement_at = null,
    updated_at = now()
  where user_id = v_user_id
  returning * into v_status;

  if to_regclass('public.rank_rewards') is not null
    and to_regclass('public.profiles') is not null
    and exists (select 1 from public.profiles where id = v_user_id)
  then
    insert into public.rank_rewards(user_id, rank_code, rank_name, reward_amount, status, eligible_at, claimed_at)
    values (v_user_id, v_rank_code, v_rank_name, v_reward_amount, 'claimed', now(), now());
  end if;

  return jsonb_build_object(
    'success', true,
    'claimId', v_claim_id,
    'rank', v_rank_code,
    'rankName', v_rank_name,
    'amount', v_reward_amount,
    'nextClaimAvailableAt', v_next_available_at
  );
end;
$$;

alter table public.rank_rules enable row level security;
alter table public.user_rank_status enable row level security;
alter table public.rank_reward_claims enable row level security;

drop policy if exists "Anyone can read rank rules" on public.rank_rules;
create policy "Anyone can read rank rules"
on public.rank_rules for select
to authenticated
using (true);

drop policy if exists "Users can read own rank status" on public.user_rank_status;
create policy "Users can read own rank status"
on public.user_rank_status for select
to authenticated
using (auth.uid() = user_id or public.is_app_admin(auth.uid()));

drop policy if exists "Users can read own rank salary claims" on public.rank_reward_claims;
create policy "Users can read own rank salary claims"
on public.rank_reward_claims for select
to authenticated
using (auth.uid() = user_id or public.is_app_admin(auth.uid()));

grant select on public.rank_rules to authenticated;
grant select on public.user_rank_status to authenticated;
grant select on public.rank_reward_claims to authenticated;
grant execute on function public.get_rank_progress(uuid) to authenticated;
grant execute on function public.claim_monthly_rank_reward() to authenticated;
