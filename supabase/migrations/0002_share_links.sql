-- 0002_share_links.sql — Shareable read-only and editor links

create table public.share_links (
  token uuid primary key default gen_random_uuid(),
  choreo_id uuid not null references public.choreographies(id) on delete cascade,
  role text not null check (role in ('viewer', 'editor')),
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete cascade
);

create index on public.share_links (choreo_id);

alter table public.share_links enable row level security;

-- Owners can manage their own share links
create policy "owner manages share links"
  on public.share_links
  for all
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);
