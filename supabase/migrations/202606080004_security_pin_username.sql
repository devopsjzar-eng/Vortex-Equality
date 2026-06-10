-- Phase 5: username uniqueness, hashed withdrawal PIN, and OTP support for PIN resets.

create extension if not exists pgcrypto schema extensions;

alter table public.profiles
  add column if not exists username text,
  add column if not exists password_hash text;

create unique index if not exists profiles_email_lower_unique
  on public.profiles(lower(email));

create unique index if not exists profiles_username_lower_unique
  on public.profiles(lower(username))
  where username is not null;

create table if not exists public.user_security_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  withdrawal_pin_hash text,
  withdrawal_pin_set_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_security_settings enable row level security;

drop policy if exists "Users can read own security settings" on public.user_security_settings;
create policy "Users can read own security settings"
on public.user_security_settings for select
to authenticated
using (auth.uid() = user_id or public.is_app_admin(auth.uid()));

grant select on public.user_security_settings to authenticated;

create or replace function public.set_withdrawal_pin_hash(
  p_user_id uuid,
  p_pin text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_user_id is null then
    raise exception 'User is required';
  end if;

  if p_pin is null or p_pin !~ '^[0-9]{6}$' then
    raise exception 'Withdrawal PIN must be exactly 6 digits';
  end if;

  if auth.uid() is not null
    and auth.uid() <> p_user_id
    and not public.is_app_admin(auth.uid())
  then
    raise exception 'Only the account owner can set this PIN';
  end if;

  insert into public.user_security_settings(user_id, withdrawal_pin_hash, withdrawal_pin_set_at, updated_at)
  values (p_user_id, crypt(p_pin, gen_salt('bf', 12)), now(), now())
  on conflict (user_id) do update
  set withdrawal_pin_hash = excluded.withdrawal_pin_hash,
      withdrawal_pin_set_at = excluded.withdrawal_pin_set_at,
      updated_at = now();
end;
$$;

create or replace function public.verify_withdrawal_pin(
  p_user_id uuid,
  p_pin text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
begin
  if p_user_id is null or p_pin is null or p_pin !~ '^[0-9]{6}$' then
    return false;
  end if;

  if auth.uid() is not null
    and auth.uid() <> p_user_id
    and not public.is_app_admin(auth.uid())
  then
    return false;
  end if;

  select withdrawal_pin_hash
  into v_hash
  from public.user_security_settings
  where user_id = p_user_id;

  if v_hash is null then
    return false;
  end if;

  return v_hash = crypt(p_pin, v_hash);
end;
$$;

grant execute on function public.set_withdrawal_pin_hash(uuid, text) to authenticated;
grant execute on function public.set_withdrawal_pin_hash(uuid, text) to service_role;
grant execute on function public.verify_withdrawal_pin(uuid, text) to authenticated;
grant execute on function public.verify_withdrawal_pin(uuid, text) to service_role;

alter table public.password_reset_otps
  add column if not exists otp_code text,
  add column if not exists purpose text not null default 'password_reset';

update public.password_reset_otps
set otp_code = coalesce(otp_code, otp)
where otp_code is null;

create unique index if not exists password_reset_otps_email_purpose_unique
  on public.password_reset_otps(email, purpose);
