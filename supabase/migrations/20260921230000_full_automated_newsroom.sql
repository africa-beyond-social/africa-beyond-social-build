-- WIGOD full automated newsroom foundation
create extension if not exists pg_trgm;

alter table public.news_sources
  add column if not exists priority text not null default 'standard',
  add column if not exists focus_areas jsonb not null default '[]'::jsonb,
  add column if not exists monitoring_enabled boolean not null default true;

alter table public.newsroom_stories
  add column if not exists story_type text not null default 'news',
  add column if not exists focus_areas jsonb not null default '[]'::jsonb,
  add column if not exists verification_class text not null default 'unverified',
  add column if not exists editorial_route text not null default 'human_review',
  add column if not exists editorial_watchpoints jsonb not null default '[]'::jsonb,
  add column if not exists verification_score integer not null default 0,
  add column if not exists independent_source_count integer not null default 0,
  add column if not exists duplicate_key text,
  add column if not exists trending_score numeric not null default 0,
  add column if not exists short_story boolean not null default false,
  add column if not exists automated_review_ready boolean not null default false;

alter table public.newsroom_articles
  add column if not exists source_box jsonb not null default '[]'::jsonb,
  add column if not exists focus_areas jsonb not null default '[]'::jsonb,
  add column if not exists editorial_notes text,
  add column if not exists live_summary text,
  add column if not exists live_watchpoints jsonb not null default '[]'::jsonb,
  add column if not exists signature text not null default 'Africa & Beyond — News | Analysis | Perspective',
  add column if not exists social_status text not null default 'pending';

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

create table if not exists public.newsroom_automation_runs (
  id uuid primary key default gen_random_uuid(),
  run_type text not null default 'newsroom_engine',
  status text not null default 'running',
  step text,
  message text,
  story_id uuid references public.newsroom_stories(id) on delete set null,
  stories_detected integer not null default 0,
  stories_verified integer not null default 0,
  stories_drafted integer not null default 0,
  articles_ready integer not null default 0,
  error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists newsroom_automation_runs_started_idx
on public.newsroom_automation_runs(started_at desc);

alter table public.newsroom_automation_runs enable row level security;
drop policy if exists "Authenticated users can read newsroom automation runs" on public.newsroom_automation_runs;
create policy "Authenticated users can read newsroom automation runs"
on public.newsroom_automation_runs for select to authenticated using (true);

create or replace function public.run_newsroom_auto_verification()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  related_count integer;
  score integer;
  auto_ready boolean;
  vclass text;
  stype text;
  updated_count integer := 0;
begin
  for r in
    select s.*, coalesce(ns.priority,'standard') as source_priority,
           coalesce(ns.focus_areas,'[]'::jsonb) as source_focus
    from newsroom_stories s
    left join news_sources ns on ns.id=s.source_id
    where coalesce(s.published_at,s.detected_at) >= now() - interval '48 hours'
      and s.status in ('new','verifying','draft','review','held')
  loop
    select count(distinct other.source_id) into related_count
    from newsroom_stories other
    where other.id <> r.id
      and other.source_id is not null
      and other.source_id <> r.source_id
      and coalesce(other.published_at,other.detected_at) >= now() - interval '48 hours'
      and similarity(lower(coalesce(other.title,'')), lower(coalesce(r.title,''))) >= 0.68;

    if lower(coalesce(r.title,'') || ' ' || coalesce(r.summary,'')) ~
       '\m(alleged|alleges|allegation|accused|claims?|reportedly|allegedly)\M' then
      vclass := 'allegation'; stype := 'allegation';
    elsif lower(coalesce(r.title,'') || ' ' || coalesce(r.summary,'')) ~
       '\m(denies|denied|denial|rejects|rejected)\M' then
      vclass := 'denial'; stype := 'denial';
    elsif lower(coalesce(r.title,'') || ' ' || coalesce(r.summary,'')) ~
       '\m(opinion|editorial|commentary|analysis)\M' then
      vclass := 'opinion'; stype := 'analysis';
    elsif lower(coalesce(r.title,'') || ' ' || coalesce(r.summary,'')) ~
       '\m(says|said|statement|announces|announced|according to)\M' then
      vclass := 'official_statement'; stype := 'statement';
    else
      vclass := 'unverified'; stype := 'news';
    end if;

    score := case r.source_priority
      when 'critical' then 25
      when 'high' then 18
      when 'archive' then 3
      else 10
    end;
    score := least(100, greatest(0, score + least(45, related_count * 15) +
      case when r.canonical_url is not null then 5 else 0 end -
      case when vclass='allegation' then 15 when vclass='conflicting' then 25 else 0 end));

    auto_ready := related_count >= 2 and score >= 60
      and vclass not in ('allegation','conflicting','opinion');

    update newsroom_stories
    set story_type=stype,
        verification_class=vclass,
        verification_score=score,
        independent_source_count=related_count,
        automated_review_ready=auto_ready,
        editorial_route=case when auto_ready then 'automated_review' else 'human_review' end,
        focus_areas=case when jsonb_array_length(coalesce(newsroom_stories.focus_areas,'[]'::jsonb)) > 0
          then newsroom_stories.focus_areas else r.source_focus end,
        short_story=(length(coalesce(summary,'')) < 700),
        editorial_watchpoints=case
          when auto_ready then '[]'::jsonb
          else jsonb_build_array('Additional verification or editorial review required.')
        end,
        updated_at=now()
    where id=r.id;

    updated_count := updated_count + 1;
  end loop;

  return jsonb_build_object(
    'processed', updated_count,
    'automated_review_ready',
    (select count(*) from newsroom_stories where automated_review_ready=true
      and coalesce(published_at,detected_at) >= now() - interval '48 hours')
  );
end;
$$;
