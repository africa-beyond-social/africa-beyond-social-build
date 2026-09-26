-- Restore the production post-media bucket used by post and reply uploads.
insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do update set name = excluded.name, public = true;
