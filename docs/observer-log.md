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
