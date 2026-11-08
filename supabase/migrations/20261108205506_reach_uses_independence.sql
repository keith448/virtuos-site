-- The count now trusts labels.independence, and re-checks the root comparison so a
-- bug in cast_label cannot inflate it. Reviewers with no tradition_ids cannot count.

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
  where e.retired_at is null
), qualifying as (
  select ev.virtue_id, et.root_id, et.entry_id
  from public.entry_virtues ev
  join entry_tradition et on et.entry_id = ev.entry_id
  join public.labels l on l.entry_id = ev.entry_id and l.virtue_id = ev.virtue_id
  join public.labelers lb on lb.id = l.labeler_id
  where et.status = 'approved'
    and ev.strength = 3
    and l.agrees
    and l.independence = 'outside'
    and coalesce(array_length(lb.tradition_ids, 1), 0) > 0
    and (et.created_by is null or l.labeler_id <> et.created_by)
    and not exists (
      select 1 from unnest(lb.tradition_ids) as tr
      join roots rr on rr.id = tr
      where rr.root_id = et.root_id
    )
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
