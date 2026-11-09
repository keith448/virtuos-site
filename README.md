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
  evidence-plan.md    what a statistically useful corpus requires, and the gap
src/virtuos_eval/     Python package: corpus loader and benchmark runner
supabase/
  migrations/         schema history, recovered from the live project
```

## Use it

The package is a draft harness. It runs the corpus through a model and reports
what happened.

```
pip install -e .
python -m virtuos_eval stats
python -m virtuos_eval list --virtue reciprocity --limit 10
python -m virtuos_eval test --provider openai --model gpt-5 --n 100 --out runs/openai
```

`test` builds forced-choice items: one situation, three responses. One is the
entry's wise response, one is the entry's own tempting wrong answer, and one is
a wrong answer from another story about the same virtue. Scoring is exact match,
so no judge model is needed. Each run writes `items.jsonl`, `results.jsonl`,
`scores.csv` and `report.md` with a Wilson interval.

Providers: `echo`, `random`, `openai`, `anthropic`, `ollama`. `echo` and `random`
need no key and exercise the pipeline.

The bundled data is `release/v0.1-draft`: 1,489 entries, 1,129 holding original
text, no human labels. Every score is a pipeline test until the label layer
exists. Regenerate the bundle with:

```
node scripts/export-release.mjs v0.1-draft
node scripts/sync-package-data.mjs
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

The corpus has volume. It does not yet have evidence: 10 approved entries, 0
labels, empty shared core. The Python package runs a draft benchmark over the
publishable release. See [docs/brief.md](docs/brief.md) and
[docs/evidence-plan.md](docs/evidence-plan.md).
