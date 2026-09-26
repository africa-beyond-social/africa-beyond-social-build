create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create table if not exists public.user_mutes (
  muter_id uuid not null references public.profiles(id) on delete cascade,
  muted_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id),
  check (muter_id <> muted_id)
);
create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete cascade,
  post_id bigint references public.posts(id) on delete cascade,
  reason text not null,
  details text,
  created_at timestamptz not null default now()
);
alter table public.user_blocks enable row level security;
alter table public.user_mutes enable row level security;
alter table public.user_reports enable row level security;
drop policy if exists user_blocks_owner on public.user_blocks;
create policy user_blocks_owner on public.user_blocks for all using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);
drop policy if exists user_mutes_owner on public.user_mutes;
create policy user_mutes_owner on public.user_mutes for all using (auth.uid() = muter_id) with check (auth.uid() = muter_id);
drop policy if exists user_reports_insert on public.user_reports;
create policy user_reports_insert on public.user_reports for insert with check (auth.uid() = reporter_id);
create index if not exists user_blocks_blocked_idx on public.user_blocks(blocked_id);
create index if not exists user_mutes_muted_idx on public.user_mutes(muted_id);
create index if not exists user_reports_reported_user_idx on public.user_reports(reported_user_id);
