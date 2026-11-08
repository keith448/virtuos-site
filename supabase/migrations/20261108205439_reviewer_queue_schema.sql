-- Schema for the three reviewer queues.

alter table public.labelers add column if not exists tradition_ids uuid[];
update public.labelers set tradition_ids = array[tradition_id]
  where tradition_ids is null and tradition_id is not null;

alter table public.labels add column if not exists independence text
  check (independence in ('outside','insider'));

alter table public.entries alter column verified_by type uuid[] using null::uuid[];

create table if not exists public.translation_attestations (
  entry_id uuid not null references public.entries(id) on delete cascade,
  reviewer_id uuid not null references public.labelers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (entry_id, reviewer_id)
);

create table if not exists public.adjudications (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  virtue_id uuid references public.virtues(id),
  lineage_pair uuid[] not null default '{}',
  case_status text not null default 'open' check (case_status in ('open','resolved','contested')),
  created_at timestamptz not null default now()
);

create table if not exists public.adjudication_votes (
  case_id uuid not null references public.adjudications(id) on delete cascade,
  reviewer_id uuid not null references public.labelers(id) on delete cascade,
  vote text not null check (vote in ('agree','disagree','cannot_determine')),
  created_at timestamptz not null default now(),
  primary key (case_id, reviewer_id)
);

-- Canonical language vocabulary, used identically by sources and labelers.
create table if not exists public.languages (name text primary key);
create table if not exists public.language_aliases (
  alias text primary key,
  language text not null references public.languages(name)
);

insert into public.languages(name)
select distinct trim(original_language) from public.sources
where original_language is not null and trim(original_language) <> ''
on conflict do nothing;

insert into public.languages(name) values ('Hebrew'), ('Coptic'), ('Arabic')
on conflict do nothing;

insert into public.language_aliases(alias, language)
select name, name from public.languages
on conflict (alias) do nothing;

insert into public.language_aliases(alias, language) values
  ('Koine Greek', 'Ancient Greek'),
  ('Biblical Hebrew', 'Hebrew'),
  ('Sahidic Coptic', 'Coptic'),
  ('Classical Arabic', 'Arabic')
on conflict (alias) do update set language = excluded.language;

alter table public.translation_attestations enable row level security;
alter table public.adjudications enable row level security;
alter table public.adjudication_votes enable row level security;
alter table public.languages enable row level security;
alter table public.language_aliases enable row level security;

create policy "team reads attestations" on public.translation_attestations for select to authenticated using (true);
create policy "team reads adjudications" on public.adjudications for select to authenticated using (true);
create policy "team reads adjudication votes" on public.adjudication_votes for select to authenticated using (true);
create policy "team reads languages" on public.languages for select to authenticated using (true);
create policy "team reads language aliases" on public.language_aliases for select to authenticated using (true);
