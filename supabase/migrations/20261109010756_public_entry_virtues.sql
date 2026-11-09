-- Virtue tags for publicly readable entries, so the reading page can group by virtue
-- without exposing entry_virtues to anon.

create or replace view public.public_entry_virtues as
select ev.entry_id, v.name as virtue, ev.strength
from public.entry_virtues ev
  join public.virtues v on v.id = ev.virtue_id
  join public.entries e on e.id = ev.entry_id
  join public.sources s on s.id = e.source_id
where e.retired_at is null
  and e.status = 'approved'
  and private.release_status(s.licence, s.rights_status) = 'publishable_now';

grant select on public.public_entry_virtues to anon, authenticated;

comment on view public.public_entry_virtues is
  'Virtue tags for publicly readable entries. Public, no sign-in.';
