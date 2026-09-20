-- WIGOD Newsroom master editorial + live desk foundation
create table if not exists public.newsroom_focus_areas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  parent text,
  active boolean not null default true,
  priority integer not null default 50,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists newsroom_focus_areas_priority_idx on public.newsroom_focus_areas(active, priority desc, name);

create table if not exists public.newsroom_editorial_policies (
  id uuid primary key default gen_random_uuid(),
  policy_key text not null unique,
  title text not null,
  instruction text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.news_sources
  add column if not exists priority text not null default 'standard' check (priority in ('critical','high','standard','archive')),
  add column if not exists focus_areas jsonb not null default '[]'::jsonb,
  add column if not exists monitoring_enabled boolean not null default true;

alter table public.newsroom_stories
  add column if not exists story_type text not null default 'news' check (story_type in ('news','statement','allegation','opinion','analysis','brief','announcement','reaction')),
  add column if not exists focus_areas jsonb not null default '[]'::jsonb,
  add column if not exists verification_class text not null default 'unverified' check (verification_class in ('verified_fact','official_statement','source_claim','allegation','denial','opinion','analysis','unverified','conflicting')),
  add column if not exists editorial_route text not null default 'human_review' check (editorial_route in ('automated_review','human_review')),
  add column if not exists editorial_watchpoints jsonb not null default '[]'::jsonb;

alter table public.newsroom_articles
  add column if not exists source_box jsonb not null default '[]'::jsonb,
  add column if not exists focus_areas jsonb not null default '[]'::jsonb,
  add column if not exists editorial_notes text,
  add column if not exists live_summary text,
  add column if not exists live_watchpoints jsonb not null default '[]'::jsonb,
  add column if not exists signature text not null default 'Africa & Beyond — News | Analysis | Perspective';

alter table public.live_events
  add column if not exists newsroom_story_ids jsonb not null default '[]'::jsonb,
  add column if not exists website_links jsonb not null default '[]'::jsonb,
  add column if not exists editor_notes text,
  add column if not exists live_summary text,
  add column if not exists watchpoints jsonb not null default '[]'::jsonb,
  add column if not exists broadcast_brief text,
  add column if not exists social_hook_x text,
  add column if not exists social_hook_facebook text,
  add column if not exists social_hook_tiktok text;

alter table public.newsroom_focus_areas enable row level security;
alter table public.newsroom_editorial_policies enable row level security;
drop policy if exists "newsroom_focus_areas_admin_read" on public.newsroom_focus_areas;
drop policy if exists "newsroom_editorial_policies_admin_read" on public.newsroom_editorial_policies;
create policy "newsroom_focus_areas_admin_read" on public.newsroom_focus_areas for select to authenticated using (true);
create policy "newsroom_editorial_policies_admin_read" on public.newsroom_editorial_policies for select to authenticated using (true);

insert into public.newsroom_focus_areas (name,parent,priority) values
('Zimbabwe','Zimbabwe',100),('Harare','Zimbabwe',90),('Bulawayo','Zimbabwe',90),('Masvingo','Zimbabwe',90),
('Manicaland','Zimbabwe',80),('Midlands','Zimbabwe',80),('Mashonaland','Zimbabwe',80),('Matabeleland','Zimbabwe',80),
('Africa','Africa',90),('South Africa','Africa',90),('SADC','Africa',95),('East Africa','Africa',75),('West Africa','Africa',75),
('Central Africa','Africa',75),('North Africa','Africa',75),('Sahel','Africa',75),
('Middle East','World',80),('Europe','World',60),('Asia','World',60),('Americas','World',60),
('Sports','Other',85),('Business','Other',80),('Technology','Other',70),('Culture','Other',70),('Community','Other',75)
on conflict (name) do nothing;

insert into public.newsroom_editorial_policies (policy_key,title,instruction) values
('accuracy','Accuracy','Never invent facts, people, events, quotations, statistics, sources, dates or context.'),
('attribution','Attribution','Clearly identify who said or published a claim. A source statement is not automatically an established fact.'),
('allegations','Allegations','Keep allegations as allegations. Do not convert accusations into facts. Include denials or responses where available.'),
('verification','Verification','Cross-check important claims against credible independent or primary sources and preserve conflicts and uncertainty.'),
('neutrality','Editorial neutrality','Report political and contested matters factually and attribute competing claims without advocacy.'),
('headline','Headline','Use accurate, informative headlines that do not exaggerate the evidence.'),
('signature','Signature','End every published article with Africa & Beyond — News | Analysis | Perspective.'),
('style','Africa & Beyond format','Use the publication archive as a structural reference for headline, excerpt, article body, context and signature without copying text.'),
('live','Live reporting','Prepare factual summaries, website links and watchpoints so the human editor can use the published report for live reporting.')
on conflict (policy_key) do update set title=excluded.title,instruction=excluded.instruction,updated_at=now();
