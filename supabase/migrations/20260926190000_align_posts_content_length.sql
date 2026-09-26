-- Keep the database post-length rule aligned with the application limit.
-- WIGOD posts allow up to 1500 characters.
alter table public.posts
  drop constraint if exists posts_content_length;

alter table public.posts
  add constraint posts_content_length
  check (char_length(content) <= 1500);
