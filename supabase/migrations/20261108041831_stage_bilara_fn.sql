create or replace function private.stage_bilara(p_root_path text, p_label text, p_by_verse boolean)
returns integer language plpgsql security definer set search_path = '' as $$
declare base text := 'https://raw.githubusercontent.com/suttacentral/bilara-data/published/';
  pli jsonb; en jsonb; tpath text; n int;
begin
  pli := (extensions.http_get(base || p_root_path)).content::jsonb;
  tpath := replace(replace(p_root_path, 'root/pli/ms/', 'translation/en/sujato/'), '_root-pli-ms.json', '_translation-en-sujato.json');
  begin en := (extensions.http_get(base || tpath)).content::jsonb; exception when others then en := '{}'::jsonb; end;
  with seg as (
    select k, v, split_part(k, ':', 1) pre, split_part(k, ':', 2) post, ord
    from jsonb_each_text(pli) with ordinality as t(k, v, ord)
    where split_part(k, ':', 2) !~ '^0\.'),
  g as (
    select case when p_by_verse then pre else pre || ':' || split_part(post, '.', 1) end gk,
           min(ord) o,
           trim(string_agg(trim(v), ' ' order by ord)) pli_txt,
           trim(string_agg(trim(coalesce(en->>k, '')), ' ' order by ord)) en_txt
    from seg group by 1),
  ins as (
    insert into private.text_staging (story_id, source_key, ref, original, original_language, english, english_source, in_scope)
    select 'pali-' || replace(replace(gk, ':', '_'), '.', '_'), 'pali',
           p_label || ' ' || case when p_by_verse then regexp_replace(gk, '^\D+', '') else split_part(gk, ':', 2) end,
           pli_txt, 'Pali', en_txt,
           'Bhikkhu Sujato translation (CC0, SuttaCentral); Pali: Mahāsaṅgīti edition (CC0, SuttaCentral bilara-data)', true
    from g where length(pli_txt) > 0
    on conflict (story_id) do update set original = excluded.original, english = excluded.english
    returning 1)
  select count(*) into n from ins;
  return n;
end $$;
revoke all on function private.stage_bilara(text,text,boolean) from public, anon, authenticated;
