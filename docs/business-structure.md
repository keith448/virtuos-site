# VirtuOS — Business structure

**One-sentence shape:** Free to cite, paid to measure. The corpus is a commons. The scorecard, the outsider reviewers, and the frozen standard are services anyone can buy — no one can own.

## 1. The standard (code + data)

- Code: Apache-2.0. Data: CC BY-SA 4.0.
- Frozen releases with DOI, LOCKSS archive, `release_manifest.json`.
- Share-alike is deliberate: a competitor cannot fork the release into a private eval.
- The frozen release is the asset. Supabase is infrastructure, not the product.

## 2. The custodian (who holds the keys)

Neutral host (nonprofit or university). 2–3 FTE core: release manager, reviewer-pool coordinator, archivist.

Capture caps (charter):
- No lab funds >33% of budget
- No lab supplies >33% of reviewers for any one virtue
- No lab seats on release board
- 4-year staggered board terms

RFC process for codebook/tree changes: proposal, 2 reviewers one from each side (L5), third adjudicator, version bump, re-verify.

Role separation (in `opencode.json` and bylaws): builder ≠ translator ≠ observer. No one grades their own work (mirrors R1/R2 for human reviewers).

## 3. Revenue → cost

| Revenue | Pays for |
|---------|----------|
| Lab pilot fee ($25k) | Eval runs. Lab gets a citable scorecard. |
| Custodian dues ($30k/yr) | Reviewer pool. Independent judgment is the bottleneck ($60/hr avg). |
| Eval / judge service | Running models against disguised scenarios. |
| Grants (philanthropy/university) | Queue A translation verification + method research. |

Data is never sold. Reviewer time and measurement are.

Year 1: ~$35k revenue, ~$12k direct+infra ex-founder.
Year 3: ~$255k revenue, ~$337k costs (deficit intentional; dues scale).

## 4. Why it stays effective

- Second-pass audit (observer log) — builder claims → recount → escalation. Evidence, not gate.
- Empty core is an answer. κ <0.6 = ineligible regardless of count. `reviewer_unavailable` published.
- Single-lab capture is a structural impossibility, not a promise.

## 5. What to cite

Pilot: `docs/pilot-scope-reciprocity.md`
Charter: `docs/institutional-charter.md`
Handbook: `docs/handbook.md` (v0.5 canonical)
Plan: `docs/project-plan.md` (with P&L + outreach appendices)
