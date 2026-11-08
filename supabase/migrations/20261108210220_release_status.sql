-- The legal axis, derived from the licence rather than written by a reviewer.
-- publishable_now / research_only / unclear. Nothing is ever "verified and
-- publishable" by default: a verified translation can still be research-only.

create or replace function private.release_status(p_licence text, p_rights public.rights_type)
returns text language sql immutable set search_path = '' as $$
  select case
    when p_rights = 'own_summary' then 'publishable_now'
    when p_licence is null then 'unclear'
    when p_licence ~* 'noncommercial|by-nc' then 'research_only'
    when p_licence ~* 'not recorded|unconfirmed|unknown' then 'unclear'
    when p_licence ~* 'public domain|cc0|cc by' then 'publishable_now'
    else 'unclear'
  end;
$$;

create or replace view public.source_release with (security_invoker = true) as
select s.id,
       s.title,
       s.rights_status::text as rights_status,
       s.licence,
       private.release_status(s.licence, s.rights_status) as release_status
from public.sources s;

create or replace view public.publishable_entries with (security_invoker = true) as
select e.*
from public.entries e
  join public.sources s on s.id = e.source_id
where e.retired_at is null
  and private.release_status(s.licence, s.rights_status) = 'publishable_now';

comment on view public.source_release is
  'Legal axis, derived from sources.licence. publishable_now / research_only / unclear. Never written by a reviewer.';
comment on view public.publishable_entries is
  'Live entries whose source licence permits publication. Excludes research_only (CC BY-NC) and unclear (terms not recorded).';
