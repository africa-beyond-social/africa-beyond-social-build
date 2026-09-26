-- WIGOD Newsroom: regional publisher intelligence for Zimbabwe and South Africa.
-- Stores canonical publisher identity separately from feed/source identity.

alter table public.news_sources
  add column if not exists country text,
  add column if not exists publisher_name text,
  add column if not exists aliases jsonb not null default '[]'::jsonb;

alter table public.newsroom_stories
  add column if not exists publisher_name text,
  add column if not exists publisher_country text;

create index if not exists news_sources_priority_country_idx
  on public.news_sources (priority, country, active, monitoring_enabled);

create index if not exists newsroom_stories_publisher_country_idx
  on public.newsroom_stories (publisher_country, publisher_name, detected_at desc);
