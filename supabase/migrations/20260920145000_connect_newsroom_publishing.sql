alter table public.posts add column if not exists newsroom_story_id uuid references public.newsroom_stories(id) on delete set null;
create unique index if not exists posts_newsroom_story_unique on public.posts(newsroom_story_id) where newsroom_story_id is not null;
