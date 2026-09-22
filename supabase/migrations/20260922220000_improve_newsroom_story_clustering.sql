-- Improve WIGOD Newsroom clustering for Google News publisher feeds.
-- Keeps the verification gate conservative while recognizing the same event
-- when publishers use substantially different headlines.

create extension if not exists pg_trgm;

create or replace function public.newsroom_publisher_key(source_name text, source_url text)
returns text
language sql
immutable
as $$
  select lower(trim(
    case
      when coalesce(source_name,'') ilike 'Google News %·%' then
        regexp_replace(source_name, '^Google News[^·]*·[[:space:]]*', '', 'i')
      else coalesce(source_name, source_url, 'unknown')
    end
  ));
$$;

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
    select s.*,
           coalesce(ns.priority,'standard') as source_priority,
           coalesce(ns.focus_areas,'[]'::jsonb) as source_focus,
           public.newsroom_publisher_key(s.source_name, s.source_url) as publisher_key
    from newsroom_stories s
    left join news_sources ns on ns.id=s.source_id
    where coalesce(s.published_at,s.detected_at) >= now() - interval '48 hours'
      and s.status in ('new','verifying','draft','review','held')
  loop
    select count(distinct public.newsroom_publisher_key(other.source_name, other.source_url))
      into related_count
    from newsroom_stories other
    where other.id <> r.id
      and public.newsroom_publisher_key(other.source_name, other.source_url) <> r.publisher_key
      and coalesce(other.published_at,other.detected_at) >= now() - interval '48 hours'
      and (
        similarity(lower(coalesce(other.title,'')), lower(coalesce(r.title,''))) >= 0.30
        or word_similarity(lower(coalesce(other.title,'')), lower(coalesce(r.title,''))) >= 0.34
      );

    if lower(coalesce(r.title,'') || ' ' || coalesce(r.summary,'')) ~
       '\m(alleged|alleges|allegation|accused|claims?|reportedly|allegedly)\M' then
      vclass := 'allegation'; stype := 'allegation';
    elsif lower(coalesce(r.title,'') || ' ' || coalesce(r.summary,'')) ~
       '\m(denies|denied|denial|rejects|rejected)\M' then
      vclass := 'denial'; stype := 'reaction';
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

    score := least(100, greatest(0,
      score
      + least(45, related_count * 15)
      + case when r.canonical_url is not null then 5 else 0 end
      - case when vclass='allegation' then 15
             when vclass='conflicting' then 25
             else 0 end
    ));

    auto_ready := related_count >= 2
      and score >= 60
      and vclass not in ('allegation','conflicting','opinion');

    update newsroom_stories
    set story_type=stype,
        verification_class=vclass,
        verification_score=score,
        independent_source_count=related_count,
        automated_review_ready=auto_ready,
        editorial_route=case when auto_ready then 'automated_review' else 'human_review' end,
        focus_areas=case
          when jsonb_array_length(coalesce(newsroom_stories.focus_areas,'[]'::jsonb)) > 0
          then newsroom_stories.focus_areas
          else r.source_focus
        end,
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
    (select count(*)
       from newsroom_stories
      where automated_review_ready=true
        and coalesce(published_at,detected_at) >= now() - interval '48 hours')
  );
end;
$$;
