create or replace function private.stage_sefaria(p_ref text, p_source_key text, p_he_version text, p_en_version text, p_label text)
returns integer language plpgsql security definer set search_path = '' as $$
declare j jsonb; he jsonb; en jsonb; he_lic text; en_title text; en_lic text; i int; n int := 0; url text;
begin
  url := 'https://www.sefaria.org/api/v3/texts/' || replace(p_ref, ' ', '_')
      || '?version=' || replace('hebrew|' || p_he_version, ' ', '%20')
      || '&version=' || replace('english|' || p_en_version, ' ', '%20');
  j := (extensions.http_get(url)).content::jsonb;
  select v->'text', v->>'license' into he, he_lic from jsonb_array_elements(j->'versions') v where v->>'language' = 'he' limit 1;
  select v->'text', v->>'versionTitle', v->>'license' into en, en_title, en_lic from jsonb_array_elements(j->'versions') v where v->>'language' = 'en' limit 1;
  if he is null or jsonb_typeof(he) <> 'array' then return 0; end if;
  for i in 0 .. jsonb_array_length(he) - 1 loop
    insert into private.text_staging (story_id, source_key, ref, original, original_language, english, english_source)
    values (p_source_key || '-' || regexp_replace(lower(p_ref), '[^a-z0-9]+', '_', 'g') || '_' || lpad((i+1)::text, 3, '0'),
            p_source_key, p_label || ':' || (i+1),
            regexp_replace(he->>i, '<[^>]+>', '', 'g'),
            'Hebrew',
            regexp_replace(coalesce(en->>i, ''), '<[^>]+>', '', 'g'),
            coalesce(en_title, '') || ' (' || coalesce(en_lic, '') || '); Hebrew: ' || p_he_version || ' (' || coalesce(he_lic,'') || ')')
    on conflict (story_id) do update set original = excluded.original, english = excluded.english, english_source = excluded.english_source;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function private.stage_sefaria(text,text,text,text,text) from public, anon, authenticated;
