# Lineage tree v1

Version 1. Applied as migration `20261108201624_tree_v1`.

Every count in `virtue_reach` is computed against this tree. A release must state
the tree version it used; counts under different trees are not comparable.

## Merges applied

| Root | Children | Why |
|---|---|---|
| Christianity | Christian, Gnostic Christian (Nag Hammadi) | Both derive authority from Christian scripture and creeds, however much they disagree about canon |
| Judaism | Hebrew Bible, Rabbinic Judaism, Jewish folk tradition | One transmission: the Hebrew Bible and its rabbinic interpretation |
| Greco-Roman fable | Greek fable (Aesopic), Roman, French fable (La Fontaine) | Babrius, Phaedrus and La Fontaine all transmit Aesop |
| Japanese | Japanese, Japanese folk tradition, Japanese (Bushido) | One language and transmission, across text, folklore and film |
| Chinese | Chinese, Chinese folk tradition | One transmission, across text, folklore and film |
| Indian | Indian, Indian story literature | The Pañcatantra is part of the same Sanskrit transmission as the rest |
| British | British, English, English folk tradition | One national transmission |
| Celtic | Celtic folk tradition, Irish | Irish is a Celtic tradition |

## Deliberately not merged

These are separate roots until two reviewers, one from each side, adjudicate them
under L5. Counting them separately is the conservative choice: it can only
overstate independence, never understate it, and the overstatement is visible.

- **European folk traditions** — German, Russian, Czech, Serbian, Georgian. They
  share tale types and a printed-collection history, but not an authority. Merging
  them would assert a common source that has not been shown.
- **West African folk traditions** — Akan and neighbours, Gabon and Cameroon,
  Sierra Leone. Regional collections, not one corpus.
- **South Asian regional traditions** — Punjabi, South Indian. Regional oral
  traditions distinct from the Sanskrit literary transmission.
- **Indigenous North American, Inuit, Zuni, Navajo, Native Hawaiian, Māori, Ainu,
  Santal, Philippine.** Distinct traditions with no shared authority. Similar
  stories are recorded in `parallels`, not merged.
- **Islamic, Hindu, Buddhist, Confucian, Taoist, Stoic, Sikh.** Distinct roots.

## Effect on the counts

| Virtue | Before tree_v1 | After |
|---|---|---|
| reciprocity | 6 | 6 |
| gratitude | 4 | 3 |
| mercy | 3 | 0 |

Gratitude lost a lineage because Japanese folk and Japanese are one root. Mercy
lost one because Greek fable and Roman are one root, and lost the remaining two to
the codebook retag, which moved its tags on the Lion and Mouse, Androclus and Yang
Bao from strength 3 to 2. Mercy stands at 0.

## Changing the tree

A change requires: a new version, a stated justification for each merge or split,
two reviewers (one from each side), and a re-run of `scripts/verify-reach.mjs`.
