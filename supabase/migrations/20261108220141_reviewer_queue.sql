-- The queue a reviewer_virtue sees. Eligibility is computed server-side so the
-- client never receives strength, tradition or root information it should not use.

create or replace function public.reviewer_queue()
returns table (entry_id uuid, virtue_id uuid)
language sql stable security definer set search_path = '' as $$
  select ev.entry_id, ev.virtue_id
  from public.entry_virtues ev
    join public.entries e on e.id = ev.entry_id
    join public.sources s on s.id = e.source_id
    join public.labelers me on me.user_id = auth.uid()
  where ev.strength = 3
    and e.retired_at is null
    and me.role = 'reviewer_virtue'
    and (e.created_by is null or e.created_by <> me.id)
    and not exists (
      select 1 from unnest(coalesce(me.tradition_ids, '{}'::uuid[])) r
      where private.tradition_root(r) = private.tradition_root(coalesce(e.origin_tradition_id, s.tradition_id))
    )
    and not exists (
      select 1 from public.labels l
      where l.entry_id = ev.entry_id and l.virtue_id = ev.virtue_id and l.labeler_id = me.id
    );
$$;

revoke all on function public.reviewer_queue() from public, anon;
grant execute on function public.reviewer_queue() to authenticated;

comment on function public.reviewer_queue() is
  'Strength-3 pairs eligible for the calling reviewer_virtue: not retired, not authored by them, outside their lineage, not already labeled by them.';
