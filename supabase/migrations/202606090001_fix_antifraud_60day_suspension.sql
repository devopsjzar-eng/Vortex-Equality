-- Fix: Anti-cheat suspension must be 60 days total (30-day cooldown + 30-day penalty).
-- Previously: suspended_until = now + 30d ran concurrently with next_claim_available_at = claim_date + 30d
-- Both expired at the same time, resulting in only ~30 days effective penalty.
-- Fix: suspended_until now starts AFTER next_claim_available_at, giving a true 60-day wait.

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
  v_suspension_start timestamptz;
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
        -- User dropped below requirement after claiming — start tracking
        update public.user_rank_status
        set dropped_below_requirement_at = v_now,
            updated_at = v_now
        where user_id = v_user_id
        returning * into v_status;

      elsif v_wallet.active_deposit >= v_last_rule.personal_asset_required
        and v_status.dropped_below_requirement_at is not null
      then
        -- User re-topped up after dropping. Apply 60-day punishment:
        -- Suspension begins AFTER the normal 30-day cooldown (next_claim_available_at),
        -- so the total wait is 30 days (normal) + 30 days (penalty) = 60 days.
        v_suspension_start := greatest(
          coalesce(v_status.next_claim_available_at, v_now),
          v_now
        );

        update public.user_rank_status
        set suspended_until = v_suspension_start + interval '30 days',
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
    v_claim_reason := 'Account suspended for 60 days due to Active Asset withdrawal after rank claim. Next available: ' || to_char(v_status.suspended_until, 'YYYY-MM-DD');
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

grant execute on function public.get_rank_progress(uuid) to authenticated;
