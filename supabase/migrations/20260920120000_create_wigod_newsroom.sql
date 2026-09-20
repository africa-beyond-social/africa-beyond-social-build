-- WIGOD Newsroom MVP
-- Source Scout -> Detection -> Verification -> Editor Review

create table if not exists public.newsroom_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null unique,
  feed_url text,
  source_type text not null default 'rss' check (source_type in ('rss','website','x','facebook','other')),
  active boolean not null default true,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.newsroom_stories (
  id uuid primary key default gen_random_uuid(),
  headline text not null,
  summary text,
  status text not null default 'incoming' check (status in ('incoming','verifying','ready_for_editor','published','held','rejected')),
  verification_state text not null default 'reported' check (verification_state in ('confirmed','reported','unconfirmed','conflicting')),
  original_url text,
  published_at timestamptz,
  detected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(original_url)
);

create table if not exists public.newsroom_story_sources (
  story_id uuid not null references public.newsroom_stories(id) on delete cascade,
  source_id uuid not null references public.newsroom_sources(id) on delete cascade,
  source_title text,
  source_url text not null,
  source_published_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (story_id, source_id)
);

create table if not exists public.newsroom_drafts (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null unique references public.newsroom_stories(id) on delete cascade,
  headline text,
  lead text,
  body text,
  background text,
  social_copy text,
  thumbnail_brief text,
  editor_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists newsroom_sources_active_idx on public.newsroom_sources(active);
create index if not exists newsroom_stories_status_idx on public.newsroom_stories(status);
create index if not exists newsroom_stories_detected_at_idx on public.newsroom_stories(detected_at desc);

alter table public.newsroom_sources enable row level security;
alter table public.newsroom_stories enable row level security;
alter table public.newsroom_story_sources enable row level security;
alter table public.newsroom_drafts enable row level security;

-- Newsroom data is accessed server-side by authorised editors through the service role.
-- No public client policies are granted.
