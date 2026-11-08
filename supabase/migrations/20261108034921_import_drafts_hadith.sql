insert into public.sources (title, layer, tradition_id, original_language, date_or_era, author, rights_status, citation, external_id) values
 ('Riyad as-Salihin (Gardens of the Righteous)', 'scripture', (select id from public.traditions where name='Islamic'), 'Arabic', '13th century CE compilation of earlier hadith', 'Imam Yahya ibn Sharaf al-Nawawi', 'public_domain', 'Arabic text via AhmedBaset/hadith-json (sunnah.com numbering); English translation cited, not stored', 'hd-riyad'),
 ('Al-Adab al-Mufrad (A Book of Manners)', 'scripture', (select id from public.traditions where name='Islamic'), 'Arabic', '9th century CE', 'Imam Muhammad ibn Ismail al-Bukhari', 'public_domain', 'Arabic text via AhmedBaset/hadith-json (sunnah.com numbering); English translation cited, not stored', 'hd-adab'),
 ('The Forty Hadith of an-Nawawi', 'scripture', (select id from public.traditions where name='Islamic'), 'Arabic', '13th century CE', 'Imam Yahya ibn Sharaf al-Nawawi', 'public_domain', 'Arabic text via AhmedBaset/hadith-json; English translation cited, not stored', 'hd-nawawi')
on conflict (external_id) do nothing;

create or replace function private.import_drafts(payload jsonb, model text default 'Claude Opus 5.5')
returns integer language plpgsql security definer set search_path = '' as $$
declare r jsonb; v jsonb; s uuid; e uuid; n int := 0; vid uuid; ot uuid; p1 text; hs record;
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
    select * into hs from private.hadith_staging where story_id = r->>'story_id';
    insert into public.entries (source_id, situation, wise_response, why_it_worked, tempting_wrong_answer,
        status, draft_origin, drafted_by, story_title, source_locator, translation_notes, scholarly_rights, origin_tradition_id,
        original_text, edition, ai_translation, ai_model, ai_translated_at, scholarly_source, key_terms)
    values (s, r->>'situation', r->>'wise_response', r->>'why_it_worked', r->>'tempting_wrong_answer',
        'draft', 'ai_draft', model, r->>'title', r->>'story_id',
        case when hs.story_id is not null
             then 'AI draft. Arabic original stored; AI translation made from the Arabic. English translation consulted for meaning, cited only.'
             else 'AI draft from a public-domain English translation; original-language text not yet pulled.' end,
        case when hs.story_id is not null then 'licensed'::public.rights_type else 'public_domain'::public.rights_type end,
        ot,
        hs.arabic,
        case when hs.story_id is not null then hs.book || ' ' || hs.id_in_book || ' (' || coalesce(hs.chapter,'') || ')' end,
        nullif(r->>'ai_translation',''),
        case when nullif(r->>'ai_translation','') is not null then model end,
        case when nullif(r->>'ai_translation','') is not null then now() end,
        case when hs.story_id is not null then 'sunnah.com English translation; citation only' end,
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
