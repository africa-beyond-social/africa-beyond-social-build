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
