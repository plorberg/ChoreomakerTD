-- 0003_admin_role.sql — Admin role + policies for cross-user visibility

-- Add a role column to profiles. Default is 'user'.
alter table public.profiles
  add column if not exists role text not null default 'user'
  check (role in ('user', 'admin'));

-- Helper: SECURITY DEFINER function returns true if the calling user is an
-- admin. Used in RLS policies. SECURITY DEFINER lets it read profiles.role
-- regardless of the calling user's RLS view.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated, anon;

-- Admin can SELECT everything (and DELETE — useful for moderation).
create policy "admin reads all profiles"
  on public.profiles for select
  using (public.is_admin());

create policy "admin reads all choreos"
  on public.choreographies for select
  using (public.is_admin());

create policy "admin deletes any choreo"
  on public.choreographies for delete
  using (public.is_admin());

create policy "admin reads all subscriptions"
  on public.subscriptions for select
  using (public.is_admin());

create policy "admin reads all share links"
  on public.share_links for select
  using (public.is_admin());

create policy "admin deletes any share link"
  on public.share_links for delete
  using (public.is_admin());

-- To create your first admin, run this in the SQL editor manually:
--
--   update public.profiles set role = 'admin' where email = 'you@example.com';
--
