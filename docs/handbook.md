# VirtuOS Human Reviewer Handbook — v0.5

Second-pass note: this handbook defines process. V1/V2 cultural judgments remain
for human reviewers. The observer audits compliance and never grades.

Changes from v0.4: R1 corrected to require *no* shared root rather than one
differing root; verification flips inside the function rather than in a trigger;
enum migration isolated; `verified_by` retyped to uuid; language vocabulary fixed;
plants excluded from the κ subsample; adjudication votes moved to a child table.

## 0. Migration order

Order matters. Do these as four separate migrations.

1. **Enum values only.** `ALTER TYPE public.labeler_role ADD VALUE ...` cannot be
   used in the same transaction that references the new value. One migration, no
   other statements.
2. **Schema.** `labelers.tradition_ids`, `labels.independence`,
   `entries.verified_by` retyped to `uuid[]`, `translation_attestations`,
   `adjudications`, `adjudication_votes`, canonical language vocabulary.
3. **Revokes and functions.** Functions compare against the new enum values, so
   they come after step 1.
4. **Views.** `virtue_reach` and `virtue_reach_raw` re-issued to require
   `labels.independence = 'outside'` *and* to re-check the root comparison.

## 1. Roles and permissions

Roles: `curator`, `reviewer_translation`, `reviewer_virtue`,
`reviewer_adjudicator`.

Supabase gives every signed-in user one `authenticated` role, so permissions are
column privileges plus `SECURITY DEFINER` functions, never a permission table.

```sql
-- Migration 2
alter table public.labelers add column tradition_ids uuid[];
alter table public.labels   add column independence text
  check (independence in ('outside','insider'));
alter table public.entries  alter column verified_by type uuid[]
  using null::uuid[];

-- Migration 3
revoke update (translation_status, verified_by) on public.entries from authenticated;
revoke insert on public.labels from authenticated;
```

The curator keeps UPDATE on every other column through the existing RLS policies.
Reviewers get no raw UPDATE at all.

`labelers.user_id` is required to claim any role. `tradition_ids` is required for
Queues B and C. `languages` is required for Queue A.

## 2. Independence

**R0 — reviewers are people.** Only a human labeler produces evidence. A model may hold
an account for testing; `labelers.kind` records which, and `cast_label`,
`attest_translation`, `cast_adjudication` and `reviewer_queue` all reject `model`.

**R1 — outside means outside.** A label counts only if **none** of the reviewer's
roots equals the entry's root.

```sql
not exists (
  select 1 from unnest(reviewer.tradition_ids) as r
  where private.tradition_root(r) = private.tradition_root(entry_tradition)
)
```

An interfaith reviewer who belongs partly inside is recorded as `insider` and does
not count. This is deliberate: adding an unrelated second tradition must not buy
independence.

**R2 — not the author.** `reviewer.id <> entries.created_by`. Hard rejection, not
a flag.

**R3 — two language readers.** Two attestations, at least one from the tradition.
Language matching uses the canonical vocabulary (see §8), exact membership, no
substring matching.

**R4 — discipline.** Enum, aggregated in reporting, never used to invalidate a
label.

Every label stores `independence` so the audit can see insider labels rather than
having them silently disappear.

## 3. Functions

### Queue A

```sql
create function public.attest_translation(p_entry uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  -- 1. caller must hold reviewer_translation
  -- 2. insert (p_entry, my_labeler_id()) into translation_attestations
  --    unique (entry_id, reviewer_id) makes a second call a no-op
  -- 3. if two distinct attestations exist, both R3-eligible:
  --      update entries set translation_status = 'verified',
  --                         verified_by = array(select reviewer_id ...)
end $$;
```

The flip lives inside the function, not a trigger: a trigger would run as the
calling reviewer, who no longer holds UPDATE on those columns. Evidence is two
rows in `translation_attestations`, never a caller-supplied id list.

### Queue B

```sql
create function public.cast_label(p_entry uuid, p_virtue uuid, p_agrees bool, p_notes text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  -- 1. caller must hold reviewer_virtue
  -- 2. reject if caller is entries.created_by (R2)
  -- 3. compute independence from tradition_ids vs entry root (R1)
  -- 4. insert labels (entry, virtue, agrees, notes, independence)
  --    on conflict (entry_id, labeler_id, virtue_id) do update
end $$;
```

`notes` is required when `agrees` is false.

### Queue C

