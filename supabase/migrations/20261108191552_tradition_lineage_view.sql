-- Inspectable lineage tree: each tradition with its parent and its root.
-- Useful for assigning parents without reading the whole table.

create or replace view public.tradition_lineage with (security_invoker = true) as
with recursive roots as (
  select t.id, t.id as root_id
  from public.traditions t
  where t.parent_id is null
  union all
  select t.id, r.root_id
  from public.traditions t
  join roots r on t.parent_id = r.id
)
select t.id,
       t.name,
       t.parent_id,
       p.name as parent_name,
       r.root_id,
       rt.name as root_name,
       (t.id = r.root_id) as is_root
from public.traditions t
join roots r on r.id = t.id
left join public.traditions p on p.id = t.parent_id
join public.traditions rt on rt.id = r.root_id;
