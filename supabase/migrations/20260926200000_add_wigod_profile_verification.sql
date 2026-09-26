-- WIGOD verification identity signals.
alter table public.profiles
  add column if not exists verification_type text,
  add column if not exists verified_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_verification_type_check;

alter table public.profiles
  add constraint profiles_verification_type_check
  check (verification_type is null or verification_type in ('wigod_staff','wigod_official','creator','organization'));

create index if not exists profiles_verification_type_idx
  on public.profiles (verification_type)
  where verification_type is not null;
