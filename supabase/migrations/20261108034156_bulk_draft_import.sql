alter table public.sources add column if not exists external_id text unique;
alter table public.entries
  add column if not exists draft_origin text not null default 'human' check (draft_origin in ('human','ai_draft')),
  add column if not exists drafted_by text,
  add column if not exists story_title text,
  add column if not exists source_locator text unique;

insert into public.virtues (name, description) values
 ('honesty','Telling the truth, including when it costs you'),
 ('generosity','Giving freely of what you have'),
 ('loyalty','Standing by those who rely on you'),
 ('justice','Giving each person what is fair, and refusing to cheat'),
 ('self-control','Mastering greed, anger and appetite'),
 ('perseverance','Keeping on through hardship'),
 ('forgiveness','Letting go of a wrong done to you'),
 ('cooperation','Working together toward a shared good'),
 ('contentment','Being satisfied with enough'),
 ('respect for elders','Honoring parents, teachers and the old'),
 ('keeping promises','Doing what you said you would'),
 ('prudence','Thinking ahead and acting with sound judgment'),
 ('compassion','Feeling for another''s suffering and acting to ease it')
on conflict (name) do nothing;

create or replace function private.import_drafts(payload jsonb, model text default 'Claude Opus 5.5')
returns integer language plpgsql security definer set search_path = '' as $$
declare r jsonb; v jsonb; s uuid; e uuid; n int := 0; vid uuid;
begin
  for r in select * from jsonb_array_elements(payload) loop
    if coalesce((r->>'include')::boolean, true) is false then continue; end if;
    select id into s from public.sources where external_id = 'pg-' || split_part(r->>'story_id','-',1);
    if s is null then continue; end if;
    insert into public.entries (source_id, situation, wise_response, why_it_worked, tempting_wrong_answer,
        status, draft_origin, drafted_by, story_title, source_locator, translation_notes, scholarly_rights)
    values (s, r->>'situation', r->>'wise_response', r->>'why_it_worked', r->>'tempting_wrong_answer',
        'draft', 'ai_draft', model, r->>'title', r->>'story_id',
        'AI draft from a public-domain English translation; original-language text not yet pulled.', 'public_domain')
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
