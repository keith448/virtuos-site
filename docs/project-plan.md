# VirtuOS — Comprehensive Project Plan

**Mission:** Hold the canonical, citable measure of cross-lineage human values that frontier labs use to evaluate, not to market. Reach, not moral truth.

**Current state (2026-11-08):** 1,523 live entries (10 approved, 1,513 draft), 147 retired, 985 with original text, 538 english_only, 0 labels, 0 auth users, empty core. Schema v0.5 deployed (attest pattern, column-level revoke, tradition_ids[]), handbook + charter delivered, pilot scope + outreach one-pagers ready.

---

## Goals

**12 months:** v1.0 citable spine (≥100 dual-labeled entries), scorecard v1.0, method paper DOI.
**3 years:** 3-lab consortium, custodian nonprofit, 5 virtues with κ-stable counts.
**Generation:** living standard, archives across decades, agents + embodied layer.

---

## Principles (non-negotiable)

1. One label reaches (R1 outside + R2 not author). Two labels = release policy, not codebook rule.
2. Translator ≠ builder ≠ observer. No self-certification.
3. Builder claims → observer second-pass recount from CSVs → escalation to human. Evidence, not gate.
4. Release_status derived from licence: publishable_now / research_only / unclear. Data CC BY-SA 4.0, code Apache-2.0.
5. Publish failures: empty core, κ <0.6, reviewer_unavailable. Credibility > marketing.

---

## Workstreams

### WS1 — Corpus & Provenance
- Target: Greek 1/192 → full re-source; Sanskrit 11/11 verified via Queue A
- Sanskrit pilot (11 entries): Big Pickle translator + Claude batch, Observer compares, Queue A verifies (2 readers)
- Analects: CC BY-SA decision landed; ensure v1.0 manifest cites transcription
- Retire english_only aggressively; budget Queue A at 3× Queue B

### WS2 — Review Layer (Handbook v0.5)
- Roles: SECURITY DEFINER functions only (attest_translation, cast_label, cast_adjudication). Column revoke preserves curator.
- Tradition_ids[]: interfaith reviewers representable; R1 = NONE root matches, insider counted 0
- Blinding: hide tradition/root/status/strength; show outside_your_lineage flag only
- Shared subsample: 10% (25–30% until ≥15 shared) for κ; plants excluded from κ, disagreement → Queue C
- Socialization set: 20 items keyed to curator's reading; ≥80% = learned codebook, not validity
- Critical path: first reviewer_virtue with tradition_ids[] exercised end-to-end (gate b)

### WS3 — Standard & Scorecard
- v1.0 spine: ≥100 dual-labeled, reciprocity first (6 roots raw)
- Scorecard v1.0: 30–50 disguised scenarios, 3–5 lab models scored
- Judge v1: open fine-tune (Llama/Gemma/Qwen) trained to predict human labels, agreement reported
- Reproducibility: JSONL + virtue_reach.csv + tree + codebook, LOCKSS archive, DOI

### WS4 — Communications & Outreach
- Labs (policy/evals): 30-min working session, one printed entry, pilot scope (docs/pilot-scope-reciprocity.md)
- Philanthropy: fund measurement (seed $10–50k, endowment $650k)
- University: dissemination artifact (method paper + DOI release); recruit Queue A language readers
- Funnel: signal → enrich → human-approved 1-sentence personalization → send → track reply. 2-touch, no blast. Sheet as CRM; /agent templates for outreach.
- Voice: external = warm human-story; audit = direct technical. No "aligned/human values" language.

### WS5 — Funding & Governance
- Revenue: pilot fees $25k, custodian dues $30k/yr (<33% cap), eval services, grants
- Costs: reviewer comp ($40–180/hr by tier), core 2–3 FTE, infra $3k
- Custodian: neutral host, multi-lab, RFC for codebook/tree changes, published rejection log
- Funder mix Y1: 1 lab pilot + philanthropy seed. Y3: 3 labs + grants + endowment

---

## 12-month plan (followable)

