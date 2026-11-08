-- The queue is served in batches. PostgREST caps a response at 1,000 rows by
-- default, so an unbounded queue silently truncates. Ask for 50 at a time and
-- refetch when the batch empties.

drop function if exists public.reviewer_queue();

create or replace function public.reviewer_queue(p_limit int default 50)
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
    )
  order by random()
  limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;

revoke all on function public.reviewer_queue(int) from public, anon;
grant execute on function public.reviewer_queue(int) to authenticated;

comment on function public.reviewer_queue(int) is
  'Batch of strength-3 pairs eligible for the calling reviewer_virtue: not retired, not authored by them, outside their lineage, not already labeled by them.';
