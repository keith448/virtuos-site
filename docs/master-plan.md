# VirtuOS — Wisdom Dataset: Database Design and Master Plan

A dataset of how good people act, gathered across the world's traditions in five layers: scripture, ancient fables, folk tales, hero films, and real human achievement. Every entry uses the same four parts. A principle earns a place in the shared core only when several traditions reached it on their own.

## Part one: database design (Supabase)

### The entry, in plain terms

Every story, teaching, film or real event becomes an entry with four parts:

1. The situation
2. What the wise person did or said
3. Why it worked
4. The tempting wrong answer

### Tables

**traditions**: the cultures and faiths the material comes from.

| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| name | text | e.g. Buddhist, Akan, Stoic, Hasidic |
| region | text | where it lives |
| era | text | e.g. ancient, medieval, modern |
| description | text | short |

**sources**: the original work an entry comes from.

| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| title | text | e.g. Panchatantra, Seven Samurai, Rome 1960 marathon |
| layer | enum | scripture, fable, folk_tale, film, achievement |
| tradition_id | uuid | links to traditions |
| original_language | text | e.g. Sanskrit, Ge'ez, Japanese |
| date_or_era | text | when it was made or happened |
| author | text | if known |
| rights_status | enum | public_domain, own_summary, licensed |
| citation | text | where it can be checked |

Films and anything copyrighted are always `own_summary`: our own description of the moral arc, never the script.

**entries**: the heart of the dataset.

| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| source_id | uuid | links to sources |
| situation | text | part one |
| wise_response | text | part two |
| why_it_worked | text | part three |
| tempting_wrong_answer | text | part four |
| original_text | text | passage in its first language, when public domain |
| translation | text | English, with translator noted |
| correction_moment | text | optional: what the coach or teacher said after the mistake |
| status | enum | draft, in_review, approved |
| created_by | uuid | links to labelers |
| created_at | timestamp | |

**virtues**: the values entries teach (honesty, mercy, courage, humility, patience, care for the stranger).

| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| name | text | |
| description | text | plain definition |

**entry_virtues**: which virtues each entry teaches. Columns: `entry_id`, `virtue_id`, `strength` (1 to 3).

**parallels**: links between entries from different traditions that teach the same lesson. Columns: `id`, `entry_a`, `entry_b`, `virtue_id`, `note`. This table is where the common humanity shows up on the map.

**labelers**: the people doing the work. Columns: `id`, `name`, `tradition_background`, `languages`, `role` (curator, labeler, reviewer).

**labels**: each labeler's read on an entry, so no single voice decides. Columns: `id`, `entry_id`, `labeler_id`, `virtue_id`, `agrees` (yes or no), `notes`, `created_at`.

### The shared-core test, built in

A database view called `virtue_reach` counts, for each virtue, how many different traditions have approved entries teaching it. A virtue joins the shared core once it reaches a set number of traditions (start with five). Anything found in only one tradition stays in the dataset but stays out of the core. That makes the filter a rule anyone can inspect, not a personal judgment of any faith.

### Evaluation tables (phase three)

**scenarios**: test situations drawn from entries. Columns: `id`, `entry_id`, `prompt`, `rubric`, `disguised` (yes or no: whether it is written so it doesn't read as a test).

**model_runs**: each model's answer. Columns: `id`, `scenario_id`, `model_name`, `response`, `judge_score`, `human_score`, `notes`, `run_at`.

### Access

Row level security on every table. Labelers can write drafts and labels. Only reviewers can move an entry to approved. Public read access later, for approved entries only.

### Translation standard

Every entry is translated from its original language, never from the easiest English version to find. Each entry carries three versions side by side.

1. Original text, from a named edition (for example the Nestle-Aland Greek New Testament, the Vilna Talmud, the Pune critical edition of the Mahabharata).
2. Modern scholarly translation, with translator, year and edition. Older public-domain translations stand in until a modern one is added. Modern translations are usually under copyright, so the full text is stored only when public domain or licensed; otherwise the entry keeps the citation.
3. AI translation of the original, made directly from the original text, with the model and date recorded.

Key words with no clean English match stay in the original beside a short gloss (shu, dharma, anthropoi). Real ambiguity gets a translation note saying which reading was chosen and why. A translation is marked working until two readers of the language, at least one from the tradition, have verified it; both names are recorded.

Database fields on each entry: `edition`, `original_text`, `scholarly_translation`, `scholarly_source`, `scholarly_rights`, `ai_translation`, `ai_model`, `ai_translated_at`, `key_terms`, `translation_notes`, `verified_by`, `translation_status`.

## Part two: master project plan

### Phase 1: Seed the five layers

**What gets built:** the Supabase database above and a simple Vercel app for adding and reviewing entries, with the code on GitHub.

**The work:** a first set of entries in every layer, from as many traditions and original languages as possible. Golden Rule passages across faiths, Aesop next to the Panchatantra and the Jataka tales, Anansi and Nasreddin, Ikiru and Lagaan and Whale Rider, Abebe Bikila and Wilma Rudolph.

**Done when:** each layer holds enough entries from enough traditions that the first parallels start appearing on their own.

### Phase 2: Bring in the labelers

**The work:** recruit people from the traditions in the dataset, including coaches, teachers and interfaith leaders. Each entry gets read by several of them. Capture correction moments from coaches wherever possible.

**Done when:** approved entries carry agreement from labelers of more than one tradition, and the shared core starts to fill in.

### Phase 3: Build the scorecard

**The work:** turn approved entries into test scenarios, some written so they don't look like tests. Run them through models from Anthropic, OpenAI and Google. A strong model grades each answer against the rubric, and people spot-check the grading. Score answers on how the situation would actually turn out, not how good they sound.

**Done when:** there is a published scorecard of how today's models handle these situations. This is the first thing the project can share with the field.

### Phase 4: Train the judge

**The work:** fine-tune an open model (Llama, Gemma, Qwen or similar) on the approved dataset so it can grade other models' answers against the shared core. A hired engineer can run this on a fine-tuning service.

**Done when:** the judge's grades agree closely with the human labelers on scenarios it has never seen.

### Phase 5: From library to practice ground

**The work:** turn scenarios into situations a model acts inside, with choices that play out over several steps and a coach's judgment scoring how it went. This is the Hassabis step: learning by doing, beyond reading.

**Done when:** a model trained this way does measurably better on the scorecard than one trained on the library alone.

### Checks that run through every phase

- **Who is labeling** (Fei-Fei Li's question): no tradition's material approved only by outsiders.
- **Is it real or performed** (Chris Olah's question): later, test whether trained models carry these values inside, beyond how their answers sound.
- **Can it be gamed** (Paul Christiano's question): watch for answers that please the grader without being wise.
