-- A virtue's reach is counted only where an approved entry carries an agreeing
-- label from a reviewer outside that entry's own tradition, and that reviewer is
-- not the entry's author.
--
-- `virtue_reach_raw` keeps the old, unreviewed count for tracking progress.

alter table public.labelers
  add column if not exists tradition_id uuid references public.traditions(id);

create index if not exists labelers_tradition_idx on public.labelers (tradition_id);

create or replace view public.virtue_reach_raw with (security_invoker = true) as
select v.id as virtue_id,
       v.name as virtue,
       count(distinct coalesce(e.origin_tradition_id, s.tradition_id))::int as traditions_approved,
       count(distinct e.id)::int as approved_entries,
       (count(distinct coalesce(e.origin_tradition_id, s.tradition_id)) >= 5) as would_be_core
from public.virtues v
left join public.entry_virtues ev on ev.virtue_id = v.id
left join public.entries e on e.id = ev.entry_id and e.status = 'approved'
left join public.sources s on s.id = e.source_id
group by v.id, v.name;

-- Dropped rather than replaced: the column types change.
drop view if exists public.virtue_reach;

create view public.virtue_reach with (security_invoker = true) as
with entry_tradition as (
  select e.id as entry_id,
         e.status,
         e.created_by,
         coalesce(e.origin_tradition_id, s.tradition_id) as tradition_id
  from public.entries e
  join public.sources s on s.id = e.source_id
), qualifying as (
  select ev.virtue_id, et.tradition_id, et.entry_id
  from public.entry_virtues ev
  join entry_tradition et on et.entry_id = ev.entry_id
  join public.labels l on l.entry_id = ev.entry_id and l.virtue_id = ev.virtue_id
  join public.labelers lb on lb.id = l.labeler_id
  where et.status = 'approved'
    and l.agrees
    and lb.tradition_id is not null
    and lb.tradition_id is distinct from et.tradition_id
    and (et.created_by is null or l.labeler_id <> et.created_by)
  group by 1, 2, 3
)
select v.id as virtue_id,
       v.name as virtue,
       count(distinct q.tradition_id)::int as traditions_reached,
       count(distinct q.entry_id)::int as reviewed_entries,
       (count(distinct q.tradition_id) >= 5) as in_shared_core
from public.virtues v
left join qualifying q on q.virtue_id = v.id
group by v.id, v.name;
