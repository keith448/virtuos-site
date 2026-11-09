# What a statistically useful corpus requires

The corpus has volume. It does not yet have evidence. This note puts numbers on
the gap so "elite dataset" means something checkable.

## Where it stands, 2026-11-09

| Measure | Value |
|---|---|
| Live entries | 1,522 |
| Publishable entries (release v0.1-draft) | 1,489 |
| Publishable entries holding original text | 1,129 |
| Approved entries | 10 |
| Human labels | 0 |
| Verified translations | 0 |
| Virtues | 20 |
| Lineage roots | 57 |
| Strength-3 entries per virtue | 27 to 118 |
| Largest tradition share | Islamic 700 of 1,522 (46%) |

The entry count is enough to build a pilot benchmark. It is not enough to claim
cross-lineage convergence, and it is not enough to train a judge.

## Three uses, three bars

### 1. A model scorecard

A three-option forced choice has a 33% chance baseline. With 30 to 50 items, the
95% interval on accuracy is roughly ±10 to ±15 points. That supports "model A
looks better than model B" only when the gap is large.

For a paired comparison on the same items, detecting a 10-point difference with
80% power at α = 0.05 needs roughly 300 to 400 items. A 15-point difference needs
roughly 150 to 200. Use those numbers when sizing a run. A round 50 will not
carry the claim.

Target: 600 items, 30 per virtue. Headline virtues (reciprocity, gratitude,
mercy) get 150 each so their intervals are usable.

### 2. A shared-core claim

The rule is five lineage roots, each attested by a reviewer from outside that
lineage. Ten approved strength-3 entries per root per virtue gives 50 approved
entries per virtue, and 100 outside labels at two labels each.

Target for five virtues: 250 approved entries and 500 labels. Target for all
twenty: 1,000 approved entries and 2,000 labels.

### 3. Training a judge

A fine-tune that predicts human labels needs about 1,000 labeled pairs to start,
with 10 to 20 percent held out and κ reported. Below that, the judge learns the
drafter's style.

## The bottleneck

Drafting is cheap and already done. Review is the constraint. At 8 minutes per
label and two labels per entry, 100 entries cost 26.7 reviewer-hours. The
1,000-entry target costs about 267 reviewer-hours, plus translation attestation
for the entries that carry originals.

That is the real budget line. The P&L in the project plan already prices it.

## Order of work

1. Ship the draft benchmark so the pipeline gets tested on real models. Done
   today; every score is labelled a pipeline test.
2. Recruit two `reviewer_virtue` people for reciprocity. Label 50 entries, with
   a shared subsample for κ.
3. Turn 30 reciprocity entries into disguised scenarios. Run three models.
   Publish a pilot scorecard with intervals and the label count.
4. Scale to 100 dual-labeled entries and a second virtue only after step 3
   produces a number worth reading.

## Rules that keep the numbers honest

- Report n and a 95% interval with every accuracy. A bare percentage hides the
  sample size.
- No core claim from draft entries, and no core claim from a single label.
- Report agreement per virtue. Below substantial agreement, the count does not
  enter the core, whatever its size.
- Publish the empty cells and the thin virtues. The 27-entry virtues are not
  comparable to the 118-entry ones.
