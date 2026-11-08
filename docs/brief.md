# VirtuOS — brief

Start here. One page on what exists, what's true, and what's next.

## What it is

A dataset of how good people act, in five layers — scripture, ancient fables, folk
tales, hero films, real achievement. Every entry has the same four parts: situation,
wise response, why it worked, tempting wrong answer. A virtue joins the **shared
core** only when at least five traditions reached it independently.

Full design: [master-plan.md](./master-plan.md).

## Where it lives

| | |
|---|---|
| Supabase project | `virtuos-dataset` — ref `tgfbsplvimtzoxtffkpx`, us-east-1, Postgres 17 |
| Organization | VirtuOS |
| Schema source | `supabase/migrations/` (14 files, recovered from the database) |
| App code | none yet |
| Git remote | none yet |

## State, 2026-11-08

- 1,619 entries: **11 approved**, 1,608 draft, 0 in review. 1,608 are AI drafts.
- 20 virtues seeded. Three are in the shared core: mercy (6 traditions),
  reciprocity (6), gratitude (5). Two more are close: care for the stranger (3),
  humility (3).
- 47 traditions, 81 sources, 25 parallels.
- 0 auth users. `labels` is empty. `scenarios` and `model_runs` are empty.

## What's true that the plan doesn't say

1. **The core rests on 11 entries.** `virtue_reach.approved_entries` counts
   entry–virtue links, not entries, so the sixes and fives sum to 24. Each of the
   three core virtues is carried by two or three approved entries.
2. **Nobody can sign in usefully yet.** There is one labeler row —
   `Keith Schroeder`, role `curator` — with `user_id` null, and no auth users.
   `private.my_role()` resolves from `auth.uid()`, so a fresh sign-in gets no
   permissions until that row is claimed.
3. **The database wasn't rebuildable.** `private.coptic_staging` and
   `private.raw_docs` existed with no migration. Recovered in
   `20261108050000_baseline_staging_tables.sql`.
4. **The plan is behind the schema.** `entries.translation` and
   `entries.translator` were dropped in favour of the three-part translation
   standard (`edition`, `scholarly_*`, `ai_*`). The master plan still lists the
   old columns.
5. **"No single voice decides" is not enforced.** RLS lets any `reviewer`
   approve alone. `labels` is empty and nothing requires agreement before
   `status = 'approved'`. The rule exists in prose only.
6. **Approval is currently draft → approved.** `in_review` has never been used.

## Next

Phase 1's missing half: a small Vercel app to add and review entries. The schema
is ready for it — roles, RLS, and the review states are all in place. The first
thing it has to do is let a signed-in curator claim their labeler row, so there is
someone who can approve.

## Open questions

- Is the output a published Hugging Face dataset, the review platform, or both?
- Should approval require N independent labels before `status = 'approved'`?
- `origin_tradition_id` is set on 0 entries today; it overrides the source's
  tradition in `virtue_reach`. If it is ever set carelessly, core membership moves.
