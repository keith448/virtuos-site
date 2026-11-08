-- Registration is an application plus a decision, both recorded. An account grants
-- nothing; approval creates the labeler row and names the approver.

alter table public.labelers add column if not exists approved_by uuid references public.labelers(id);
alter table public.labelers add column if not exists approved_at timestamptz;

create table if not exists public.reviewer_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  tradition_ids uuid[] not null default '{}',
  languages text[],
  discipline text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.reviewer_decisions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.reviewer_applications(id) on delete cascade,
  decision text not null check (decision in ('approved','rejected')),
  decided_by uuid not null references public.labelers(id),
  note text,
  created_at timestamptz not null default now(),
  unique (application_id)
);

create or replace function public.apply_as_reviewer(
  p_name text,
  p_tradition_ids uuid[],
  p_languages text[] default null,
  p_discipline text default null,
  p_note text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare me uuid; addr text; existing uuid; app uuid;
begin
  me := auth.uid();
  if me is null then raise exception 'not signed in'; end if;
  if exists (select 1 from public.labelers where user_id = me) then
    raise exception 'this account already has a labeler record';
  end if;
  if coalesce(array_length(p_tradition_ids, 1), 0) = 0 then
    raise exception 'name at least one tradition';
  end if;
  select id into existing from public.reviewer_applications where user_id = me;
  if existing is not null then raise exception 'an application already exists for this account'; end if;

  select email into addr from auth.users where id = me;

  insert into public.reviewer_applications (user_id, email, name, tradition_ids, languages, discipline, note)
  values (me, coalesce(addr, ''), p_name, p_tradition_ids, p_languages, p_discipline, p_note)
  returning id into app;
  return app;
end $$;

create or replace function public.decide_application(
  p_application uuid,
  p_decision text,
  p_note text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare me public.labelers; a public.reviewer_applications;
begin
  select * into me from public.labelers where user_id = auth.uid();
  if me.id is null then raise exception 'no labeler row for this user'; end if;
  if me.role <> 'curator' then raise exception 'only a curator can decide an application'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'decision must be approved or rejected'; end if;

  select * into a from public.reviewer_applications where id = p_application;
  if a.id is null then raise exception 'no such application'; end if;
  if a.user_id = me.user_id then raise exception 'a curator cannot decide their own application'; end if;
  if exists (select 1 from public.reviewer_decisions where application_id = p_application) then
    raise exception 'this application already has a decision';
  end if;

  insert into public.reviewer_decisions (application_id, decision, decided_by, note)
  values (p_application, p_decision, me.id, p_note);

  if p_decision = 'approved' then
    if exists (select 1 from public.labelers where user_id = a.user_id) then
      raise exception 'this account already has a labeler record';
    end if;
    insert into public.labelers (user_id, name, role, tradition_ids, languages, approved_by, approved_at)
    values (a.user_id, a.name, 'reviewer_virtue', a.tradition_ids, a.languages, me.id, now());
  end if;
end $$;

revoke all on function public.apply_as_reviewer(text, uuid[], text[], text, text) from public, anon;
revoke all on function public.decide_application(uuid, text, text) from public, anon;
grant execute on function public.apply_as_reviewer(text, uuid[], text[], text, text) to authenticated;
grant execute on function public.decide_application(uuid, text, text) to authenticated;

revoke insert, update, delete on public.reviewer_applications from authenticated, anon;
revoke insert, update, delete on public.reviewer_decisions from authenticated, anon;

alter table public.reviewer_applications enable row level security;
alter table public.reviewer_decisions enable row level security;

create policy "own application" on public.reviewer_applications for select to authenticated
  using (user_id = auth.uid());
create policy "curators read applications" on public.reviewer_applications for select to authenticated
  using (exists (select 1 from public.labelers l where l.user_id = auth.uid() and l.role = 'curator'));
create policy "curators read decisions" on public.reviewer_decisions for select to authenticated
  using (exists (select 1 from public.labelers l where l.user_id = auth.uid() and l.role = 'curator'));
