create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  category text not null default 'General',
  creator_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member','moderator','admin')),
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create index if not exists communities_category_idx on public.communities(category);
create index if not exists communities_created_at_idx on public.communities(created_at desc);
create index if not exists community_members_user_id_idx on public.community_members(user_id);

alter table public.communities enable row level security;
alter table public.community_members enable row level security;

drop policy if exists "Communities are publicly readable" on public.communities;
create policy "Communities are publicly readable" on public.communities for select using (true);

drop policy if exists "Members are publicly readable" on public.community_members;
create policy "Members are publicly readable" on public.community_members for select using (true);

drop policy if exists "Users can join communities" on public.community_members;
create policy "Users can join communities" on public.community_members for insert with check (auth.uid() = user_id);

drop policy if exists "Users can leave communities" on public.community_members;
create policy "Users can leave communities" on public.community_members for delete using (auth.uid() = user_id);

create or replace function public.set_communities_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_communities_updated_at on public.communities;
create trigger set_communities_updated_at
before update on public.communities
for each row execute function public.set_communities_updated_at();
