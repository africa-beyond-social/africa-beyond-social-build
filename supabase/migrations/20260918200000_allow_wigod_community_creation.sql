drop policy if exists "Authenticated users can create communities" on public.communities;
create policy "Authenticated users can create communities"
on public.communities
for insert
with check (auth.uid() = creator_id);
