create table if not exists private.text_staging (
  story_id text primary key,
  source_key text not null,
  ref text not null,
  original text,
  original_language text,
  english text,
  english_source text,
  in_scope boolean not null default true,
  batch int
);
create index if not exists text_staging_batch_idx on private.text_staging (batch);
revoke all on private.text_staging from public, anon, authenticated;
