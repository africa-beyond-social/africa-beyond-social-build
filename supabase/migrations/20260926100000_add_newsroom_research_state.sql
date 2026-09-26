alter table public.newsroom_stories
  add column if not exists research_status text not null default 'not_started',
  add column if not exists research_attempts integer not null default 0,
  add column if not exists last_researched_at timestamptz;

create index if not exists newsroom_stories_research_queue_idx
  on public.newsroom_stories (status, research_status, detected_at desc);
