alter table public.newsroom_stories
  add column if not exists verification_score integer not null default 0,
  add column if not exists independent_source_count integer not null default 0,
  add column if not exists duplicate_key text,
  add column if not exists trending_score numeric not null default 0,
  add column if not exists short_story boolean not null default false,
  add column if not exists automated_review_ready boolean not null default false;

create index if not exists newsroom_stories_duplicate_key_idx on public.newsroom_stories(duplicate_key);
create index if not exists newsroom_stories_intelligence_idx on public.newsroom_stories(automated_review_ready, verification_score desc, detected_at desc);
create index if not exists newsroom_stories_focus_idx on public.newsroom_stories using gin(focus_areas);
