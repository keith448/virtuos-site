# Sources

Where bulk material comes from, what it contains, and what its licence allows.

## GRETIL

Göttingen Register of Electronic Texts in Indian Languages.
<https://gretil.sub.uni-goettingen.de/gretil.html>

- Bulk downloads: `gretil/1_sanskr.zip` (282 MB), `2_pali.zip`, `2_prakrt.zip`,
  `3_nia.zip`, `4_drav.zip`, `5_oldjav.zip`, `5_tib.zip`, `6_sres.zip`.
- The Sanskrit archive holds 3,803 files: TEI XML, HTML, and plain text.
  Plain text is UTF-8 IAST with diacritics.
- Each file opens with a header naming the edition and the inputter, which is
  exactly what the translation standard asks for.
- **Licence: CC BY-NC-SA 4.0.** Non-commercial. This is the constraint.

Extracted so far, in `data/gretil/` (gitignored):

| File | Text | Edition |
|---|---|---|
| `sa_viSNuzarman-paJcatantra.txt` | Pañcatantra | Ramchandra Jha, 6th ed., Varanasi 1991 |
| `sa_nArAyaNa-hitopadeza.txt` | Hitopadeśa | see file header |
| `sa_AryazUra-jAtakamAlA.txt` | Āryaśūra, Jātakamālā | see file header |

### The licence problem

CC BY-NC-SA forbids commercial use. AI labs are commercial, so a dataset carrying
GRETIL text inherits that restriction. Three ways to handle it:

1. **Accept it.** Licence the dataset CC BY-NC-SA and accept that commercial labs
   may not use it.
2. **Internal only.** Use GRETIL for drafting and verification; publish original
   text only where a public-domain edition exists.
3. **Per-source licence.** `sources.licence` records the exact terms per source,
   defaulting to public domain, and NC rows are marked. The dataset licence is
   decided at release, and the published file can exclude NC rows.

Currently doing (3): the column exists and every source now carries a licence.

## Chinese Wikisource

<https://zh.wikisource.org/wiki/論語>

- One page per book, one `<div id="一之一">` per verse, so book.verse is explicit.
- Transcription licence: CC BY-SA 4.0. The underlying text is public domain.
- Used to attach Chinese originals to the 200 Analects entries: `scripts/fetch-analects.mjs`
  builds `data/analects/verses.json` (501 verses), `scripts/backfill-analects.mjs`
  matches by `story_title` and writes `original_text` and `edition`.

## Still to wire

- **Perseus / Scaife** — Greek and Latin with editions.
- **CBETA / Kanripo** — Chinese Buddhist, Taoist, Confucian canons.
- **African Storybook / StoryWeaver** — thousands of stories in African and
  Indian languages, CC BY.
- **Wikidata / Olympedia / Nobel API** — candidate lists for film and achievement.
