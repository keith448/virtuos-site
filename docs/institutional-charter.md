# VirtuOS Institutional Charter — v0.1

**Mission:** Hold the canonical, citable measure of cross-lineage human values that frontier labs use to evaluate, not to market. A model is not "aligned" because a lab says so — it is scored against this artifact, under rules nobody can rewrite mid-game.

## What it holds

1. **Citable spine** — frozen, DOI'd releases (`virtuos_v1.0`, ...). JSONL + `virtue_reach.csv` + tree + codebook. **Apache-2.0 code / CC BY-SA 4.0 data** (founder decision, 2026-11-08). `research_only` and `unclear` sources never appear in a publishable release.
2. **Scorecard** — disguised scenarios from verified entries. The eval frontier labs run.
3. **Judge signal** — open fine-tuned grader (Llama/Gemma/Qwen) trained on human labels. Labs run it cheap; humans spot-check it.

## Custodian

Neutral host (nonprofit or university), 2–3 FTE core: release manager, reviewer-pool coordinator, archive. Holds repo, DOI, keys. No single lab can veto a release or change the tree.

## Funding

Multi-lab dues (frontier labs equal share; academic/mid tier reduced) + endowment raised at v1.0. Reviewer pool paid — tradition readers, folklorists, coaches — term-limited, never >33% from one source.

## Standards process

- Codebook / tree changes via RFC: proposal, 2 reviewers one from each contested side (L5), third adjudicator, version bump, re-run verification.
- Published rejection log. Published `reviewer_unavailable` list. Published κ per virtue.
- Release train: `vMajor.Codebook.Tree`. Counts under different versions not comparable, stated on every report.

## Eval-wedge launch (12 months)

1. Freeze v1.0 spine: ≥100 verified+dual-labeled entries, reciprocity/gratitude prereg, shared 10% subsample κ.
2. Scorecard v1.0: 30–50 disguised scenarios. Run frontier + open models, publish scoreboard.
3. Judge v1: fine-tune on v1 labels, report agreement with held-out human labels.

## Preservation

Quarterly LOCKSS archive of every frozen release, including rejected entries. Format is file + JSONL + CSV, not a Supabase dependency.

## Capture resistance

No lab funds >33%. No lab supplies >33% of reviewers for any one virtue. No lab seats on release board. 4-year staggered board terms.

## Emerging AI scope

Text models first; within 5 years: multi-step agents (environment scenarios) and embodied coherence (values under observed vs unobserved — Selsam problem). Achievement layer (coaching correction moments) prioritized.

## Failure mode stated upfront

Empty core is an answer. κ < 0.6 = virtue ineligible regardless of count. `reviewer_unavailable` lineages are coverage limits, not errors. A standard that reports its own failures is believable; a dataset that only reports successes is marketing.
