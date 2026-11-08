-- The importer now carries the translation standard: original text, named edition,
-- scholarly translation, AI translation with model and date, key terms, and the
-- verification state. It also carries the source's exact licence.

create or replace function public.import_entries(payload jsonb, model text default 'unknown')
returns integer language plpgsql security definer set search_path = '' as $$
declare r jsonb; s uuid; e uuid; n int := 0; v jsonb; vid uuid; t uuid; ext text; loc text;
begin
  for r in select * from jsonb_array_elements(payload) loop
    ext := nullif(trim(r->'source'->>'external_id'), '');
    if ext is null then continue; end if;

    t := null;
    if nullif(trim(r->'source'->>'tradition'), '') is not null then
      insert into public.traditions (name, description)
      values (trim(r->'source'->>'tradition'), 'Added with a batch import')
      on conflict (name) do nothing;
      select id into t from public.traditions where name = trim(r->'source'->>'tradition');
    end if;

    insert into public.sources (title, layer, tradition_id, original_language, date_or_era, author, rights_status, citation, external_id, licence)
    values (r->'source'->>'title',
            (r->'source'->>'layer')::public.layer_type,
            t,
            r->'source'->>'original_language',
            r->'source'->>'date_or_era',
            r->'source'->>'author',
            (r->'source'->>'rights_status')::public.rights_type,
            r->'source'->>'citation',
            ext,
            r->'source'->>'licence')
    on conflict (external_id) do update set
      title = excluded.title,
      layer = excluded.layer,
      tradition_id = excluded.tradition_id,
      original_language = excluded.original_language,
      date_or_era = excluded.date_or_era,
      author = excluded.author,
      rights_status = excluded.rights_status,
      citation = excluded.citation,
      licence = excluded.licence
    returning id into s;

    loc := coalesce(nullif(trim(r->>'source_locator'), ''), ext || ':' || coalesce(r->>'title', 'entry'));

    insert into public.entries (source_id, situation, wise_response, why_it_worked, tempting_wrong_answer,
        status, draft_origin, drafted_by, story_title, source_locator, translation_notes, origin_tradition_id,
        narrative_form, agent_unit, beneficiary_unit,
        original_text, edition, scholarly_translation, scholarly_source, scholarly_rights,
        ai_translation, ai_model, ai_translated_at, key_terms, translation_status)
    values (s, r->>'situation', r->>'wise_response', r->>'why_it_worked', r->>'tempting_wrong_answer',
        coalesce((r->>'status')::public.entry_status, 'draft'), 'ai_draft', model,
        r->>'title', loc, r->>'translation_notes', t,
        nullif(trim(r->>'narrative_form'), ''),
        nullif(trim(r->>'agent_unit'), ''),
        nullif(trim(r->>'beneficiary_unit'), ''),
        nullif(r->>'original_text', ''),
        nullif(r->>'edition', ''),
        nullif(r->>'scholarly_translation', ''),
        nullif(r->>'scholarly_source', ''),
        nullif(r->>'scholarly_rights', '')::public.rights_type,
        nullif(r->>'ai_translation', ''),
        case when nullif(r->>'ai_translation', '') is not null then coalesce(nullif(r->>'ai_model',''), model) end,
        case when nullif(r->>'ai_translation', '') is not null then now() end,
        case when jsonb_typeof(r->'key_terms') = 'object' then r->'key_terms' end,
        coalesce(nullif(r->>'translation_status','')::public.translation_status, 'working'))
    on conflict (source_locator) do nothing
    returning id into e;
    if e is null then continue; end if;

    n := n + 1;
    for v in select * from jsonb_array_elements(coalesce(r->'virtues', '[]'::jsonb)) loop
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

revoke all on function public.import_entries(jsonb, text) from public, anon, authenticated;
grant execute on function public.import_entries(jsonb, text) to service_role;
