-- Fix: reset total_claimed_profit to 0 on every top-up so the 400% ceiling
-- is recalculated fresh from the new active_deposit.
--
-- Also includes the full multi-level referral commission loop (8% L1, 5% L2, 2% L3)
-- applied in the previous session directly on the DB — this migration keeps files in sync.

drop function if exists public.apply_user_top_up(uuid, numeric, text, text, jsonb, numeric);

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
  v_wallet        public.financial_wallets;
  v_deposit_id    uuid;
  v_sponsor_id    uuid;
  v_current_user  uuid;
  v_level         int;
  v_level_pcts    numeric[] := ARRAY[8, 5, 2];
  v_level_pct     numeric;
  v_commission    numeric(20, 8);
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

  -- Duplicate deposit (idempotency guard fired): nothing to do
  if v_deposit_id is null then
    return public.recalculate_wallet_state(p_user_id);
  end if;

  -- Add deposit to capital AND reset the 400% profit counter so the new ceiling
  -- is calculated from 0 against the new (larger) active_deposit.
  update public.financial_wallets
  set
    active_deposit       = active_deposit + p_amount,
    total_claimed_profit = 0
  where user_id = p_user_id
  returning * into v_wallet;

  insert into public.ledger_entries(user_id, entry_type, amount, balance_after, description, metadata)
  values (
    p_user_id,
    case when coalesce(p_source, 'manual') = 'manual'
      then 'top_up'::public.ledger_entry_type
      else 'deposit'::public.ledger_entry_type
    end,
    p_amount,
    v_wallet.active_deposit,
    'Active deposit top-up',
    jsonb_build_object('deposit_id', v_deposit_id, 'source', coalesce(p_source, 'manual'))
    || coalesce(p_metadata, '{}'::jsonb)
  );

  -- Multi-level referral commissions: 8% L1, 5% L2, 2% L3
  v_current_user := p_user_id;
  for v_level in 1..3 loop
    select sponsor_id
    into v_sponsor_id
    from public.referral_edges
    where user_id = v_current_user;

    exit when v_sponsor_id is null;

    v_level_pct  := v_level_pcts[v_level];
    v_commission := round((p_amount * v_level_pct / 100)::numeric, 8);

    if v_commission > 0 then
      perform public.ensure_financial_wallet(v_sponsor_id);

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
        'Referral commission (level ' || v_level || ') from downline deposit',
        jsonb_build_object(
          'deposit_id',             v_deposit_id,
          'commission_level',       v_level,
          'commission_percentage',  v_level_pct,
          'depositor_id',           p_user_id
        )
      );
    end if;

    v_current_user := v_sponsor_id;
  end loop;

  return public.recalculate_wallet_state(p_user_id);
end;
$$;
