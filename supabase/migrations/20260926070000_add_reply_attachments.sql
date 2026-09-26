-- Add rich file attachments to replies.
alter table public.comments
  add column if not exists attachment_url text,
  add column if not exists attachment_type text,
  add column if not exists attachment_name text;
