# VirtuOS — Final product spec

**One-sentence shape:** `pip install virtuos-eval` + a DOI'd standard a lab can cite in a system card.

## Repo layout (frozen release)

```
virtuos_v1.0/                  # DOI'd release folder (Zenodo + LOCKSS)
  entries.jsonl                # Situation / wise response / why / wrong answer, original + edition
  virtue_reach.csv             # reviewed + raw roots per virtue
  tree_v1.json                 # lineage roots, 57 roots
  codebook_v0.5.md
  release_manifest.json        # versions, licence per entry, sha256
  scoreboard/
    virtuos_v1.0_scores.csv
    virtuos_v1.0_methods.json
```

## Eval harness

```
pip install virtuos-eval
virtue test --model <endpoint> --virtue reciprocity
# -> scorecard.pdf + scores.csv + methods.json
```

Runs disguised scenarios against any model, scores against attested choices, writes a citable scorecard. No Supabase access required.

## Reviewer client (living standard)

- `reviewer.html` — blind client. Sees layer/language/source + four parts + virtue. Hides tradition/root/status/strength.
- `reviewer_queue()` — SECURITY DEFINER function per handbook v0.5. Returns eligible pairs filtered server-side (R1 outside, R2 not author, retired excluded, already-labeled excluded).
- `docs/observer-log.md` — append-only audit trail.

Hosted at `review.virtuos.org`.

## Judge model

`hf.co/virtuos/judge-v1` — open weights (Llama/Gemma/Qwen class). Fine-tuned on human labels only. Predicts outside-reviewer verdict. Never invents virtues. Agreement with held-out κ published.

## Custodian

Neutral host (nonprofit/university). 2–3 FTE. Holds repo, DOI, keys. Multi-lab dues (<33% cap). RFC process for codebook/tree changes.

## Pitch artifacts (what DeepSeek/lab receive)

1. `docs/pitch-lab-onepager.html` — one-page, printable, Tufte-clean, live replication row
2. `docs/pilot-scope-reciprocity.md` — 6-week scope, 2 reviewers, scorecard deliverable
3. `docs/institutional-charter.md` — custodian + dues + capture resistance
4. Scoreboard mock — 5 models, same scale, small multiples (data-ink max)

## Versioning

`vMajor.Codebook.Tree`. Counts under different versions not comparable. Every release states all three.

## Preservation

JSONL + CSV + codebook is the record. Supabase is the kitchen; the frozen release is the cookbook. If the platform dies, the standard survives.