```sql
create function public.cast_adjudication(p_case uuid, p_vote text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  -- caller must hold reviewer_adjudicator
  -- p_vote in ('agree','disagree','cannot_determine')
  -- caller's roots must differ from both lineage_pair roots
  -- insert into adjudication_votes (case_id, reviewer_id, vote)
  -- if two votes disagree, set adjudications.case_status = 'contested'
end $$;
```

## 4. Blind UI

Hidden from the reviewer: tradition name, root name, entry status, virtue strength,
other virtues, existing labels, and the source licence in Queue B.

Shown: layer, language, source title and citation, the four parts, and one server
flag: `outside_your_lineage: true | false`.

The flag proves R1 compliance without naming the root. A reviewer never sees
"Coptic", which leaks Christian.

Queue B asks one virtue at a time: "Does this entry teach {virtue} as its lesson
(V1), with the tempting wrong answer as its opposite (V2)?" The codebook text and
the two worked examples are shown inline. The reviewer commits before any prior
labels are revealed.

## 5. Queues

| Queue | Writes | Counts for reach |
|---|---|---|
| A — translation | attestations; function flips status | no |
| B — virtue | labels, with independence flag | yes, if `outside` |
| C — adjudication | votes, case status | no |

`approved` without an outside label counts only in `virtue_reach_raw`.

## 6. Licence and verification

Two axes, never merged.

- `translation_status`: `working | verified` — quality, written by the function.
- `release_status`: `publishable_now | research_only | unclear` — legal, derived
  from `sources.licence`, never written by a reviewer.

A translation can be verified and research-only. GRETIL's CC BY-NC-SA material is
both.

## 7. Coverage limit

One qualifying outside label is the threshold for `virtue_reach`. Two labels are a
reporting requirement for κ, not an entry condition.

`reviewer_unavailable: true` means zero eligible outside reviewers exist for a
lineage. Its entries are ineligible by construction. This is a stated coverage
limit, not an error, and it must be reported with the counts.

## 8. Discipline and language vocabularies

Discipline enum: `scripture | folklore | film | sport_coaching | interfaith |
anthropology | philosophy | other`. `other` requires a curator mapping.

Language: a canonical list, used identically by `sources.original_language` and
`labelers.languages`. Exact membership only. Values that currently vary —
"Sanskrit", "Classical Chinese", "Chinese", "Koine Greek", "Ancient Greek" — are
normalised before R3 can be asserted.

## 9. Recruitment

**Tier 1 — Apply.** Name, `tradition_ids[]`, languages, discipline, queue sought.
Curator approves and assigns the role.

**Tier 2 — Socialisation set.** 20 items keyed to the curator's current V1/V2
reading. ≥80% concordance means the reviewer applies the codebook as currently
interpreted. It tests agreement with the curator. It socialises. It does not
validate.

**Tier 3 — Maintain.** Monthly prune of inactive reviewers; no volume pay; one in
twenty labels deep-audited by a second qualified reviewer.

**Critical path.** R2 means the curator can never label anything he drafted, which
is almost the whole corpus. The first labels cannot come from the curator. Until
the first cohort exists, reviewed reach is zero by construction.

## 10. Reporting

κ is computed **only** on a shared subsample: 10% of each queue routed to every
active reviewer in that queue. Pilot guardrail: with fewer than 15 shared items κ
is unstable, so pilots share 25–30% until the subsample reaches 15, then drop to
10%.

Planted errors are excluded from the κ subsample so they cannot contaminate
agreement. They are reported separately as `plant_escalations`; a disagreement
with a plant routes to Queue C rather than being scored as a miss.

Per-virtue monthly freeze reports: reviewed roots, raw roots, `n_labels`, κ on the
subsample (overall, and by discipline where n permits), `plant_escalations`,
`reviewer_unavailable` list, tree version, codebook version.

Observer audit, append-only and never a gate: R1 which-root decisions, R2
violations, root miscounts, licence leakage into `publishable_now`, blind-flag
coverage, subsample routing fidelity, case-status and vote integrity.

## 11. What v0.5 changed

| v0.4 | v0.5 |
|---|---|
| R1 passed if any root differed | R1 passes only if no root matches; insider labels recorded, not counted |
| Trigger flips verification | Function flips it, because the trigger would run without column privilege |
| Enum change with schema | Enum change isolated in its own migration |
| `verified_by` assumed uuid | Column retyped to `uuid[]` |
| Language matched by string | Canonical vocabulary, exact membership |
| Plants in the live queue | Plants outside the κ subsample |
| `votes jsonb` | `adjudication_votes` child table |