**Months 1–2: Review layer unblocked**
- [ ] Recruit Tier 1 cohort: ≥2 reviewer_virtue per pilot root + 2 Sanskrit + 2 Arabic readers (Queue A)
- [ ] Exercise gate (b) end-to-end: real sign-in → cast_label → virtue_reach 1/1, then humanize (no synthetic rows left)
- [ ] Sanskrit pilot: 11 entries, two model families, Queue A double attestation → first `verified` translations
- [ ] prereg/reciprocity.json committed (lineages/sources before collection)

**Months 3–4: Pilot labeling**
- [ ] 100 reciprocity strength-3 entries eligible
- [ ] Blind labeling: pilot shared subsample 25–30% → 15+ shared items
- [ ] Queue C primed: contested lineage cases → adjudication_votes child table
- [ ] κ computed on subsample only; reported per virtue + discipline enum

**Months 5–6: Scorecard v1**
- [ ] Disguised scenarios from verified entries (30–50)
- [ ] Run 3–5 frontier/open models; publish scoreboard — including failures
- [ ] Judge v1 ADR: choose open fine-tune family, training set = human labels only

**Months 7–9: Second virtue + methods paper**
- [ ] Gratitude pilot (2nd virtue, tests Greek/Roman merge + Japanese root)
- [ ] Case-study paper draft: codebook + tree_v1 + mercy 0 finding + κ
- [ ] LOCKSS archive of v1.0 candidate

**Months 10–12: Freeze + outreach**
- [ ] v1.0 DOI freeze (≥100 dual-labeled, core status honest — empty or not)
- [ ] Eval-wedge: 2nd lab pilot signed
- [ ] Custodian board seated (4-yr staggered, <33% lab funding cap); dues invoice pilot invoice
- [ ] P&L review: pilot burn vs dues coverage; endowment ask ($650k) finalized

---

## 3-year roadmap

- Y2: 5 virtues, 3 labs, 500 entries/virtue, embodied/agent scenarios (multi-step) drafted
- Y3: Multi-lab consortium formal, judge v1 published with agreement metrics, public scoreboard quarterly
- Failsafe: if no lab adopts by Month 18, pivot outreach to university consortium + philanthropy (still a citable standard)

---

## Metrics that matter

| Metric | Target M12 |
|--------|-----------|
| Verified entries (R3) | ≥100 |
| Labels (R1 outside) | ≥200 (100×2) |
| κ on shared subsample | Reported; substantial = core-eligible |
| Publishable sources | 119/132 (90% source, 1490 entries) closed = GRETIL + unclear excluded |
| Living coverage | reviewer_unavailable list published |

## Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| No reviewers recruited | Grant pays hourly; calibration is socialization not gate; coverage-limit stated upfront |
| Single-lab capture | <33% funding cap; <33% reviewer supply per virtue; neutral custodian |
| GRETIL NC / Wikisource SA licence trap | release_status view; CC BY-SA decision; research_only/unclear excluded |
| Reviewer numbness (Selsam) | Commit-then-reveal UI; 10% plants → Queue C; audit 1-in-20 |
| Corpus bias by one translator | ai_model recorded per entry; rotate families; observer ≠ translator |

---

## Files to read (DeepSeek review order)

1. docs/handbook.md (v0.5 canonical)
2. docs/observer-log.md
3. docs/institutional-charter.md
4. opencode.json (builder/translator/observer pins)
5. docs/codebook.md, docs/tree-v1.md
6. docs/translator-batch-prompt.md
7. docs/brief.md
8. docs/pilot-scope-reciprocity.md

## Success definition

Month 12: v1.0 is frozen, DOI'd, scored by a lab, with labels from outside the curator's lineage attesting it. If the core is still empty, we report empty — and that report is the product.

## Appendix A — Sample P&L (costed by hours, not vibes)

### Cost estimation method (why these numbers)

