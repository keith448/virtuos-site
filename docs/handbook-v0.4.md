# VirtuOS Human Reviewer Handbook — Skeleton v0.4

*Second-pass note: Process only. V1/V2 judgments remain for human reviewers. Observer audits compliance, never grades.*

## 1. Roles — SECURITY DEFINER, no direct writes

### Enum migration first

```sql
ALTER TYPE labeler_role ADD VALUE 'reviewer_translation';
ALTER TYPE labeler_role ADD VALUE 'reviewer_virtue';
ALTER TYPE labeler_role ADD VALUE 'reviewer_adjudicator';
-- isolated migration, ADD VALUE cannot share txn with use
```

### Schema changes

```sql
ALTER TABLE labelers ADD COLUMN tradition_ids uuid[];
-- replaces singular tradition_id; interfaith reviewers need multiple
-- R1: independence = 'outside' iff NONE of reviewer root ids equals entry root
-- report which root satisfied in audit log when NONE match

REVOKE UPDATE (translation_status, verified_by) ON entries FROM authenticated;
REVOKE INSERT ON labels FROM authenticated;
-- curator keeps UPDATE on other columns via RLS
```

### Translation attestation (inverted, no caller-supplied ids)

```sql
CREATE FUNCTION attest_translation(entry_id uuid) SECURITY DEFINER AS $$
  -- assert private.my_role() = 'reviewer_translation'
  -- attester = labelers.id where user_id = auth.uid()
  -- INSERT INTO translation_attestations(entry_id, reviewer_id)
$$;

CREATE TRIGGER trg_translation_verify
AFTER INSERT ON translation_attestations
FOR EACH ROW EXECUTE FUNCTION check_translation_verified();
-- check: count(distinct reviewer_id)=2 AND R3 language+tradition satisfied
-- then UPDATE entries SET translation_status='verified',
--      verified_by = array of reviewer_ids
```

### Label casting

```sql
CREATE FUNCTION cast_label(entry_id uuid, virtue_id uuid, agrees boolean, notes text)
SECURITY DEFINER AS $$
  -- assert private.my_role() = 'reviewer_virtue'
  -- assert R1: NONE of reviewer tradition_ids roots = entry root
  -- assert R2: reviewer != entries.created_by
  -- reject retired entries; require notes on disagreement
  -- INSERT labels with labeler_id = auth.uid()
  -- independence='outside' iff NONE match, else 'insider' (counted zero)
$$
```

### Adjudication

```sql
CREATE FUNCTION cast_adjudication(case_id uuid, vote text) SECURITY DEFINER AS $$
  -- assert private.my_role()='reviewer_adjudicator'
  -- vote IN ('agree','disagree','cannot_determine')
  -- reject if reviewer shares root with either lineage_pair root
$$;

-- adjudications
-- lineage_pair uuid[]  -- root ids, not names
-- case_status IN ('open','resolved','contested')  -- contested is status, not vote
-- votes: {reviewer_id: agree|disagree|cannot_determine}
```

## 2. Independence (enforced in functions)

- **R1:** `∀ r ∈ reviewer.tradition_ids: root(r) ≠ root(entry.tradition)` — if any root matches, `independence='insider'`. Log which r satisfied on outside.
- **R2:** `reviewer ≠ entries.created_by`
- **R3:** two attestations, language read by each, ≥1 from tradition
- **R4:** discipline enum aggregated in reports

`virtue_reach` re-checks root comparison independently — bug in `cast_label` cannot inflate count.

## 3. Blind UI spec

**Hidden:** tradition name, root name, `status`, strength, other virtues, existing labels, licence (Queue B).
**Shown:** layer, language, source title+citation, four entry parts, server flag `outside_your_lineage: true/false`.

Queue B prompt (one virtue): "Does this entry teach *{virtue}* as its lesson (V1) with the tempting wrong answer as its opposite (V2)?" Required `agrees`, `notes` if no. Commit before reveal.

**Planted errors:** 10% of live queue OR separate 20-item calibration set. Unambiguous only. Disagreement → Queue C, not scored as miss. Observer reports `plant_escalations`.

## 4. Three queues

**Queue A — Translation verification (E5/R3):** `attest_translation()` only → `translation_status`, `verified_by`.
**Queue B — Virtue labels (V1-V5/R1/R2):** `cast_label()` only → `labels`. Strength-3 only counts (V4).
**Queue C — Adjudication (L5/A1-A2):** `cast_adjudication()` only → `adjudications`. Third reviewer outside both lineages; third vs both → `contested`, excluded.

`approved` without labels = `virtue_reach_raw` only.

## 5. Licence vs verification

- `translation_status: working | verified`
- `release_status: publishable_now | research_only | unclear` — derived from `sources.licence`, not written by reviewers.

GRETIL CC BY-NC-SA (7) → `verified` **and** `research_only`. `licensed (terms not recorded)` (23) + gita digitisation (3) → `unclear`. No publishable view may include research_only/unclear.

## 6. Coverage rule

> One qualifying outside label reaches `virtue_reach`. Two labels only for κ reporting, not entry condition.

`reviewer_unavailable:true` = zero eligible outside reviewers. Small lineages (Ainu, Zuni, Māori) not excluded by a two-reviewer bar.

## 7. Discipline vocab

`scripture | folklore | film | sport_coaching | interfaith | anthropology | philosophy | other`
`other` requires curator map. Aggregation by enum only.

## 8. Recruitment path

- **Tier 1 — Apply:** name, `tradition_ids[]`, languages, discipline enum, queue role.
- **Tier 2 — Socialization set:** 20 items keyed by curator's current V1/V2 reading. ≥80% = learned codebook as interpreted. **Not validity.**
- **Tier 3 — Maintain:** monthly prune inactive; no volume pay; 1-in-20 deep audit.

**Critical path:** R2 means curator can never label anything he drafted — almost the whole corpus. First labels cannot come from curator. Recruitment is the critical path, not UI.

## 9. Reporting — κ on shared subsample only

**Shared subsample:** 10% of each queue routed to *every* active reviewer. κ/agreement computed **only** there.

Pilot sizing: 10% of 30–40 = 3–4 items, insufficient. Pilot must be 100+ items OR share 25–30% until ≥15 shared items exist. State explicitly.

Per-virtue monthly freeze: reviewed roots, raw roots, `n_labels`, κ by discipline enum, `plant_escalations`, `reviewer_unavailable` list, tree+codebook versions.

Observer audit (append-only, never gate): R1 which-root, R2 violations, root miscounts, licence leakage, blind-flag coverage, subsample routing fidelity.
