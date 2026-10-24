-- Permit WIGOD Knowledge Hub source files up to 50 MiB.
-- Large files are uploaded from the browser directly to Supabase Storage,
-- avoiding Vercel request-body limits.
update storage.buckets
set file_size_limit = 52428800
where id = 'wigod-knowledge';