**Reviewer hours derived from task, not a lump sum:**
- Per-entry Queue B label: 8 min (read 4 parts + V1/V2 judgment + note). Measured from annotation literature + handbook's commit-then-note requirement.
- Queue A attestation: 12–15 min per entry per verifier (compare original vs translation, gloss key terms). Two verifiers required (R3) → double count.
- Adjudication: 45 min per contested case (read 2 labels + lineage pair + codebook).

**Hourly rates benchmarked:**
- General expert readers: $40–75/hr (folklore, teachers, community readers — academic-adjacent)
- Domain specialists: $100–180/hr (Sanskritist, Talmudist, Nahuatl speaker — scarce)
- Adjudicators (senior scholars, outside both lineages): $150–250/hr
- Blind anchor: $60/hr weighted average for pilot (mix of tiers)
- Translator benchmark: ATA $0.10–0.25/word for literary; we budget $50–100/hr for verification, 2–3× search time for low-resource languages (Ainu/Greenlandic/Zuni)

**Pilot math:**
- Queue B: 100 entries × 2 reviewers × 8 min = 26.7 hrs per reviewer → at $60/hr = $1,600/reviewer, $3,200 for 200 labels
- Queue A spot-checks: 20 entries sampled × 2 verifiers × 15 min @ $75 = $1,000–1,500
- Adjudication cap: 5 cases × 45 min @ $200 = $1,500 (allow up to $3,750 if contested)
- Infrastructure: Supabase Postgres 17 + Vercel $50/mo avg; LOCKSS/DOI ~$400/yr; eval compute 30–50 scenarios × $20–40/run

### Year 1 Pilot P&L

Revenue: Lab pilot fee $25,000 + Philanthropy seed $10,000 = $35,000
Direct: Reviewers $3,240 + Queue A $1,500 + Adjudication $3,750 + Calibration $800 = $9,290
Infra: $3,000
Core: Founder 0.5 FTE × 6mo $35,000 + legal $3,000 = $38,000
Net: –$15,290 (ex-founder +$22,710)

### Year 3 P&L

Revenue: 3 labs × ($25k pilot + $30k dues) = $165k + eval services $40k + grants $50k = $255k
Direct+core: $337k (reviewers ~$87k for 5 virtues × 500 entries × 2 labels at $65/hr; Queue A $35k; core 1.75 FTE $180k)
Net –$82k intentional deficit until dues scale; break-even ~5 dues or $500k endowment @4%

### Sensitivity

- ±50% reviewer recruitment time = ±$1,600 Year 1
- Queue A low-resource premium is the swing: Sanskrit/Arabic at $75 vs Ainu/Greenlandic at $175 = 2.3× line item
- Pilot fee is cost-plus, not margin. Custodian dues fund commons; data never sold (CC BY-SA).

## Appendix B — Outreach Playbook

### Funnel (human-approved, not auto-send)

Identity list (sheet) → Signal (system card update / paper / grant) → Enrichment dossier (1 paragraph, human-checked) → Personalize 1 sentence → Send (docs/outreach-*.md templates) → Track reply.

### Signals by audience

- Lab: new system card, new eval blog post, EU AI Act filing
- Tradition: public university dept, cultural institute, seminar page (no scraped emails)
- University: paper on cross-tradition ethics, translation dept
- Philanthropy: grants < $500k to safety evals

CRM: sheet with name, audience, target person, signal, date, status. No HubSpot needed at pilot scale.

### Sequence

Send → 10 days → one follow-up with new signal → stop. Two touches.

### Tracking

Optimize for reply from right discipline (Sanskritist > marketer). Track sent/opened (if allowed)/replied/scope-viewed. No AI fit scores.

### Automation allowed in OpenCode

- Signal watch job → append to sheet
- /agent templates: outreach_labs, outreach_philanthropy, outreach_university (human-approval gate)
- Morning brief: new leads since yesterday

### Not automated

- Tradition-leader invitations (personal or not at all)
- Objection handling (reply yourself)
- Cold blast to purchased lists

### Templates (saved)

docs/outreach-labs.md / docs/outreach-philanthropy.md / docs/outreach-university.md — spine: Reach, not moral truth. One proof (empty core), one ask (scope link), no aligned/human-values language.

