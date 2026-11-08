alter table public.sources add column if not exists licence text;

comment on column public.sources.licence is
  'Exact licence of the source text, e.g. CC BY-NC-SA 4.0 or public domain. rights_status is the coarse category; this is the precise term, and it travels with the entry.';

update public.sources
set licence = case rights_status
  when 'public_domain' then 'public domain'
  when 'own_summary' then 'own summary'
  when 'licensed' then 'licensed (terms not recorded)'
end
where licence is null;
