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

`test` builds forced-choice items: one situation, three responses. The default
`fit` design sets the entry's wise response against two wise responses from other
stories about the same virtue. Only one response fits the situation. The
alternative `temptation` design uses the entry's own tempting wrong answer, but
the drafted wise responses are about twice as long as the drafted wrong answers,
so "pick the longest" scores 79% on reciprocity. Use `fit` for scores and
`temptation` as a diagnostic.

`validate` checks a set of items for three cheap cues: answer position, answer
length, and copying the situation's words.

```
python -m virtuos_eval validate --virtue reciprocity
```

Providers: `echo`, `random`, `longest`, `shortest`, `openai`, `anthropic`,
`ollama`. The first four need no key. `longest` measures the length cue directly.

Each run writes `items.jsonl`, `results.jsonl`, `scores.csv`, `report.md` and
`meta.json` with the interval and the design used.

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
