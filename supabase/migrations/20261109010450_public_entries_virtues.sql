-- The public entry view carries its virtue tags, so the demo page can show what an
-- entry teaches without exposing entry_virtues to anon.

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
       coalesce(t.name, '(none)') as tradition,
       (select string_agg(v.name || ' ' || ev.strength, ', ' order by ev.strength desc, v.name)
          from public.entry_virtues ev
            join public.virtues v on v.id = ev.virtue_id
         where ev.entry_id = e.id) as virtues
from public.entries e
  join public.sources s on s.id = e.source_id
  left join public.traditions t on t.id = coalesce(e.origin_tradition_id, s.tradition_id)
where e.retired_at is null
  and e.status = 'approved'
  and private.release_status(s.licence, s.rights_status) = 'publishable_now';

grant select on public.public_entries to anon, authenticated;
