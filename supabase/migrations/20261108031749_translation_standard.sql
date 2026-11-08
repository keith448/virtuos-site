create type public.translation_status as enum ('working','verified');

alter table public.entries
  add column edition text,
  add column scholarly_translation text,
  add column scholarly_source text,
  add column scholarly_rights public.rights_type,
  add column ai_translation text,
  add column ai_model text,
  add column ai_translated_at timestamptz,
  add column key_terms jsonb,
  add column translation_notes text,
  add column verified_by text[],
  add column translation_status public.translation_status not null default 'working';

update public.entries set
  scholarly_translation = translation,
  scholarly_source = translator,
  scholarly_rights = 'public_domain'
where translator <> 'VirtuOS working translation';

update public.entries set
  ai_translation = translation,
  ai_model = 'Claude Opus 5.5',
  ai_translated_at = created_at
where translator = 'VirtuOS working translation';

alter table public.entries drop column translation, drop column translator;
