insert into public.sources (title, layer, tradition_id, original_language, date_or_era, author, rights_status, citation, external_id)
select v.title, 'scripture', t.id, v.lang, v.era, v.author, v.rights::public.rights_type, v.cite, v.ext
from (values
 ('Hebrew Bible (Tanakh), selected chapters','Hebrew Bible','Biblical Hebrew','c. 10th-2nd century BCE','Various','public_domain',
  'Hebrew: Miqra according to the Masorah (CC BY-SA, via Sefaria). English: The Holy Scriptures: A New Translation (JPS 1917), public domain.','hd-tanakh'),
 ('Pirkei Avot (Ethics of the Fathers)','Rabbinic Judaism','Mishnaic Hebrew','c. 200 CE (Mishnah)','Sages of the Mishnah','licensed',
  'Hebrew: Torat Emet 357 (public domain, via Sefaria). English: Mishnah Yomit by Dr. Joshua Kulp (CC BY).','hd-avot'),
 ('The Quran','Islamic','Classical Arabic','7th century CE','Revealed to Muhammad (Islamic belief)','public_domain',
  'Arabic: Tanzil Quran text (Uthmani), Tanzil Project, verbatim copy permitted with attribution. English: Marmaduke Pickthall, The Meaning of the Glorious Koran (1930), public domain in the US.','hd-quran')
) v(title,tname,lang,era,author,rights,cite,ext)
join public.traditions t on t.name = v.tname
on conflict (external_id) do nothing;

create or replace function private.import_drafts(payload jsonb, model text default 'Claude Opus 5.5')
returns integer language plpgsql security definer set search_path = '' as $function$
declare r jsonb; v jsonb; s uuid; e uuid; n int := 0; vid uuid; ot uuid; p1 text;
  hs record; cs record; ts record; orig text; ed text; note text; rights public.rights_type; schol text; scholtxt text;
begin
  for r in select * from jsonb_array_elements(payload) loop
    if coalesce((r->>'include')::boolean, true) is false then continue; end if;
    p1 := split_part(r->>'story_id','-',1);
    s := null;
    select id into s from public.sources where external_id = case when p1 ~ '^\d+$' then 'pg-' || p1 else 'hd-' || p1 end;
    if s is null then continue; end if;
    ot := null;
    if nullif(trim(r->>'origin_tradition'),'') is not null then
      insert into public.traditions (name, description) values (trim(r->>'origin_tradition'), 'Added with the bulk story import')
      on conflict (name) do nothing;
      select id into ot from public.traditions where name = trim(r->>'origin_tradition');
    end if;
    hs := null; cs := null; ts := null; orig := null; ed := null; schol := null; scholtxt := null;
    note := 'AI draft from a public-domain English translation; original-language text not yet pulled.';
    rights := 'public_domain';
    select * into hs from private.hadith_staging where story_id = r->>'story_id';
    select * into cs from private.coptic_staging where story_id = r->>'story_id';
    select * into ts from private.text_staging where story_id = r->>'story_id';
    if hs.story_id is not null then
      orig := hs.arabic; ed := hs.book || ' ' || hs.id_in_book || ' (' || coalesce(hs.chapter,'') || ')';
      note := 'AI draft. Arabic original stored; AI translation made from the Arabic. English translation consulted for meaning, cited only.';
      rights := 'licensed'; schol := 'sunnah.com English translation; citation only';
    elsif cs.story_id is not null then
      orig := cs.coptic; ed := 'Gospel of Thomas, saying ' || cs.saying || ' (Nag Hammadi Codex II,2), Coptic SCRIPTORIUM, CC BY 4.0';
      note := 'AI draft. Sahidic Coptic original stored (Coptic SCRIPTORIUM, CC BY 4.0, attribution required); AI translation made from the Coptic. Modern English translations are under copyright and were not used.';
      rights := 'licensed'; schol := null;
    elsif ts.story_id is not null then
      orig := coalesce(r->>'original_override', ts.original);
      ed := ts.ref;
      schol := ts.english_source; scholtxt := ts.english;
      rights := case when ts.source_key in ('avot') then 'licensed' else 'public_domain' end;
      note := 'AI draft. ' || ts.original_language || ' original stored; AI translation made from the ' || ts.original_language
              || '. Public or openly licensed English translation stored alongside for comparison.';
    end if;
    e := null;
    insert into public.entries (source_id, situation, wise_response, why_it_worked, tempting_wrong_answer,
        status, draft_origin, drafted_by, story_title, source_locator, translation_notes, scholarly_rights, origin_tradition_id,
        original_text, edition, ai_translation, ai_model, ai_translated_at, scholarly_source, scholarly_translation, key_terms)
    values (s, r->>'situation', r->>'wise_response', r->>'why_it_worked', r->>'tempting_wrong_answer',
        'draft', 'ai_draft', model, r->>'title', r->>'story_id',
        coalesce(note || case when nullif(r->>'translation_notes','') is not null then ' ' || (r->>'translation_notes') else '' end, note),
        rights, ot, orig, ed,
        nullif(r->>'ai_translation',''),
        case when nullif(r->>'ai_translation','') is not null then model end,
        case when nullif(r->>'ai_translation','') is not null then now() end,
        schol, scholtxt,
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
end $function$;
revoke all on function private.import_drafts(jsonb,text) from public, anon, authenticated;
