alter table public.newsroom_stories
  add column if not exists evidence_basis jsonb not null default '[]'::jsonb,
  add column if not exists unsupported_claims jsonb not null default '[]'::jsonb,
  add column if not exists current_role_status text;

create index if not exists newsroom_stories_human_review_idx
  on public.newsroom_stories (status, confidence, updated_at desc);
