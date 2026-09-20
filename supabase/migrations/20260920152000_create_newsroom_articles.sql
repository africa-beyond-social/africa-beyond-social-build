create table if not exists public.newsroom_articles (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null unique references public.newsroom_stories(id) on delete cascade,
  title text not null,
  slug text,
  dek text,
  body_html text not null default '',
  seo_title text,
  seo_description text,
  category text,
  tags jsonb not null default '[]'::jsonb,
  featured_image_url text,
  website_provider text not null default 'ghost',
  website_status text not null default 'ready' check (website_status in ('ready','scheduled','published','failed')),
  website_post_id text,
  website_url text,
  website_published_at timestamptz,
  social_x text,
  social_facebook text,
  social_tiktok text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists newsroom_articles_status_idx on public.newsroom_articles(website_status);
alter table public.newsroom_articles enable row level security;
create policy "Authenticated users can read newsroom articles"
  on public.newsroom_articles for select to authenticated using (true);
