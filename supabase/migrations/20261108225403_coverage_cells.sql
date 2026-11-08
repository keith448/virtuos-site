-- The coverage matrix: approved strength-3 entries per lineage root and virtue.
-- These are the cells that decide whether a virtue can ever reach the core.

create or replace view public.coverage_cells with (security_invoker = true) as
with recursive roots as (
  select t.id, t.id as root_id from public.traditions t where t.parent_id is null
  union
  select t.id, r.root_id from public.traditions t join roots r on t.parent_id = r.id
)
select rt.id as root_id,
       rt.name as root_name,
       v.id as virtue_id,
       v.name as virtue,
       count(distinct e.id)::int as entries
from public.entries e
  join public.sources s on s.id = e.source_id
  join public.entry_virtues ev on ev.entry_id = e.id and ev.strength = 3
  join public.virtues v on v.id = ev.virtue_id
  join roots r on r.id = coalesce(e.origin_tradition_id, s.tradition_id)
  join public.traditions rt on rt.id = r.root_id
where e.retired_at is null
  and e.status = 'approved'
group by 1, 2, 3, 4;

comment on view public.coverage_cells is
  'Approved strength-3 entries per lineage root and virtue. The cells that decide whether a virtue can reach the core.';

grant select on public.coverage_cells to anon, authenticated;
