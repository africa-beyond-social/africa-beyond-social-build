-- WIGOD Newsroom: persistent Source Scout and detected story pipeline

create table if not exists public.news_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_type text not null check (source_type in ('rss','website','x','facebook','google_news')),
  url text not null,
  active boolean not null default true,
  last_checked_at timestamptz,
  last_error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists news_sources_url_unique on public.news_sources (lower(url));
create index if not exists news_sources_active_idx on public.news_sources (active, source_type);

create table if not exists public.newsroom_stories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_id uuid references public.news_sources(id) on delete set null,
  source_name text,
  source_url text not null,
  canonical_url text,
  author text,
  published_at timestamptz,
  detected_at timestamptz not null default now(),
  summary text,
  content_text text,
  image_url text,
  status text not null default 'new' check (status in ('new','verifying','draft','review','held','approved','rejected','published')),
  confidence text not null default 'unverified' check (confidence in ('unverified','developing','cross_checked')),
  verification_notes text,
  ai_draft text,
  duplicate_of uuid references public.newsroom_stories(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists newsroom_stories_canonical_unique
  on public.newsroom_stories (canonical_url)
  where canonical_url is not null;

create index if not exists newsroom_stories_status_idx on public.newsroom_stories(status, detected_at desc);
create index if not exists newsroom_stories_source_idx on public.newsroom_stories(source_id, detected_at desc);

alter table public.news_sources enable row level security;
alter table public.newsroom_stories enable row level security;

drop policy if exists "news_sources_admin_read" on public.news_sources;
drop policy if exists "newsroom_stories_admin_read" on public.newsroom_stories;

create policy "news_sources_admin_read" on public.news_sources
for select to authenticated using (true);

create policy "newsroom_stories_admin_read" on public.newsroom_stories
for select to authenticated using (true);
