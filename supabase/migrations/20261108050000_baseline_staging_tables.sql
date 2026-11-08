-- Recovered from the live database on 2026-11-08.
-- These two tables existed in the private schema but were never created by a
-- tracked migration, so the database could not be rebuilt from migrations alone.
-- Column definitions were read back from information_schema.

create table if not exists private.coptic_staging (
  story_id text primary key,
  book text,
  saying integer,
  coptic text
);

create table if not exists private.raw_docs (
  key text primary key,
  url text,
  content text,
  fetched_at timestamptz default now()
);

revoke all on private.coptic_staging from public, anon, authenticated;
revoke all on private.raw_docs from public, anon, authenticated;
