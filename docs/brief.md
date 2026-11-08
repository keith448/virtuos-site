# VirtuOS — brief

Start here. One page on what exists, what's true, and what's next.

## What it is

A dataset of how good people act, in five layers — scripture, ancient fables, folk
tales, hero films, real achievement. Every entry has the same four parts: situation,
wise response, why it worked, tempting wrong answer. A virtue joins the **shared
core** only when at least five **lineages** reached it independently, each attested
by a reviewer from outside that lineage.

Full design: [master-plan.md](./master-plan.md).

## Where it lives

| | |
|---|---|
| Supabase project | `virtuos-dataset` — ref `tgfbsplvimtzoxtffkpx`, us-east-1, Postgres 17 |
| Organization | VirtuOS |
| Schema source | `supabase/migrations/` — 15 files, recovered from the database |
| Data snapshot | `data/snapshot.jsonl`, from `scripts/export.mjs` (gitignored) |
| App code | none yet |
| Git remote | none yet |

## State, 2026-11-08

- 1,619 entries: 11 approved, 1,608 draft, 0 in review. 1,608 are AI drafts.
- **Shared core: empty.** Three virtues have raw breadth — mercy (6 traditions),
  reciprocity (6), gratitude (5) — but none has an external review, so none counts.
- 20 virtues, 47 traditions, 81 sources, 25 parallels.
- 0 auth users. `labels` is empty. `scenarios` and `model_runs` are empty.

## What's true that the plan doesn't say

1. **The core is empty by design, not by accident.** `virtue_reach` now requires an
   agreeing label from a labeler whose tradition differs from the entry's, and who
   is not the entry's author. `virtue_reach_raw` keeps the old unreviewed count.
2. **Raw reach overstates.** The three "convergences" rest on 11 stories, six of
   them counted twice. Every mercy entry is also a gratitude or reciprocity entry
   at equal or higher strength — so mercy is a second reading of stories about
   repayment, not independent evidence.
3. **Nobody can sign in usefully yet.** One labeler row — `Keith Schroeder`,
   `curator` — with `user_id` null, and no auth users. `private.my_role()` resolves
   from `auth.uid()`, so a fresh sign-in gets no permissions until that row is
   claimed.
4. **The database wasn't rebuildable.** `private.coptic_staging` and
   `private.raw_docs` existed with no migration. Recovered in
   `20261108050000_baseline_staging_tables.sql`.
5. **The plan is behind the schema.** `entries.translation` and `entries.translator`
   were dropped for the three-part translation standard (`edition`, `scholarly_*`,
   `ai_*`). The master plan still lists the old columns.
6. **Approval leaves no trace.** `status` has no author and no date. The label is
   now the evidence; `status` is only workflow.
7. **Lineages exist but are unassigned.** `traditions.parent_id` builds the tree
   and both views count distinct roots, but every value is null, so each tradition
   is currently its own root. Assigning parents is editorial work that should be
   done with reviewers from each lineage.

## Next

Record reviews, not approvals. Before any review can count, the labeler row needs
`user_id` (claimed after sign-in) and `tradition_id`. Then the core fills honestly —
or stays empty, which is also an answer.

## Open questions

- Is the output a published Hugging Face dataset, the review platform, or both?
- `origin_tradition_id` is set on 0 entries today; it overrides the source's
  tradition in `virtue_reach`. If set carelessly, core membership moves.
- Where do lineage boundaries fall? Coptic and Anglican are different communities
  but one transmission. Gnostic material may deserve its own root. The mechanism
  exists; the assignments don't.
