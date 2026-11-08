insert into public.traditions (name, region, era, description)
values ('Gnostic Christian (Nag Hammadi)', 'Egypt and the eastern Mediterranean', 'late antique', 'Early Christian texts outside the canon, preserved in Coptic in the Nag Hammadi library (found 1945)')
on conflict (name) do nothing;
insert into public.sources (title, layer, tradition_id, original_language, date_or_era, author, rights_status, citation, external_id)
values ('Gospel of Thomas (Nag Hammadi Codex II,2)', 'scripture', (select id from public.traditions where name='Gnostic Christian (Nag Hammadi)'), 'Sahidic Coptic',
        'Sayings likely 1st-2nd century CE; Coptic manuscript 4th century', 'Unknown; attributed to Didymus Judas Thomas', 'licensed',
        'Coptic text: Coptic SCRIPTORIUM, Gospel of Thomas (corpus thomas.gospel), annotation by Paul Dilley, Lydia Bremer-McCollum, Caroline T. Schroeder, Amir Zeldes. CC BY 4.0. https://data.copticscriptorium.org/urn:cts:copticLit:nh.thomas.NHAM02:0-114',
        'hd-thomas')
on conflict (external_id) do nothing;

create or replace function private.import_drafts(payload jsonb, model text default 'Claude Opus 5.5')
returns integer language plpgsql security definer set search_path = '' as $$
declare r jsonb; v jsonb; s uuid; e uuid; n int := 0; vid uuid; ot uuid; p1 text;
  hs record; cs record; orig text; ed text; note text; rights public.rights_type; schol text;
begin
  for r in select * from jsonb_array_elements(payload) loop
    if coalesce((r->>'include')::boolean, true) is false then continue; end if;
    p1 := split_part(r->>'story_id','-',1);
    select id into s from public.sources where external_id = case when p1 ~ '^\d+$' then 'pg-' || p1 else 'hd-' || p1 end;
    if s is null then continue; end if;
    ot := null;
    if nullif(trim(r->>'origin_tradition'),'') is not null then
      insert into public.traditions (name, description) values (trim(r->>'origin_tradition'), 'Added with the bulk story import')
      on conflict (name) do nothing;
      select id into ot from public.traditions where name = trim(r->>'origin_tradition');
    end if;
    hs := null; cs := null; orig := null; ed := null; schol := null;
    note := 'AI draft from a public-domain English translation; original-language text not yet pulled.';
    rights := 'public_domain';
    select * into hs from private.hadith_staging where story_id = r->>'story_id';
    select * into cs from private.coptic_staging where story_id = r->>'story_id';
    if hs.story_id is not null then
      orig := hs.arabic; ed := hs.book || ' ' || hs.id_in_book || ' (' || coalesce(hs.chapter,'') || ')';
      note := 'AI draft. Arabic original stored; AI translation made from the Arabic. English translation consulted for meaning, cited only.';
      rights := 'licensed'; schol := 'sunnah.com English translation; citation only';
    elsif cs.story_id is not null then
      orig := cs.coptic; ed := 'Gospel of Thomas, saying ' || cs.saying || ' (Nag Hammadi Codex II,2), Coptic SCRIPTORIUM, CC BY 4.0';
      note := 'AI draft. Sahidic Coptic original stored (Coptic SCRIPTORIUM, CC BY 4.0, attribution required); AI translation made from the Coptic. Modern English translations are under copyright and were not used.';
      rights := 'licensed'; schol := null;
    end if;
    insert into public.entries (source_id, situation, wise_response, why_it_worked, tempting_wrong_answer,
        status, draft_origin, drafted_by, story_title, source_locator, translation_notes, scholarly_rights, origin_tradition_id,
        original_text, edition, ai_translation, ai_model, ai_translated_at, scholarly_source, key_terms)
    values (s, r->>'situation', r->>'wise_response', r->>'why_it_worked', r->>'tempting_wrong_answer',
        'draft', 'ai_draft', model, r->>'title', r->>'story_id', note, rights, ot,
        orig, ed,
        nullif(r->>'ai_translation',''),
        case when nullif(r->>'ai_translation','') is not null then model end,
        case when nullif(r->>'ai_translation','') is not null then now() end,
        schol,
        case when jsonb_typeof(r->'key_terms') = 'object' then r->'key_terms' end)
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
