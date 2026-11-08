create or replace function private.stage_nt(p_sbl text, p_web text, p_label text, p_chapters int[])
returns integer language plpgsql security definer set search_path = '' as $$
declare gk text; web jsonb; n int := 0;
begin
  gk := (extensions.http_get('https://raw.githubusercontent.com/LogosBible/SBLGNT/master/data/sblgnt/text/' || p_sbl || '.txt')).content;
  web := (extensions.http_get('https://raw.githubusercontent.com/TehShrike/world-english-bible/master/json/' || p_web || '.json')).content::jsonb;
  with g as (
    select (regexp_match(line, '^\S+ (\d+):(\d+)\t(.*)$')) m
    from regexp_split_to_table(gk, E'\n') line
  ), gv as (
    select m[1]::int c, m[2]::int v, trim(m[3]) txt from g where m is not null and m[1]::int = any(p_chapters)
  ), ev as (
    select (x->>'chapterNumber')::int c, (x->>'verseNumber')::int v,
           trim(regexp_replace(string_agg(x->>'value', ' ' order by ord), '\s+', ' ', 'g')) txt
    from jsonb_array_elements(web) with ordinality as t(x, ord)
    where x->>'type' in ('paragraph text','line text') and (x->>'chapterNumber')::int = any(p_chapters)
    group by 1, 2
  ), ins as (
    insert into private.text_staging (story_id, source_key, ref, original, original_language, english, english_source, in_scope)
    select 'nt-' || lower(p_sbl) || '_' || lpad(gv.c::text, 3, '0') || '_' || lpad(gv.v::text, 3, '0'),
           'nt', p_label || ' ' || gv.c || ':' || gv.v, gv.txt, 'Koine Greek', coalesce(ev.txt, ''),
           'World English Bible (public domain); Greek: SBL Greek New Testament (CC BY 4.0, Society of Biblical Literature and Logos Bible Software)', true
    from gv left join ev on ev.c = gv.c and ev.v = gv.v
    on conflict (story_id) do update set original = excluded.original, english = excluded.english
    returning 1)
  select count(*) into n from ins;
  return n;
end $$;
revoke all on function private.stage_nt(text,text,text,int[]) from public, anon, authenticated;
