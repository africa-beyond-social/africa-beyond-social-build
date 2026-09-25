-- WIGOD Newsroom: direct Source Inbox submissions
alter table public.newsroom_stories
  add column if not exists source_route text not null default 'scout'
    check (source_route in ('scout','source_inbox'));

create table if not exists public.newsroom_source_submissions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references auth.users(id) on delete set null,
  original_filename text not null,
  mime_type text,
  storage_path text not null,
  source_kind text not null default 'document',
  source_name text,
  source_url text,
  extracted_text text,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'received'
    check (status in ('received','processing','ready','published','failed')),
  newsroom_story_id uuid references public.newsroom_stories(id) on delete set null,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists newsroom_source_submissions_created_idx
  on public.newsroom_source_submissions(created_at desc);

alter table public.newsroom_source_submissions enable row level security;
drop policy if exists "Authenticated users can read source submissions" on public.newsroom_source_submissions;
create policy "Authenticated users can read source submissions"
on public.newsroom_source_submissions for select to authenticated using (submitted_by = auth.uid());

create index if not exists newsroom_stories_source_route_idx
  on public.newsroom_stories(source_route, detected_at desc);
