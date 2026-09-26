-- WIGOD Social: saved posts and rich reply attachments
alter table if exists public.comments add column if not exists attachment_url text;
alter table if exists public.comments add column if not exists attachment_type text;
alter table if exists public.comments add column if not exists attachment_name text;

create table if not exists public.saved_posts (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id bigint not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table public.saved_posts enable row level security;
drop policy if exists "saved_posts_select_own" on public.saved_posts;
create policy "saved_posts_select_own" on public.saved_posts for select using (auth.uid() = user_id);
drop policy if exists "saved_posts_insert_own" on public.saved_posts;
create policy "saved_posts_insert_own" on public.saved_posts for insert with check (auth.uid() = user_id);
drop policy if exists "saved_posts_delete_own" on public.saved_posts;
create policy "saved_posts_delete_own" on public.saved_posts for delete using (auth.uid() = user_id);

-- Allow replies to carry media uploaded to the existing post-media bucket.
