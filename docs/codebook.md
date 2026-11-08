# VirtuOS codebook

Version 0.1 — draft, not yet reviewed.

This is the rulebook for the shared-core test. It exists because a count is only
worth something if two people applying the same rules to the same material reach
the same number.

## 1. What this measures

The shared core measures **reach, not moral truth**. A virtue in the core means
that at least five lineages arrived at it independently, and that reviewers from
outside each lineage attested it. It does not mean the virtue is correct, complete,
or binding. A critic who says "widely attested is not justified" is right, and
this document does not claim otherwise.

## 2. Units

| Unit | What it is |
|---|---|
| **Entry** | One situation with a wise response, a reason it worked, and a tempting wrong answer |
| **Virtue instance** | A judgment that a specific entry teaches a specific virtue |
| **Lineage root** | The transmission ancestry a tradition descends from |
| **Label** | One reviewer's agreement or disagreement with a virtue instance |

The count uses **lineage roots**, never leaf traditions. Coptic and Anglican are
two traditions and one root.

## 3. What counts as an entry

An entry is admissible only if all of these hold:

- **E1.** It has a source with a named edition or, for film and achievement, a
  named work and date.
- **E2.** The source's `licence` is recorded.
- **E3.** The four parts are present: situation, wise response, why it worked,
  tempting wrong answer.
- **E4.** The tempting wrong answer is a real alternative a reasonable person might
  take, not a strawman.
- **E5.** For text layers, the original-language passage is stored when it is
  obtainable. If it is not obtainable, the entry may exist as a draft but cannot
  be marked verified.

## 4. What counts as a virtue instance

This is where most disagreement will happen, so the test is operational.

**V1 — The lesson test.** The virtue must be the lesson of the entry, not merely
present in it. Ask: if you removed every other virtue from the story, would the
wise response still be intelligible as an instance of *this* virtue? If not, it
is a secondary virtue at most.

**V2 — The contrast test.** The tempting wrong answer must be the opposite of the
same virtue. If the wrong answer is a failure of courage but the proposed virtue is
mercy, the entry teaches courage.

**V3 — Strength.**
- `3` — the virtue is the lesson. Counts for reach.
- `2` — the virtue is clearly present but the lesson is another virtue. Does not
  count for reach.
- `1` — the virtue is mentioned or implied only. Does not count for reach.

**V4 — Reach counts strength 3 only.** The view currently counts any label on any
`entry_virtues` row. This codebook narrows that: a virtue instance at strength 2 or
1 is recorded but is not evidence of independent convergence.

**V5 — No double counting.** One entry may carry several virtues at strength 3 only
if each passes V1 and V2 on its own. When in doubt, assign one.

## 5. What counts as a lineage root

**L1 — Root by transmission, not by similarity.** Two traditions share a root when
one derives its normative authority from the other's texts or institutions. Shared
language, region, or moral outlook is not enough.

**L2 — Merge when the corpus is shared.** Coptic and Anglican share the same
scriptures and creeds: one root. Theravada and Zen share the Buddhist canon: one
root. Aesopic and Roman fable share Aesop through Babrius and Phaedrus: one root.

**L3 — Split when the authority is independent.** Confucian and Taoist are separate
roots. Rabbinic Judaism and Samaritan tradition are separate. If two communities
would not recognize the other's founding texts as authoritative, they are separate.

**L4 — Publish the tree.** The tree is versioned (`tree_v1`) and stored in
`traditions.parent_id`. Every release states the tree version it used.

**L5 — Adjudicate, don't guess.** A disputed merge or split goes to two reviewers,
one from each side, then to a third. Until resolved, the two traditions count as
separate and the difference is recorded as contested.

## 6. Diffusion: the same story in two places

A story travelling between traditions is not independent evidence in either.

**D1.** If an entry is a known variant of a story attested elsewhere, record it in
`parallels`.
**D2.** The lineage count uses the root of the *entry's own tradition*, but a
reviewer may flag an entry as diffused. A flagged entry still counts once; it does
not count twice because two traditions tell it.

## 7. Reviewers

**R1 — Outside the lineage.** A reviewer's `tradition_id` root must differ from the
entry's root.
**R2 — Not the author.** The drafter of an entry cannot attest it.
**R3 — Language or tradition.** A reviewer must read the source language or belong
to the tradition. For translation verification, two readers of the language, at
least one from the tradition.
**R4 — Discipline matters too.** A theologian approving a folktale is not the same
as a folklorist approving it. Record the reviewer's field; report it alongside
agreement rates.

## 8. States

| State | Meaning | Counts for reach? |
|---|---|---|
| `draft` | Written, not accepted | No |
| `in_review` | Circulated to reviewers | No |
| `approved` | Editorially accepted | Only with labels |
| `translation_status = verified` | Translation checked by two readers | Separate from status |

Approval is workflow. The label is evidence.

## 9. Pre-registration and the stopping rule

The failure mode is searching until five lineages appear and calling it convergence.

**P1.** Before a virtue is collected, write `prereg/<virtue>.json` naming the
lineages to be searched and the sources to be used.
**P2.** A lineage added after collection begins is logged as post-hoc and reported
separately.
**P3.** "We stopped at five" is only meaningful if the five were named in advance.

## 10. Adjudication

**A1.** Disagreement between two reviewers goes to a third who is outside both
lineages.
**A2.** If the third disagrees with both, the entry is marked contested and excluded
from counts.
**A3.** Inter-rater agreement is reported per virtue. Below substantial agreement,
the virtue is not eligible for the core regardless of count.

## 11. Worked examples

| Case | Ruling |
|---|---|
| Luke 6:31, tagged reciprocity 3 and mercy 2 | Reciprocity counts. Mercy does not: the lesson is the Golden Rule, and the wrong answer is a failure of reciprocity. |
| The Lion and the Mouse, tagged mercy 3 and gratitude 3 | Gratitude counts. Mercy does not: the lesson is that the small can repay the great. |
| Pañcatantra 2.163, "no wealth like contentment" | Contentment counts. The wrong answer — measuring yourself against those who have more — is the opposite of contentment. |
| Coptic and Anglican both carrying Luke 6:31 | One root. Counts once. |
| Babrius and Phaedrus both carrying Aesopic fable | One root. Counts once. |
| A Cinderella variant in Germany and China | Count once unless a reviewer shows independent attestation; record in `parallels`. |

## 12. Versioning

The codebook and the tree are versioned separately. A release states both. Any
change to V1–V5 or L1–L5 requires a new version and a re-run of
`scripts/verify-reach.mjs`; counts computed under different versions are not
comparable.
