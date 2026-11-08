# VirtuOS Observer Log

Shared append-only log between Builder (DeepSeek) and Observer (Crouton Alpha second pass).
Both append. Neither edits the other's entries. Humans resolve escalations.

Format per entry:

```
## [date] [event: migration | recompute | import | freeze]
Builder claim:
  - ...
Observer second-pass recount (own script, from CSVs only):
  - ...
Discrepancy:
  - ...
Escalation to human:
  - ...
```

Rule: chat is for discussion. This file is the record. Any claim not in this file is not audited.

---

## 2026-11-08 | Freeze
Builder claim: handbook v0.4 + charter v0.1 delivered.
Observer recount: labels=0, reviewed reach=0/20, raw reciprocity 6, gratitude 3, mercy 0. tree-v1.md claims mercy 2 — stale.
Escalation: mercy discrepancy (see brief.md: mercy 0).

## 2026-11-08 | Migration + recompute
Builder claim:
  - `20261108210220_release_status` applied. `private.release_status(licence, rights_status)` derives publishable_now / research_only / unclear; views `source_release` and `publishable_entries`. Sources: 119 publishable_now, 7 research_only, 6 unclear. Live entries publishable: 1,490 of 1,523.
  - Queue C read access required no migration. SELECT policies already exist for `authenticated` on traditions, adjudications, adjudication_votes, labels, entries and translation_attestations.
  - Four-path exercise run against the deployed functions with seven temporary auth users and labelers, then removed: outside label PASS, insider label PASS (`independence='insider'`, counted 0), R2 PASS, retired PASS. Extras: R3 language PASS, single attestation stays `working` PASS, two attestations `verified` with two uuids PASS, adjudicator sharing a root rejected PASS, disagreeing votes set `contested` PASS.
  - Replication with one live label: view 1/1, `scripts/verify-reach.mjs` 1/1, 0 mismatches. No longer vacuous.
Observer second-pass recount (own script, from CSVs only):
  - pending
Discrepancy:
  - none observed by builder
Escalation to human:
  - none

## 2026-11-08 | Documentation review
Builder claim:
  - Reviewed handbook.md (v0.5), observer-log.md, institutional-charter.md, opencode.json, codebook.md, tree-v1.md, translator-batch-prompt.md, brief.md.
Discrepancy (in observer-authored files):
  - opencode.json: builder model `deepseek/deepseek-chat` and observer model `opencode/crouton-alpha` do not resolve on this installation. Available: `opencode-go/deepseek-v4.1-flash`, `opencode/crouton-alpha-free`. Translator `opencode/big-pickle` is correct.
  - translator-batch-prompt.md: the two-family pilot names a Claude family and a GPT/Gemini family. Neither provider is configured. The only non-DeepSeek, non-Crouton model available is `opencode/big-pickle`, so a second family cannot currently be run.
  - translator-batch-prompt.md line 34: "attest_translation() x2 + trigger". There is no trigger; the flip is inside `attest_translation`.
  - observer-log freeze entry: the mercy discrepancy has no closure line. tree-v1.md is now annotated and corrected to 0.
Escalation to human:
  - institutional-charter.md: CC BY vs CC BY-SA conflict for the 202 Analects entries. Decision required before v1.0.
  - A second model family is required to run the translator rotation test.

## 2026-11-08 | Decision
Builder claim:
  - Founder approved **CC BY-SA 4.0** for the publishable data release; code remains Apache-2.0.
  - Rationale: BY-SA is the only single licence compatible with public domain, CC0, CC BY and the CC BY-SA Wikisource transcription. Commercial use remains permitted; share-alike supports the charter's capture-resistance clause.
  - `research_only` (GRETIL CC BY-NC-SA, 7 sources) and `unclear` (6 sources) stay out of any publishable release, enforced by `publishable_entries`.
  - Charter amended at the spine clause with the decision and date.
Discrepancy:
  - none
Escalation to human:
  - none

