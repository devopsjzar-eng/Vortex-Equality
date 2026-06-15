-- Fix: propagate group_turnover up the ancestor chain in real-time
-- whenever a member's active_deposit changes (deposit, withdrawal, top-up, admin adjustment).
--
-- Flow: financial_wallets.active_deposit changes
--   → walk UP referral_edges (user → sponsor → sponsor's sponsor → ...)
--   → for each ancestor, recompute the full recursive sum of all descendants' active_deposit
--   → write result to profiles.group_turnover
--
-- The admin Members page already subscribes to postgres_changes on profiles,
-- so the UI refreshes automatically with no frontend change needed.

create or replace function public.propagate_group_turnover()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_user uuid;
  v_ancestor_id  uuid;
  v_group_vol    numeric(20, 8);
begin
  v_current_user := new.user_id;

  loop
    -- Climb one level up
    select sponsor_id
    into v_ancestor_id
    from public.referral_edges
    where user_id = v_current_user;

    exit when v_ancestor_id is null;

    -- Recompute full group volume for this ancestor
    with recursive downline(user_id) as (
      select re.user_id
      from public.referral_edges re
      where re.sponsor_id = v_ancestor_id
      union all
      select child.user_id
      from public.referral_edges child
      join downline d on d.user_id = child.sponsor_id
    )
    select coalesce(sum(fw.active_deposit), 0)
    into v_group_vol
    from downline d
    left join public.financial_wallets fw on fw.user_id = d.user_id;

    update public.profiles
    set
      group_turnover = v_group_vol,
      updated_at     = now()
    where id = v_ancestor_id;

    v_current_user := v_ancestor_id;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_propagate_group_turnover on public.financial_wallets;
drop trigger if exists trg_propagate_group_turnover_insert on public.financial_wallets;
drop trigger if exists trg_propagate_group_turnover_update on public.financial_wallets;

create trigger trg_propagate_group_turnover_insert
  after insert on public.financial_wallets
  for each row
  when (pg_trigger_depth() = 0)
  execute function public.propagate_group_turnover();

create trigger trg_propagate_group_turnover_update
  after update of active_deposit on public.financial_wallets
  for each row
  when (pg_trigger_depth() = 0 and old.active_deposit is distinct from new.active_deposit)
  execute function public.propagate_group_turnover();
