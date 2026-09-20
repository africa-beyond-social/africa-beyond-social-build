alter table public.newsroom_articles
  add column if not exists social_status text not null default 'ready' check (social_status in ('ready','generated','queued','published','failed')),
  add column if not exists social_published_at timestamptz;
alter table public.live_events
  add column if not exists newsroom_story_id uuid references public.newsroom_stories(id) on delete set null,
  add column if not exists streamyard_status text not null default 'manual' check (streamyard_status in ('manual','prepared','scheduled','live','completed','failed')),
  add column if not exists streamyard_broadcast_url text;
create index if not exists live_events_newsroom_story_idx on public.live_events(newsroom_story_id);
