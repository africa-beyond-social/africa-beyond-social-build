-- WIGOD Knowledge Hub: add a unified Tertiary education level
insert into public.knowledge_nodes (parent_id,node_type,name,slug,sort_order)
select id,'level','Tertiary','tertiary',6
from public.knowledge_nodes
where node_type='country' and slug='zimbabwe'
on conflict do nothing;

insert into public.knowledge_nodes (parent_id,node_type,name,slug,sort_order)
select id,'programme',v.name,v.slug,v.sort_order
from public.knowledge_nodes
cross join (
  values
    ('Certificate','certificate',1),
    ('Diploma','diploma',2),
    ('Undergraduate Degree','undergraduate-degree',3),
    ('Postgraduate','postgraduate',4)
) v(name,slug,sort_order)
where node_type='level' and slug='tertiary'
on conflict do nothing;


-- Flag existing uploads whose selected learning path looks inconsistent.
update public.knowledge_documents
set metadata = jsonb_set(
  coalesce(metadata,'{}'::jsonb),
  '{validation_flags}',
  to_jsonb(
    array(
      select distinct flag
      from unnest(
        coalesce(
          array(select jsonb_array_elements_text(coalesce(metadata->'validation_flags','[]'::jsonb))),
          '{}'::text[]
        )
        ||
        case
          when lower(coalesce(subject,'')) = 'mathematics'
           and lower(title) ~ '(constitution of zimbabwe|accounting|commerce|geography|religious education|heritage studies)'
          then array['Title/file name may not match the selected subject (Mathematics).']::text[]
          else '{}'::text[]
        end
        ||
        case
          when lower(coalesce(metadata->>'level','')) = 'tertiary'
           and lower(coalesce(metadata->>'grade','')) ~ '(grade|form)'
          then array['Tertiary material is assigned to a school Grade/Form.']::text[]
          else '{}'::text[]
        end
      ) as flag
    )
  ),
  true
)
where
  (
    lower(coalesce(subject,'')) = 'mathematics'
    and lower(title) ~ '(constitution of zimbabwe|accounting|commerce|geography|religious education|heritage studies)'
  )
  or (
    lower(coalesce(metadata->>'level','')) = 'tertiary'
    and lower(coalesce(metadata->>'grade','')) ~ '(grade|form)'
  );
