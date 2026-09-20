-- WIGOD Knowledge Hub V2: expandable Zimbabwe curriculum + knowledge archive
create extension if not exists pgcrypto;

create table if not exists public.knowledge_nodes (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.knowledge_nodes(id) on delete cascade,
  node_type text not null check (node_type in ('country','level','grade','form','subject','institution','programme','faculty','module','topic','concept')),
  name text not null,
  slug text not null,
  country_code text default 'ZW',
  curriculum_version text,
  sort_order integer default 0,
  is_active boolean default true,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(parent_id, slug)
);

create index if not exists knowledge_nodes_parent_idx on public.knowledge_nodes(parent_id);
create index if not exists knowledge_nodes_type_idx on public.knowledge_nodes(node_type);

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  node_id uuid references public.knowledge_nodes(id) on delete set null,
  title text not null,
  document_type text not null default 'course_material',
  source_name text,
  source_url text,
  storage_path text,
  education_level text,
  subject text,
  module text,
  syllabus_version text,
  access_level text not null default 'private' check (access_level in ('private','institution','public')),
  rights_status text not null default 'user_supplied' check (rights_status in ('user_supplied','licensed','public_domain','permission_required','unknown')),
  processing_status text not null default 'pending' check (processing_status in ('pending','processing','processed','failed')),
  extracted_text text,
  metadata jsonb not null default '{}'::jsonb,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists knowledge_documents_node_idx on public.knowledge_documents(node_id);
create index if not exists knowledge_documents_status_idx on public.knowledge_documents(processing_status);

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  chunk_index integer not null,
  page_number integer,
  heading text,
  content text not null,
  source_locator text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(document_id, chunk_index)
);

create index if not exists knowledge_chunks_document_idx on public.knowledge_chunks(document_id);

create table if not exists public.knowledge_records (
  id uuid primary key default gen_random_uuid(),
  node_id uuid references public.knowledge_nodes(id) on delete set null,
  title text not null,
  record_type text not null default 'learning_guide',
  summary text,
  body text not null,
  verification_status text not null default 'ai_explanation' check (verification_status in ('source_supported','verified','ai_explanation','unverified','conflicting')),
  source_document_ids uuid[] not null default '{}',
  source_urls text[] not null default '{}',
  derived_from text,
  is_public boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists knowledge_records_node_idx on public.knowledge_records(node_id);
create index if not exists knowledge_records_status_idx on public.knowledge_records(verification_status);

create table if not exists public.knowledge_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  node_id uuid references public.knowledge_nodes(id) on delete set null,
  answer text,
  resolution_status text not null default 'open' check (resolution_status in ('open','resolved','verified','conflicting')),
  source_document_ids uuid[] not null default '{}',
  source_urls text[] not null default '{}',
  reusable_record_id uuid references public.knowledge_records(id) on delete set null,
  asked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.knowledge_packs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  node_id uuid references public.knowledge_nodes(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','building','ready','failed')),
  manifest jsonb not null default '{}'::jsonb,
  storage_path text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.knowledge_nodes enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.knowledge_records enable row level security;
alter table public.knowledge_questions enable row level security;
alter table public.knowledge_packs enable row level security;

create policy "knowledge nodes readable" on public.knowledge_nodes for select to authenticated using (true);
create policy "knowledge nodes insert" on public.knowledge_nodes for insert to authenticated with check (true);
create policy "knowledge documents readable" on public.knowledge_documents for select to authenticated using (access_level <> 'private' or uploaded_by = auth.uid());
create policy "knowledge documents insert" on public.knowledge_documents for insert to authenticated with check (uploaded_by = auth.uid());
create policy "knowledge chunks readable" on public.knowledge_chunks for select to authenticated using (exists (select 1 from public.knowledge_documents d where d.id = document_id and (d.access_level <> 'private' or d.uploaded_by = auth.uid())));
create policy "knowledge records readable" on public.knowledge_records for select to authenticated using (is_public = true or created_by = auth.uid());
create policy "knowledge questions own" on public.knowledge_questions for all to authenticated using (asked_by = auth.uid()) with check (asked_by = auth.uid());
create policy "knowledge packs readable" on public.knowledge_packs for select to authenticated using (created_by = auth.uid());
create policy "knowledge packs insert" on public.knowledge_packs for insert to authenticated with check (created_by = auth.uid());

-- Seed the expandable Zimbabwe curriculum catalog. Subjects can be added later without schema changes.
insert into public.knowledge_nodes (node_type,name,slug,sort_order)
values ('country','Zimbabwe','zimbabwe',1)
on conflict do nothing;

insert into public.knowledge_nodes (parent_id,node_type,name,slug,sort_order)
select id,'level',v.name,v.slug,v.sort_order from public.knowledge_nodes c
cross join (values
 ('ECD','ecd',1),('Primary','primary',2),('Secondary','secondary',3),('Polytechnic','polytechnic',4),('University','university',5)
) v(name,slug,sort_order)
where c.node_type='country' and c.slug='zimbabwe'
on conflict do nothing;

insert into public.knowledge_nodes (parent_id,node_type,name,slug,sort_order)
select l.id,'grade',g.name,g.slug,g.sort_order from public.knowledge_nodes l
cross join (values
 ('ECD A','ecd-a',1),('ECD B','ecd-b',2)
) g(name,slug,sort_order)
where l.node_type='level' and l.slug='ecd'
on conflict do nothing;

insert into public.knowledge_nodes (parent_id,node_type,name,slug,sort_order)
select l.id,'grade','Grade '||n,'grade-'||n,n from public.knowledge_nodes l cross join generate_series(1,7) n
where l.node_type='level' and l.slug='primary'
on conflict do nothing;

insert into public.knowledge_nodes (parent_id,node_type,name,slug,sort_order)
select l.id,'form','Form '||n,'form-'||n,n from public.knowledge_nodes l cross join generate_series(1,6) n
where l.node_type='level' and l.slug='secondary'
on conflict do nothing;

insert into public.knowledge_nodes (parent_id,node_type,name,slug,sort_order)
select g.id,'subject',s.name,lower(regexp_replace(s.name,'[^a-z0-9]+','-','g')),s.sort_order
from public.knowledge_nodes g
cross join (values
 ('Mathematics',1),('English',2),('Shona',3),('Physical Education & Arts',4),('Science & Technology',5),('Social Science',6)
) s(name,sort_order)
where g.node_type='grade'
on conflict do nothing;

insert into public.knowledge_nodes (parent_id,node_type,name,slug,sort_order)
select f.id,'subject',s.name,lower(regexp_replace(s.name,'[^a-z0-9]+','-','g')),s.sort_order
from public.knowledge_nodes f
cross join (values
 ('Commerce',1),('Mathematics',2),('English',3),('Science',4),('Shona',5),('Accounting',6),('Geography',7),('Religious Education',8),('Heritage Studies',9)
) s(name,sort_order)
where f.node_type='form'
on conflict do nothing;
