-- Storage for WIGOD Knowledge Hub source documents
insert into storage.buckets (id, name, public)
values ('wigod-knowledge', 'wigod-knowledge', false)
on conflict (id) do nothing;

create policy "knowledge storage authenticated read"
on storage.objects for select to authenticated
using (bucket_id = 'wigod-knowledge');

create policy "knowledge storage authenticated upload"
on storage.objects for insert to authenticated
with check (bucket_id = 'wigod-knowledge' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "knowledge storage owner update"
on storage.objects for update to authenticated
using (bucket_id = 'wigod-knowledge' and owner_id = auth.uid()::text)
with check (bucket_id = 'wigod-knowledge' and owner_id = auth.uid()::text);
