create extension if not exists http with schema extensions;
create table if not exists private.hadith_staging (
  story_id text primary key,
  book text not null,
  chapter_id int,
  chapter text,
  id_in_book int,
  arabic text,
  english_narrator text,
  english_text text
);
revoke all on private.hadith_staging from public, anon, authenticated;
