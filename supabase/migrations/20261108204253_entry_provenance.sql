-- Provenance is now a first-class status rather than an inference from a nullable
-- column. An entry either holds its original-language text or it does not.

create or replace view public.entry_provenance with (security_invoker = true) as
select e.id,
       s.original_language,
       s.layer::text as layer,
       coalesce(t.name, '(none)') as tradition,
       case
         when e.original_text is not null and e.original_text <> '' then 'original_held'
         else 'english_only'
       end as provenance_status
from public.entries e
  join public.sources s on s.id = e.source_id
  left join public.traditions t on t.id = coalesce(e.origin_tradition_id, s.tradition_id)
where e.retired_at is null;

comment on view public.entry_provenance is
  'Per live entry: original_held when the original-language text is stored, english_only when the entry was drafted from a translation and no original is held.';
