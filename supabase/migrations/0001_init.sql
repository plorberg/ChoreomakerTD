-- 0001_init.sql — Choreo schema, RLS, auto-profile trigger, audio bucket

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz default now()
);

create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free','pro','team')),
  status text not null default 'active',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz
);

create table public.choreographies (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index on public.choreographies (owner_id, updated_at desc);

alter table public.profiles       enable row level security;
alter table public.subscriptions  enable row level security;
alter table public.choreographies enable row level security;

create policy "own profile"      on public.profiles
  for all using (auth.uid() = id);
create policy "own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);
create policy "own choreos"      on public.choreographies
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer as $$
begin
  insert into public.profiles(id, email) values (new.id, new.email);
  insert into public.subscriptions(user_id) values (new.id);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into storage.buckets (id, name, public)
  values ('audio', 'audio', false)
  on conflict do nothing;

create policy "own audio read"  on storage.objects
  for select using (bucket_id = 'audio' and owner = auth.uid());
create policy "own audio write" on storage.objects
  for insert with check (bucket_id = 'audio' and owner = auth.uid());
create policy "own audio delete" on storage.objects
  for delete using (bucket_id = 'audio' and owner = auth.uid());
