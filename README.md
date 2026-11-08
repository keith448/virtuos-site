# VirtuOS

A dataset of how good people act, gathered across the world's traditions in five
layers: scripture, ancient fables, folk tales, hero films, and real human
achievement.

- **What it is, in full:** [docs/master-plan.md](docs/master-plan.md)
- **Current state and next step:** [docs/brief.md](docs/brief.md)

## Layout

```
docs/
  master-plan.md      design and five-phase plan
  brief.md            one-page state of the project; start here
supabase/
  migrations/         schema history, recovered from the live project
```

## Database

Supabase project `virtuos-dataset` (`tgfbsplvimtzoxtffkpx`, us-east-1).

The migrations here were read back from `supabase_migrations.schema_migrations`
on 2026-11-08, because the project was built through the Supabase MCP server and
had no local source of truth. They reproduce the schema; they are not yet wired
to a local Supabase CLI stack.

Key objects:

- `public.entries` — the four-part entries, plus the translation standard fields
- `public.virtue_reach` — the shared-core test: a virtue is in the core at five
  distinct traditions
- `private.my_role()` / `private.my_labeler_id()` — RLS helpers keyed to
  `auth.uid()`
- `private.import_drafts(jsonb)` — bulk draft importer used for AI drafting
- `private.stage_*()` — source fetchers for Sefaria, SBLGNT/WEB, and SuttaCentral

## Status

No application code yet. See [docs/brief.md](docs/brief.md).
