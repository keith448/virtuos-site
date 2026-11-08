-- Two axes: a tradition is the community as people describe themselves; a lineage
-- is the transmission ancestry used for the shared-core test.
--
-- traditions.parent_id builds the tree. Both views count distinct roots, so
-- Coptic and Anglican count once while they share a root, and five national
-- folktale labels over one tale-type corpus count once.
--
-- All parent_id values are null today, so every tradition is its own root and the
-- counts are unchanged until lineages are assigned.

alter table public.traditions
  add column if not exists parent_id uuid references public.traditions(id) on delete set null;

alter table public.traditions
  drop constraint if exists traditions_no_self_parent;
alter table public.traditions
  add constraint traditions_no_self_parent check (parent_id is null or parent_id <> id);

create index if not exists traditions_parent_idx on public.traditions (parent_id);

create or replace view public.virtue_reach_raw with (security_invoker = true) as
with recursive roots as (
  select t.id, t.id as root_id
  from public.traditions t
  where t.parent_id is null
  union all
  select t.id, r.root_id
  from public.traditions t
  join roots r on t.parent_id = r.id
)
select v.id as virtue_id,
       v.name as virtue,
       count(distinct coalesce(r.root_id, coalesce(e.origin_tradition_id, s.tradition_id)))::int as traditions_approved,
       count(distinct e.id)::int as approved_entries,
       (count(distinct coalesce(r.root_id, coalesce(e.origin_tradition_id, s.tradition_id))) >= 5) as would_be_core
from public.virtues v
left join public.entry_virtues ev on ev.virtue_id = v.id
left join public.entries e on e.id = ev.entry_id and e.status = 'approved'
left join public.sources s on s.id = e.source_id
left join roots r on r.id = coalesce(e.origin_tradition_id, s.tradition_id)
group by v.id, v.name;

create or replace view public.virtue_reach with (security_invoker = true) as
with recursive roots as (
  select t.id, t.id as root_id
  from public.traditions t
  where t.parent_id is null
  union all
  select t.id, r.root_id
  from public.traditions t
  join roots r on t.parent_id = r.id
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
