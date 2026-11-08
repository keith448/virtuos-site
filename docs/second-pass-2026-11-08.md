# Second-pass note — 2026-11-08 (Crouton Alpha)

Peer feedback, not independent check. Mechanical only. No recommendations to change data. Evidence about process, not virtue.

Row counts read back:
- entries.csv: 1,670 incl header (1,669 data) = 1,523 live, 147 retired
- source_release.csv: 132 rows (119 publishable_now / 7 research_only / 6 unclear sources)
- labels.csv: header only, 0 labels
- traditions.csv: 73 rows (16 with parent_id)
- virtue_reach.csv: 20 rows
- virtue_reach_raw.csv: 20 rows
- labelers.csv: 1 row (Keith Schroeder, curator, tradition_ids empty)
- sample-20.json: 20 entries

## A. Provenance

- 985 of 1,523 live hold original text (has_original='yes'). 538 english_only.
- Classical Chinese 202/202 now hold originals (Analects Chinese Wikisource BY-SA transcription). Up from 2/202 previously.
- Live licences: public domain 1,247; Chinese Wikisource CC BY-SA 4.0 200; own summary 33; CC0 10; licensed (terms not recorded) 23; GRETIL CC BY-NC-SA 7; gita digitisation not recorded 3.
- By entry: 1,490 publishable / 7 research_only / 26 unclear = 1,523. Source-level: 119/7/6.
- No publishable_now source carries GRETIL or licensed (terms not recorded). No leakage visible at source level. View-level isolation cannot be checked from CSVs alone.

## B. Blind recount

Own recomputation from labels.csv + traditions.csv:
- labels header only by design — 0 rows is the finding.
- Reviewed reach: 0/20 virtues, all in_shared_core=false. Matches virtue_reach.csv.
- Raw reach (strength-3 approved): reciprocity 6, gratitude 3, mercy 0. Matches virtue_reach_raw.csv.
- labelers.csv single row curator with empty tradition_ids — no reviewer satisfies R1 (NONE of roots match).

## C. Codebook spot-check — sample-20.json

Per Amendment 3, V1 (lesson) and V2 (contrast) are human cultural judgment and are escalated, not graded.

Mechanical presence:
- 20/20 E3 four parts present
- 5/20 original_text present: Riyad 1852 (b8e22854 mercy), Talmud Shabbat 31a (f6df80c5 reciprocity), Amos 5:10-12 (5cd527d0 justice), Quran 2:11-12 (ef476a70 humility), Analects 15.24 (3c7b6fd2 reciprocity)
- 15/20 original_text null (E5 flag): 5245c7c9, d4c1f7b9, 3ed08e0b, 9689a7e8, fd668530, c56df274, 47c66af5, 8afb0bbb, bbe665a2, 83514ff1, f4988365, 8da9857c, 81792bd1, f88e8349, 98ed74d7

## D. Licence

Founder decision on file: data CC BY-SA 4.0, code Apache-2.0.
publishable_now (119 sources) contains public domain, CC0, own summary, and 200 Analects BY-SA entries.
No publishable_now source carries terms incompatible with BY-SA: no CC BY-NC-SA (GRETIL 7 are research_only), no unclear.
Licence check passes; legal confirmation recommended.

## E. Log verification

1. 147 retired / 1,523 live / 985 held / 538 english_only / 10 approved — supported
2. Reviewer schema deployed — partially supported at CSV level (tradition_ids present, labels header-only)
3. release_status 119/7/6 sources, 1,490/1,523 entries — supported
4. Founder CC BY-SA decision — supported in log, CSV values consistent
5. Gate (b) proven then removed, 0 labels 0 auth users — supported (0 labels, 1 labeler)
6. reviewer_queue()/reviewer.html, Rabbinic 1,237 eligible — cannot verify from CSVs (client not in bundle)
7. Four-path exercise PASS — cannot verify (test rows removed by design)

## What I could not check

- DB view SQL (virtue_reach / publishable_entries not in bundle)
- release_status refresh timing after Analects attach
- reviewer_queue()/reviewer.html/gate-b.mjs behaviour
- labels.independence column existence (0-row CSV)
- κ, calibration, planted errors — not built, 0 labels

## Escalation list

1. Recruit first reviewer_virtue with tradition_ids[] set
2. Analects BY-SA compatibility — legal confirm
3. V1/V2 human judgment for 20 sampled entries
4. reviewer.html SUPABASE_KEY needed
5. unclear sources (6 sources / 26 entries) blocked from publishable
