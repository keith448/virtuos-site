# VirtuOS — brief

Start here. One page on what exists, what's true, and what's next.

## What it is

A dataset of how good people act, in five layers — scripture, ancient fables, folk
tales, hero films, real achievement. Every entry has the same four parts: situation,
wise response, why it worked, tempting wrong answer. A virtue joins the **shared
core** only when at least five **lineages** reached it independently, each attested
by a reviewer from outside that lineage.

Full design: [master-plan.md](./master-plan.md).

## Where it lives

| | |
|---|---|
| Supabase project | `virtuos-dataset` — ref `tgfbsplvimtzoxtffkpx`, us-east-1, Postgres 17 |
| Organization | VirtuOS |
| Schema source | `supabase/migrations/` — 15 files, recovered from the database |
| Data snapshot | `data/snapshot.jsonl`, from `scripts/export.mjs` (gitignored) |
| App code | none yet |
| Git remote | none yet |

## State, 2026-11-08

- 1,522 live entries: 10 approved, 1,512 draft, 0 in review. 148 retired.
- Provenance: 1,162 entries hold their original-language text; **360 are english_only**
  — drafted from a translation, no original held. `entry_provenance` reports this per
  entry. Held: Arabic 700/700, Classical Chinese 202/202, Ancient Greek 142/192,
  German 36/36, Coptic 23/23, Hebrew 14/14, Sanskrit 11/11, Pali 10/10. Not held:
  Greek 50/192, Russian 0/36, English 0/27, Georgian 0/23, Punjabi 0/23,
  Inuit 0/22, Tamil 0/19.
- Aesop: 141 fables now carry Chambry's Greek and Townsend's 1867 English, joined by
  the Townsend, Perry and Chambry numbers the corpus already implies. Sixteen use
  Chambry's first-edition variant because the standard text is not digitised on the
  source page. Fifty remain without Greek: 46 have Perry numbers the digitised
  Chambry selection does not carry, and 4 have no Perry number at all. None has been
  read by a Greek speaker; `translation_status` stays `working` for all of them.
- Grimm: 36 live tales carry the 1857 German text and the Taylor and Edwardes English,
  joined by KHM number. The thirty-seventh was retired. `The Miser in the Bush` is a
  retitled, softened KHM 110, `Der Jude im Dorn`, and the entry uses only the opening
  act of generosity from a tale whose plot turns on anti-Jewish violence. The record
  is kept with the reason on the entry. The German text has not been read by a German
  speaker.
- Sanskrit: 11 entries, all carrying original text and a named edition; none verified.
- Pali: 10 Dhammapada entries carry the Pali and Sujato's CC0 translation. The 147
  older Jataka entries were retired as unprovenanced and are excluded from counts.
- All five layers populated. Film 12, achievement 20. Achievement now carries
  patience, contentment, prudence, mercy and reciprocity; six virtues still absent
  there: compassion, gratitude, honesty, keeping promises, loyalty, respect for elders.
- **Shared core: empty.** Under the codebook's strength-3 rule and tree v1, only
  reciprocity reaches five lineages (6). Gratitude falls to 3. Mercy falls to
  **0** — every current mercy entry is really about repayment or gratitude.
- 20 virtues, 73 traditions (57 roots), 132 sources, 21 parallels.
- 3 auth users, 3 labeler rows: Keith (`curator`), Nicki (`reviewer_virtue`,
  Catholic), and a throwaway test row (`reviewer_virtue`, Rabbinic Judaism).
  `labels` is empty. `scenarios` and `model_runs` are empty.

## What's true that the plan doesn't say

1. **The core is empty by design, not by accident.** `virtue_reach` now requires an
   agreeing label from a labeler **none of whose roots** matches the entry's root,
   and who is not the entry's author. `virtue_reach_raw` keeps the unreviewed count.
2. **Raw reach overstates.** The "convergences" rest on 10 approved stories, six of
   them counted twice. Every mercy entry is also a gratitude or reciprocity entry
   at equal or higher strength — so mercy is a second reading of stories about
   repayment, not independent evidence.
3. **Two accounts can sign in, and neither has labeled.** Three auth users and three
   labeler rows: Keith (`curator`), Nicki (`reviewer_virtue`, Catholic), and a
   throwaway test row (`reviewer_virtue`, Rabbinic Judaism). `private.my_role()`
   resolves from `auth.uid()`, and the rows are now claimed. The core is empty
   because no label has been cast, not because access is blocked. Remove the
   throwaway row before any release.
4. **The database wasn't rebuildable.** `private.coptic_staging` and
   `private.raw_docs` existed with no migration. Recovered in
   `20261108050000_baseline_staging_tables.sql`.
5. **The plan is behind the schema.** `entries.translation` and `entries.translator`
   were dropped for the three-part translation standard (`edition`, `scholarly_*`,
   `ai_*`). The master plan still lists the old columns.
6. **Approval leaves no trace.** `status` has no author and no date. The label is
   now the evidence; `status` is only workflow.
7. **Lineages are assigned, provisionally.** `tree_v1` merged eight groups and left
   the rest as separate roots: 73 tradition rows, 57 roots. The merges are documented
   in `docs/tree-v1.md`; contested nodes are listed there and still need reviewers
   from each side.
8. **The Aesop locators are Gutenberg positions.** `source_locator` follows the
   Gutenberg edition, whose fable order drifts from the Aesopica Townsend index
   after fable 288. The Greek backfill joined on title, then followed Townsend to
   Perry to Chambry. The number in `translation_notes` is the Aesopica one and will
   not always match the locator.

## Next

Record reviews, not approvals. The first reviewer is onboarded: Nicki, Catholic,
who can label 29 of the 30 reciprocity entries. Add one Islamic and one Confucian
reviewer; those three cover every entry with two outside labels. Then the
reciprocity batch. The reviewer queues are deployed: `cast_label`,
`attest_translation`, `cast_adjudication`, with direct writes revoked. Then the
core fills honestly — or stays empty, which is also an answer.

## Open questions

- Is the output a published Hugging Face dataset, the review platform, or both?
- `origin_tradition_id` is set on 0 entries today; it overrides the source's
  tradition in `virtue_reach`. If set carelessly, core membership moves.
- Which `tree_v1` merges survive review? European folk traditions, the West African
  collections and the Gnostic root are deliberately unmerged. Each needs two
  reviewers, one from each side.
