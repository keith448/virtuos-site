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
