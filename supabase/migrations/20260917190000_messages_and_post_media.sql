-- Private 1-to-1 messaging and post media attachments.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

create index if not exists conversation_members_user_idx on public.conversation_members(user_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null default '',
  attachment_url text,
  attachment_name text,
  attachment_type text,
  attachment_size bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists messages_conversation_created_idx on public.messages(conversation_id, created_at);
create index if not exists messages_sender_idx on public.messages(sender_id);

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Conversation members can view conversations" on public.conversations;
create policy "Conversation members can view conversations"
  on public.conversations for select
  using (exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = conversations.id and cm.user_id = auth.uid()
  ));

drop policy if exists "Authenticated users can create conversations" on public.conversations;
create policy "Authenticated users can create conversations"
  on public.conversations for insert
  with check (auth.uid() is not null);

drop policy if exists "Members can view membership" on public.conversation_members;
create policy "Members can view membership"
  on public.conversation_members for select
  using (user_id = auth.uid() or exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = conversation_members.conversation_id and cm.user_id = auth.uid()
  ));

drop policy if exists "Users can add themselves to conversations" on public.conversation_members;
create policy "Users can add themselves to conversations"
  on public.conversation_members for insert
  with check (user_id = auth.uid());

drop policy if exists "Members can update their read state" on public.conversation_members;
create policy "Members can update their read state"
  on public.conversation_members for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Conversation members can read messages" on public.messages;
create policy "Conversation members can read messages"
  on public.messages for select
  using (exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = messages.conversation_id and cm.user_id = auth.uid()
  ));

drop policy if exists "Conversation members can send messages" on public.messages;
create policy "Conversation members can send messages"
  on public.messages for insert
  with check (
    sender_id = auth.uid() and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id and cm.user_id = auth.uid()
    )
  );

-- A public bucket is used for post media so feeds can render attachments directly.
insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do update set public = true;

drop policy if exists "Post media is publicly readable" on storage.objects;
create policy "Post media is publicly readable"
  on storage.objects for select
  using (bucket_id = 'post-media');

drop policy if exists "Authenticated users can upload post media" on storage.objects;
create policy "Authenticated users can upload post media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete their post media" on storage.objects;
create policy "Users can delete their post media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'post-media' and owner_id = auth.uid()::text);

alter table public.posts add column if not exists media_url text;
alter table public.posts add column if not exists media_type text;
alter table public.posts add column if not exists media_name text;
alter table public.posts add column if not exists media_size bigint;

-- Keep the existing image_url column usable for older posts and consumers.
update public.posts set media_url = image_url where media_url is null and image_url is not null;
update public.posts set media_type = 'image/*' where media_type is null and image_url is not null;
