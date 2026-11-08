-- Codebook V4: only a strength-3 instance is evidence of independent convergence.
-- A virtue that is merely present (strength 2) or implied (1) is recorded but does
-- not count toward the five-lineage test.
--
-- Effect at the time of writing: reciprocity keeps 6 lineages, mercy falls from 6
-- to 3, gratitude from 5 to 4. Only reciprocity would still reach the core.

create or replace view public.virtue_reach_raw with (security_invoker = true) as
with recursive roots as (
  select t.id, t.id as root_id from public.traditions t where t.parent_id is null
  union
  select t.id, r.root_id from public.traditions t join roots r on t.parent_id = r.id
)
select v.id as virtue_id,
       v.name as virtue,
       count(distinct coalesce(r.root_id, coalesce(e.origin_tradition_id, s.tradition_id)))::int as traditions_approved,
       count(distinct e.id)::int as approved_entries,
       (count(distinct coalesce(r.root_id, coalesce(e.origin_tradition_id, s.tradition_id))) >= 5) as would_be_core
from public.virtues v
left join public.entry_virtues ev on ev.virtue_id = v.id and ev.strength = 3
left join public.entries e on e.id = ev.entry_id and e.status = 'approved'
left join public.sources s on s.id = e.source_id
left join roots r on r.id = coalesce(e.origin_tradition_id, s.tradition_id)
group by v.id, v.name;

create or replace view public.virtue_reach with (security_invoker = true) as
with recursive roots as (
  select t.id, t.id as root_id from public.traditions t where t.parent_id is null
  union
  select t.id, r.root_id from public.traditions t join roots r on t.parent_id = r.id
), entry_tradition as (
  select e.id as entry_id,
         e.status,
         e.created_by,
         coalesce(r.root_id, coalesce(e.origin_tradition_id, s.tradition_id)) as root_id
  from public.entries e
  join public.sources s on s.id = e.source_id
  left join roots r on r.id = coalesce(e.origin_tradition_id, s.tradition_id)
), qualifying as (
  select ev.virtue_id, et.root_id, et.entry_id
  from public.entry_virtues ev
  join entry_tradition et on et.entry_id = ev.entry_id
  join public.labels l on l.entry_id = ev.entry_id and l.virtue_id = ev.virtue_id
  join public.labelers lb on lb.id = l.labeler_id
  left join roots lr on lr.id = lb.tradition_id
  where et.status = 'approved'
    and ev.strength = 3
    and l.agrees
    and lb.tradition_id is not null
    and lr.root_id is distinct from et.root_id
    and (et.created_by is null or l.labeler_id <> et.created_by)
  group by 1, 2, 3
)
select v.id as virtue_id,
       v.name as virtue,
       count(distinct q.root_id)::int as traditions_reached,
       count(distinct q.entry_id)::int as reviewed_entries,
       (count(distinct q.root_id) >= 5) as in_shared_core
from public.virtues v
left join qualifying q on q.virtue_id = v.id
group by v.id, v.name;
