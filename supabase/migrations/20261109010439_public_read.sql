-- Public read surface. Approved entries whose licence permits publication, exposed
-- to anon so a visitor can see how the thing works without an account.
--
-- These views are security definer (the default for views), so they run with the
-- owner's rights and do not need RLS policies on the base tables.

create or replace view public.public_entries as
select e.id,
       e.story_title,
       e.situation,
       e.wise_response,
       e.why_it_worked,
       e.tempting_wrong_answer,
       e.original_text,
       e.edition,
       e.scholarly_translation,
       e.scholarly_source,
       e.ai_translation,
       e.ai_model,
       e.translation_status,
       e.narrative_form,
       e.agent_unit,
       e.beneficiary_unit,
       s.title as source_title,
       s.author,
       s.date_or_era,
       s.citation,
       s.original_language,
       s.layer::text as layer,
       s.licence,
       coalesce(t.name, '(none)') as tradition
from public.entries e
  join public.sources s on s.id = e.source_id
  left join public.traditions t on t.id = coalesce(e.origin_tradition_id, s.tradition_id)
where e.retired_at is null
  and e.status = 'approved'
  and private.release_status(s.licence, s.rights_status) = 'publishable_now';

create or replace view public.public_coverage as
with recursive roots as (
  select t.id, t.id as root_id from public.traditions t where t.parent_id is null
  union
  select t.id, r.root_id from public.traditions t join roots r on t.parent_id = r.id
)
select rt.name as root_name,
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
  and private.release_status(s.licence, s.rights_status) = 'publishable_now'
group by 1, 2;

grant select on public.public_entries to anon, authenticated;
grant select on public.public_coverage to anon, authenticated;

comment on view public.public_entries is
  'Approved entries whose source licence permits publication. Public, no sign-in.';
comment on view public.public_coverage is
  'Approved publishable entries per lineage root and virtue. Public, no sign-in.';
