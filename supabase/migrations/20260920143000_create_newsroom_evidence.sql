-- WIGOD Newsroom: evidence/cross-check layer
create table if not exists public.newsroom_evidence (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.newsroom_stories(id) on delete cascade,
  related_story_id uuid references public.newsroom_stories(id) on delete set null,
  source_name text not null,
  source_url text not null,
  title text,
  published_at timestamptz,
  summary text,
  content_text text,
  relation text not null default 'unclear' check (relation in ('supporting','conflicting','unclear')),
  notes text,
  created_at timestamptz not null default now()
);
create unique index if not exists newsroom_evidence_unique_story_url on public.newsroom_evidence(story_id, source_url);
create index if not exists newsroom_evidence_story_idx on public.newsroom_evidence(story_id, created_at desc);
alter table public.newsroom_evidence enable row level security;
drop policy if exists "newsroom_evidence_admin_read" on public.newsroom_evidence;
create policy "newsroom_evidence_admin_read" on public.newsroom_evidence for select to authenticated using (true);
