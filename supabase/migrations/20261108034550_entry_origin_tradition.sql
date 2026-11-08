alter table public.entries add column if not exists origin_tradition_id uuid references public.traditions(id);
create index if not exists entries_origin_tradition_idx on public.entries (origin_tradition_id);

create or replace view public.virtue_reach with (security_invoker = true) as
select v.id as virtue_id,
       v.name as virtue,
       count(distinct coalesce(e.origin_tradition_id, s.tradition_id)) as traditions_reached,
       count(distinct e.id) as approved_entries,
       count(distinct coalesce(e.origin_tradition_id, s.tradition_id)) >= 5 as in_shared_core
from public.virtues v
left join public.entry_virtues ev on ev.virtue_id = v.id
left join public.entries e on e.id = ev.entry_id and e.status = 'approved'
left join public.sources s on s.id = e.source_id
group by v.id, v.name;

create or replace function private.import_drafts(payload jsonb, model text default 'Claude Opus 5.5')
returns integer language plpgsql security definer set search_path = '' as $$
declare r jsonb; v jsonb; s uuid; e uuid; n int := 0; vid uuid; ot uuid;
begin
  for r in select * from jsonb_array_elements(payload) loop
    if coalesce((r->>'include')::boolean, true) is false then continue; end if;
    select id into s from public.sources where external_id = 'pg-' || split_part(r->>'story_id','-',1);
    if s is null then continue; end if;
    ot := null;
    if nullif(trim(r->>'origin_tradition'),'') is not null then
      insert into public.traditions (name, description) values (trim(r->>'origin_tradition'), 'Added with the bulk story import')
      on conflict (name) do nothing;
      select id into ot from public.traditions where name = trim(r->>'origin_tradition');
    end if;
    insert into public.entries (source_id, situation, wise_response, why_it_worked, tempting_wrong_answer,
        status, draft_origin, drafted_by, story_title, source_locator, translation_notes, scholarly_rights, origin_tradition_id)
    values (s, r->>'situation', r->>'wise_response', r->>'why_it_worked', r->>'tempting_wrong_answer',
        'draft', 'ai_draft', model, r->>'title', r->>'story_id',
        'AI draft from a public-domain English translation; original-language text not yet pulled.', 'public_domain', ot)
    on conflict (source_locator) do nothing
    returning id into e;
    if e is null then continue; end if;
    n := n + 1;
    for v in select * from jsonb_array_elements(coalesce(r->'virtues','[]'::jsonb)) loop
      select id into vid from public.virtues where name = lower(v->>'name');
      if vid is not null then
        insert into public.entry_virtues (entry_id, virtue_id, strength)
        values (e, vid, least(3, greatest(1, coalesce((v->>'strength')::int, 2))))
        on conflict do nothing;
      end if;
    end loop;
  end loop;
  return n;
end $$;
revoke all on function private.import_drafts(jsonb, text) from public, anon, authenticated;
