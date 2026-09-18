alter table public.posts add column if not exists video_url text;

comment on column public.posts.video_url is 'Public URL for a WIGOD native video attached to a post.';
