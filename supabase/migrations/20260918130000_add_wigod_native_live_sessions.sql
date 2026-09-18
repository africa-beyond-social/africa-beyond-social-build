alter table public.live_events
  add column if not exists room_name text unique,
  add column if not exists live_started_at timestamptz,
  add column if not exists live_ended_at timestamptz;

create index if not exists live_events_room_name_idx on public.live_events(room_name);
create index if not exists live_events_live_started_at_idx on public.live_events(live_started_at);

drop policy if exists "WIGOD live events are publicly readable" on public.live_events;
create policy "WIGOD live events are publicly readable"
  on public.live_events for select using (true);
