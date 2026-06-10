-- Fixes applied manually via SQL Editor. Captured here so fresh projects work.

-- 1. SECURITY DEFINER helper — avoids recursive RLS on profiles
create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- 2. Fix profiles RLS — use the helper so admins can read all profiles
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles
  for select
  using (auth.uid() = id or public.current_user_is_admin());

-- 3. Sync app_admins table from profiles.is_admin
-- app_admins is used by is_app_admin() for RPC security checks
insert into public.app_admins (user_id)
select id from public.profiles where is_admin = true
on conflict (user_id) do nothing;