## 2026-11-08 | Config + prompt fix
Builder claim:
  - `opencode.json` model ids corrected and verified in `opencode debug config`: builder `opencode-go/deepseek-v4.1-flash`, translator `opencode/claude-opus-5-5` (session B overrides with `opencode/gpt-6.1-sol`), observer `opencode/crouton-alpha-free`. All three resolve.
  - `translator-batch-prompt.md`: pilot models named concretely; the "trigger" reference corrected to the in-function flip.
Discrepancy:
  - none
Escalation to human:
  - none

## 2026-11-08 | Gate (b) exercise
Builder claim:
  - Created a real auth user through the admin API, signed in with email and password using the publishable key, and called `rpc/cast_label` with that user's JWT. No service key on the label call.
  - Result: HTTP 200, `outside`. Labeler row role `reviewer_virtue`, `tradition_ids=[Rabbinic Judaism]`; label `independence=outside`; `virtue_reach` reciprocity 1 tradition / 1 reviewed entry.
  - The synthetic reviewer was then removed (label, labeler, auth user), so the corpus carries no fake evidence. The mechanism is proven; gate (b) still requires a human reviewer.
Discrepancy:
  - none
Escalation to human:
  - Recruit the first `reviewer_virtue`. `scripts/gate-b.mjs` is the reference implementation of the onboarding path.

## 2026-11-08 | Reviewer client
Builder claim:
  - `reviewer_queue()` added: strength-3 pairs eligible for the calling `reviewer_virtue`, filtered server-side for retired entries, entries authored by the reviewer, entries where any of the reviewer's roots matches the entry root, and pairs already labeled by them.
  - `reviewer.html`: single-file client. Signs in with the publishable key, calls `reviewer_queue()` then `cast_label()`. The client is sent only layer, language, source title and citation, the four parts, and the virtue prompt. Tradition, root, status, strength and existing labels are never sent.
  - Tested with a temporary reviewer. Rabbinic: 1,237 eligible pairs. Switched to Christian: the Christian Luke entry disappeared (0 visible), 1,232 total. Test rows removed.
Discrepancy:
  - none
Escalation to human:
  - `reviewer.html` needs `SUPABASE_KEY` filled with the publishable key before it can be used.

## 2026-11-08 | Release artifact
Builder claim:
  - `scripts/export-release.mjs` writes `release/<version>/`: `entries.jsonl`, `virtue_reach.csv`, `virtue_reach_raw.csv`, `tree.csv`, `README.md` (dataset card), `manifest.json` with sha256 per file.
  - `v0.1-draft`: 1,490 publishable entries, 57 roots, 37 languages, 952 holding original text, 0 verified, 0 in core. Excludes `research_only` and `unclear` sources by construction.
  - The card states the empty core, zero verified translations and uneven coverage, and is marked draft, not citable.
Discrepancy:
  - 952 with original in the release against 985 live overall: the 33 excluded entries (23 Coptic, 3 Gita, 7 GRETIL) carry originals but are not publishable.
Escalation to human:
  - The observer's "cannot verify" list is closed by attaching the migration files with the next bundle; the view and function definitions live there.

## 2026-11-08 | Reviewer views
Builder claim:
  - `coverage_cells` view: approved strength-3 entries per lineage root and virtue. 9 populated cells across 9 roots and 20 virtues: reciprocity 6 roots, gratitude 3.
  - `coverage.html`: matrix of roots x virtues, with the reviewed count from `virtue_reach` as a footer row. Shows 0/5 everywhere today.
  - `entry.html`: authenticated read-only entry view with the four parts, original, translations, virtues, label counts and provenance. List mode when no id is supplied.
  - `reviewer.html`: keyboard shortcuts (A agree, D disagree, S skip), progress counter, session rate. Time-on-item is displayed but not persisted; persisting needs a column on `labels`.
Discrepancy:
  - none
Escalation to human:
  - Public read-only access for approved entries is still a policy decision; the RLS policies are authenticated-only, so `entry.html` requires sign-in.
