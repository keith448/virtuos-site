-- Reviewer write paths. Direct writes are revoked; these functions are the only
-- way a reviewer changes anything. Each asserts the caller's queue role.

create or replace function private.tradition_root(p_id uuid)
returns uuid language sql stable set search_path = '' as $$
  with recursive up as (
    select t.id, t.parent_id from public.traditions t where t.id = p_id
    union
    select t.id, t.parent_id from public.traditions t join up on t.id = up.parent_id
  )
  select id from up where parent_id is null limit 1;
$$;

create or replace function private.normalize_language(p text)
returns text language sql stable set search_path = '' as $$
  select a.language from public.language_aliases a
  where lower(a.alias) = lower(trim(p))
  limit 1;
$$;

create or replace function public.cast_label(p_entry uuid, p_virtue uuid, p_agrees boolean, p_notes text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me public.labelers;
  e public.entries;
  entry_root uuid;
  entry_tradition uuid;
  outside boolean;
begin
  select * into me from public.labelers where user_id = auth.uid();
  if me.id is null then raise exception 'no labeler row for this user'; end if;
  if me.role <> 'reviewer_virtue' then raise exception 'role % cannot cast virtue labels', me.role; end if;
  if not p_agrees and coalesce(trim(p_notes), '') = '' then raise exception 'notes required when disagreeing'; end if;

  select * into e from public.entries where id = p_entry;
  if e.id is null then raise exception 'no such entry'; end if;
  if e.retired_at is not null then raise exception 'entry is retired'; end if;
  if e.created_by is not null and e.created_by = me.id then
    raise exception 'R2: the author cannot label this entry';
  end if;

  select coalesce(e.origin_tradition_id, s.tradition_id) into entry_tradition
  from public.sources s where s.id = e.source_id;
  entry_root := private.tradition_root(entry_tradition);

  outside := not exists (
    select 1 from unnest(coalesce(me.tradition_ids, '{}'::uuid[])) as r
    where private.tradition_root(r) = entry_root
  );

  insert into public.labels (entry_id, labeler_id, virtue_id, agrees, notes, independence)
  values (p_entry, me.id, p_virtue, p_agrees, p_notes,
          case when outside then 'outside' else 'insider' end)
  on conflict (entry_id, labeler_id, virtue_id) do update
    set agrees = excluded.agrees, notes = excluded.notes, independence = excluded.independence;

  return case when outside then 'outside' else 'insider' end;
end $$;

create or replace function public.attest_translation(p_entry uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me public.labelers;
  entry_lang text;
  n int;
  ids uuid[];
begin
  select * into me from public.labelers where user_id = auth.uid();
  if me.id is null then raise exception 'no labeler row for this user'; end if;
  if me.role <> 'reviewer_translation' then raise exception 'role % cannot attest translations', me.role; end if;

  select s.original_language into entry_lang
  from public.entries e join public.sources s on s.id = e.source_id
  where e.id = p_entry;
  if entry_lang is null then raise exception 'entry has no source language'; end if;
  if private.normalize_language(entry_lang) is null then
    raise exception 'language % is not in the vocabulary', entry_lang;
  end if;
  if not exists (
    select 1 from unnest(coalesce(me.languages, '{}'::text[])) as l
    where private.normalize_language(l) = private.normalize_language(entry_lang)
  ) then
    raise exception 'R3: reviewer does not read %', entry_lang;
  end if;

  insert into public.translation_attestations (entry_id, reviewer_id)
  values (p_entry, me.id) on conflict do nothing;

  select count(distinct reviewer_id), array_agg(distinct reviewer_id)
  into n, ids from public.translation_attestations where entry_id = p_entry;

  if n >= 2 then
    update public.entries set translation_status = 'verified', verified_by = ids where id = p_entry;
    return 'verified';
  end if;
  return 'attested';
end $$;

create or replace function public.cast_adjudication(p_case uuid, p_vote text)
returns void language plpgsql security definer set search_path = '' as $$
declare me public.labelers; c public.adjudications;
begin
  select * into me from public.labelers where user_id = auth.uid();
  if me.id is null then raise exception 'no labeler row for this user'; end if;
  if me.role <> 'reviewer_adjudicator' then raise exception 'role % cannot adjudicate', me.role; end if;
  if p_vote not in ('agree','disagree','cannot_determine') then raise exception 'invalid vote'; end if;

  select * into c from public.adjudications where id = p_case;
  if c.id is null then raise exception 'no such case'; end if;

  if exists (
    select 1 from unnest(c.lineage_pair) lp
    where exists (
      select 1 from unnest(coalesce(me.tradition_ids, '{}'::uuid[])) r
      where private.tradition_root(r) = private.tradition_root(lp)
    )
  ) then
    raise exception 'R1: adjudicator shares a lineage with this case';
  end if;

  insert into public.adjudication_votes (case_id, reviewer_id, vote)
  values (p_case, me.id, p_vote)
  on conflict (case_id, reviewer_id) do update set vote = excluded.vote;

  if exists (select 1 from public.adjudication_votes where case_id = p_case and vote = 'cannot_determine')
     or (select count(distinct vote) from public.adjudication_votes where case_id = p_case) > 1 then
    update public.adjudications set case_status = 'contested' where id = p_case;
  elsif (select count(*) from public.adjudication_votes where case_id = p_case) >= 1 then
    update public.adjudications set case_status = 'resolved' where id = p_case;
  end if;
end $$;

revoke update (translation_status, verified_by) on public.entries from authenticated;
revoke insert on public.labels from authenticated;

revoke all on function public.cast_label(uuid, uuid, boolean, text) from public, anon;
revoke all on function public.attest_translation(uuid) from public, anon;
revoke all on function public.cast_adjudication(uuid, text) from public, anon;

grant execute on function public.cast_label(uuid, uuid, boolean, text) to authenticated;
grant execute on function public.attest_translation(uuid) to authenticated;
grant execute on function public.cast_adjudication(uuid, text) to authenticated;
