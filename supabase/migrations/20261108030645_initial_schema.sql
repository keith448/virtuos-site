create type public.layer_type as enum ('scripture','fable','folk_tale','film','achievement');
create type public.rights_type as enum ('public_domain','own_summary','licensed');
create type public.entry_status as enum ('draft','in_review','approved');
create type public.labeler_role as enum ('curator','labeler','reviewer');

create table public.traditions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  region text,
  era text,
  description text,
  created_at timestamptz not null default now()
);

create table public.labelers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  tradition_background text,
  languages text[],
  role public.labeler_role not null default 'labeler',
  created_at timestamptz not null default now()
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  layer public.layer_type not null,
  tradition_id uuid references public.traditions(id),
  original_language text,
  date_or_era text,
  author text,
  rights_status public.rights_type not null,
  citation text,
  created_at timestamptz not null default now(),
  constraint film_is_own_summary check (layer <> 'film' or rights_status = 'own_summary')
);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete cascade,
  situation text not null,
  wise_response text not null,
  why_it_worked text not null,
  tempting_wrong_answer text,
  original_text text,
  translation text,
  translator text,
  correction_moment text,
  status public.entry_status not null default 'draft',
  created_by uuid references public.labelers(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.virtues (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table public.entry_virtues (
  entry_id uuid not null references public.entries(id) on delete cascade,
  virtue_id uuid not null references public.virtues(id) on delete cascade,
  strength smallint not null default 2 check (strength between 1 and 3),
  primary key (entry_id, virtue_id)
);

create table public.parallels (
  id uuid primary key default gen_random_uuid(),
  entry_a uuid not null references public.entries(id) on delete cascade,
  entry_b uuid not null references public.entries(id) on delete cascade,
  virtue_id uuid references public.virtues(id),
  note text,
  created_at timestamptz not null default now(),
  constraint different_entries check (entry_a <> entry_b)
);

create table public.labels (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  labeler_id uuid not null references public.labelers(id) on delete cascade,
  virtue_id uuid references public.virtues(id),
  agrees boolean not null,
  notes text,
  created_at timestamptz not null default now()
);

create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references public.entries(id) on delete set null,
  prompt text not null,
  rubric text not null,
  disguised boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.model_runs (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  model_name text not null,
  response text not null,
  judge_score numeric,
  human_score numeric,
  notes text,
  run_at timestamptz not null default now()
);

create index on public.sources (tradition_id);
create index on public.entries (source_id);
create index on public.entries (created_by);
create index on public.entries (status);
create index on public.entry_virtues (virtue_id);
create index on public.parallels (entry_a);
create index on public.parallels (entry_b);
create index on public.parallels (virtue_id);
create index on public.labels (entry_id);
create index on public.labels (labeler_id);
create index on public.labels (virtue_id);
create index on public.scenarios (entry_id);
create index on public.model_runs (scenario_id);

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;
create trigger entries_updated_at before update on public.entries
for each row execute function public.touch_updated_at();

create or replace view public.virtue_reach with (security_invoker = true) as
select v.id as virtue_id,
       v.name as virtue,
       count(distinct s.tradition_id) as traditions_reached,
       count(distinct e.id) as approved_entries,
       count(distinct s.tradition_id) >= 5 as in_shared_core
from public.virtues v
left join public.entry_virtues ev on ev.virtue_id = v.id
left join public.entries e on e.id = ev.entry_id and e.status = 'approved'
left join public.sources s on s.id = e.source_id
group by v.id, v.name;

create or replace function public.my_role() returns public.labeler_role
language sql stable security definer set search_path = '' as $$
  select role from public.labelers where user_id = (select auth.uid()) $$;
create or replace function public.my_labeler_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.labelers where user_id = (select auth.uid()) $$;
revoke execute on function public.my_role() from anon, public;
revoke execute on function public.my_labeler_id() from anon, public;
grant execute on function public.my_role() to authenticated;
grant execute on function public.my_labeler_id() to authenticated;

alter table public.traditions enable row level security;
alter table public.labelers enable row level security;
alter table public.sources enable row level security;
alter table public.entries enable row level security;
alter table public.virtues enable row level security;
alter table public.entry_virtues enable row level security;
alter table public.parallels enable row level security;
alter table public.labels enable row level security;
alter table public.scenarios enable row level security;
alter table public.model_runs enable row level security;

create policy "team reads traditions" on public.traditions for select to authenticated using (true);
create policy "team writes traditions" on public.traditions for all to authenticated using ((select public.my_role()) is not null) with check ((select public.my_role()) is not null);

create policy "team reads sources" on public.sources for select to authenticated using (true);
create policy "team writes sources" on public.sources for all to authenticated using ((select public.my_role()) is not null) with check ((select public.my_role()) is not null);

create policy "team reads virtues" on public.virtues for select to authenticated using (true);
create policy "curators write virtues" on public.virtues for all to authenticated using ((select public.my_role()) in ('curator','reviewer')) with check ((select public.my_role()) in ('curator','reviewer'));

create policy "team reads labelers" on public.labelers for select to authenticated using (true);
create policy "join as labeler" on public.labelers for insert to authenticated with check (user_id = (select auth.uid()) and role = 'labeler');
create policy "curators manage labelers" on public.labelers for update to authenticated using ((select public.my_role()) = 'curator') with check ((select public.my_role()) = 'curator');

create policy "team reads entries" on public.entries for select to authenticated using (true);
create policy "labelers add drafts" on public.entries for insert to authenticated with check ((select public.my_role()) is not null and status <> 'approved' and created_by = (select public.my_labeler_id()));
create policy "authors edit own unapproved" on public.entries for update to authenticated using (created_by = (select public.my_labeler_id()) and status <> 'approved') with check (status <> 'approved');
create policy "reviewers edit any" on public.entries for update to authenticated using ((select public.my_role()) = 'reviewer') with check ((select public.my_role()) = 'reviewer');
create policy "reviewers delete" on public.entries for delete to authenticated using ((select public.my_role()) = 'reviewer');

create policy "team reads entry virtues" on public.entry_virtues for select to authenticated using (true);
create policy "team writes entry virtues" on public.entry_virtues for all to authenticated using ((select public.my_role()) is not null) with check ((select public.my_role()) is not null);

create policy "team reads parallels" on public.parallels for select to authenticated using (true);
create policy "team writes parallels" on public.parallels for all to authenticated using ((select public.my_role()) is not null) with check ((select public.my_role()) is not null);

create policy "team reads labels" on public.labels for select to authenticated using (true);
create policy "labelers write own labels" on public.labels for all to authenticated using (labeler_id = (select public.my_labeler_id())) with check (labeler_id = (select public.my_labeler_id()));

create policy "team reads scenarios" on public.scenarios for select to authenticated using (true);
create policy "reviewers write scenarios" on public.scenarios for all to authenticated using ((select public.my_role()) in ('curator','reviewer')) with check ((select public.my_role()) in ('curator','reviewer'));

create policy "team reads model runs" on public.model_runs for select to authenticated using (true);
create policy "reviewers write model runs" on public.model_runs for all to authenticated using ((select public.my_role()) in ('curator','reviewer')) with check ((select public.my_role()) in ('curator','reviewer'));
