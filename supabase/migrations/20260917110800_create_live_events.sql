-- Africa & Beyond Social Live Centre
-- Persistent scheduled/live event records for the broadcasting centre.

create table if not exists public.live_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  start_at timestamptz not null,
  end_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'completed', 'cancelled')),
  provider text not null default 'youtube' check (provider in ('youtube', 'streamyard', 'other')),
  video_id text,
  stream_url text,
  thumbnail_url text,
  category text not null default 'community',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists live_events_start_at_idx on public.live_events (start_at);
create index if not exists live_events_status_idx on public.live_events (status);
create index if not exists live_events_provider_idx on public.live_events (provider);

alter table public.live_events enable row level security;

drop policy if exists "Live events are publicly readable" on public.live_events;
create policy "Live events are publicly readable"
  on public.live_events for select
  using (true);

create or replace function public.set_live_events_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_live_events_updated_at on public.live_events;
create trigger set_live_events_updated_at
before update on public.live_events
for each row execute function public.set_live_events_updated_at();
