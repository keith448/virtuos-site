#!/usr/bin/env node
// Attach the German original (Kinder- und Hausmärchen, 7th ed., 1857) and the
// Taylor/Edwardes English retelling to the Grimm entries.
//
// The join is the KHM number. The English titles are Taylor and Edwardes'
// renderings, so the number is established once, in the table below, and every
// pair is printed for review before anything is written.
//
// Deliberately excluded: "The Miser in the Bush", a retitled and softened
// version of KHM 110 "Der Jude im Dorn". Attaching that original needs a human
// decision, not a backfill.
//
//   node scripts/attach-grimm-originals.mjs            # dry run, prints pairs
//   node scripts/attach-grimm-originals.mjs --apply    # write to Supabase
//
// Cached source pages live in data/grimm/cache/ (gitignored).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const URL_BASE = env.SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const apply = process.argv.includes("--apply");

const GRIMM_SOURCE = "0b3eb340-43b1-4870-8569-9f9d1ebb6edb";
const CACHE = "data/grimm/cache";
const GUTENBERG = "https://www.gutenberg.org/cache/epub/2591/pg2591.txt";

// English title in pg-2591 -> KHM number in the 1857 edition.
const KHM = {
  "The Golden Bird": 57,
  "Jorinda And Jorindel": 69,
  "The Travelling Musicians": 27,
  "Old Sultan": 48,
  "The Fisherman And His Wife": 19,
  "The Frog-Prince": 1,
  "The Goose-Girl": 89,
  "Fundevogel": 51,
  "Hansel And Gretel": 15,
  "The Mouse, The Bird, And The Sausage": 23,
  "Mother Holle": 24,
  "Little Red-Cap [Little Red Riding Hood]": 26,
  "The Robber Bridegroom": 40,
  "The Old Man And His Grandson": 78,
  "Sweetheart Roland": 56,
  "Snowdrop": 53,
  "The Pink": 76,
  "Ashputtel": 21,
  "The White Snake": 17,
  "The Wolf And The Seven Little Kids": 5,
  "The Queen Bee": 62,
  "The Elves And The Shoemaker": 39,
  "The Turnip": 146,
  "The Fox And The Cat": 75,
  "The Four Clever Brothers": 129,
  "Lily And The Lion": 88,
  "The Fox And The Horse": 132,
  "The Raven": 93,
  "The Golden Goose": 64,
  "The Water Of Life": 97,
  "The Seven Ravens": 25,
  "The Salad": 122,
  "King Grisly-Beard": 52,
  "Iron Hans": 136,
  "Cat-Skin": 65,
  "Snow-White And Rose-Red": 161,
};

const EDITION = (n, title) =>
  `Brüder Grimm, Kinder- und Hausmärchen, 7th ed. (Göttingen: Dieterich, 1857), KHM ${n} "${title}"; text via German Wikisource (CC BY-SA 4.0)`;

const SCHOLARLY_SOURCE =
  "Grimms' Fairy Tales, tr. Edgar Taylor and Marian Edwardes, Project Gutenberg #2591, public domain";

mkdirSync(CACHE, { recursive: true });

// ---------------------------------------------------------------- fetching

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cachedFetch(url, file) {
  const path = join(CACHE, file);
  if (existsSync(path)) return readFileSync(path, "utf8");
  for (let attempt = 0; attempt < 7; attempt++) {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "virtuOS provenance backfill (https://github.com/keith448; keith@rightlanebrands.com)",
      },
    });
    if (res.status === 429) {
      const retry = Number(res.headers.get("retry-after")) || 10;
      await sleep(retry * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    writeFileSync(path, text);
    await sleep(1000);
    return text;
  }
  throw new Error("HTTP 429 after retries");
}

// ----------------------------------------------------------------- parsing

function decode(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

function plain(html) {
  return decode(
    html
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function englishTales(text) {
  const lines = text.split(/\r?\n/);
  const headings = [];
  lines.forEach((line, i) => {
    const s = line.trim();
    if (line !== line.trim()) return; // TOC entries are indented
    if (s.length < 3 || s.length > 70) return;
    if (!/^[A-Z0-9][A-Z0-9 ,'’\-\[\]&]+$/.test(s)) return;
    if (!/[A-Z]{3}/.test(s)) return;
    headings.push({ title: s, at: i });
  });
  const tales = new Map();
  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].at + 1;
    const end = i + 1 < headings.length ? headings[i + 1].at : lines.length;
    const body = lines
      .slice(start, end)
      .join(" ")
      .replace(/\s*\*\*\* END OF THE PROJECT GUTENBERG[\s\S]*$/i, "")
      .replace(/\s*End of the Project Gutenberg[\s\S]*$/i, "")
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/\s+/g, " ")
      .trim();
    if (!tales.has(headings[i].title)) tales.set(headings[i].title, body);
  }
  return tales;
}

function germanTale(html) {
  let body = plain(html);
  const marker = body.lastIndexOf("siehe unter:");
  if (marker >= 0) {
    const after = body.slice(marker);
    const m = /\d+\.\s/.exec(after);
    body = m ? after.slice(m.index) : after;
  }
  body = body
    .replace(/^\[\s*\d+\s*\]\s*/, "")
    .replace(/\[\s*\d+\s*\]/g, "")
    .replace(/\s*Dieser Quellentext existiert auch als Audiodatei[\s\S]*$/i, "")
    .replace(/\s*Datei speichern[\s\S]*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return body;
}

// ------------------------------------------------------------------- build

const indexApi =
  "https://de.wikisource.org/w/api.php?action=parse&prop=wikitext&format=json&formatversion=2&page=" +
  encodeURIComponent("Kinder- und Hausmärchen");
const indexJson = JSON.parse(await cachedFetch(indexApi, "khm-index.json"));
const khmTitles = {};
for (const m of indexJson.parse.wikitext.matchAll(/\[\[([^\]|]+) \(1857\)\|(\d+)\]\]/g)) {
  const n = Number(m[2]);
  if (!khmTitles[n]) khmTitles[n] = m[1].trim();
}
if (Object.keys(khmTitles).length < 200) {
  console.error(`KHM index parsed only ${Object.keys(khmTitles).length} tales; refusing.`);
  process.exit(1);
}
const gutenberg = await cachedFetch(GUTENBERG, "pg2591.txt");
const tales = englishTales(gutenberg);

const pairs = [];
const skipped = [];

for (const [englishTitle, n] of Object.entries(KHM)) {
  const upper = englishTitle.toUpperCase();
  const english = tales.get(upper);
  if (!english) {
    skipped.push({ englishTitle, n, why: "English title not found in pg-2591" });
    continue;
  }
  const germanTitle = khmTitles[n];
  if (!germanTitle) {
    skipped.push({ englishTitle, n, why: `KHM ${n} not in the 1857 index` });
    continue;
  }
  const page = `${germanTitle} (1857)`;
  const api =
    "https://de.wikisource.org/w/api.php?action=parse&prop=text&format=json&formatversion=2&page=" +
    encodeURIComponent(page);
  let german;
  try {
    const json = JSON.parse(await cachedFetch(api, `khm-${n}.json`));
    if (!json.parse) throw new Error(json.error?.info ?? "no parse");
    german = germanTale(json.parse.text);
  } catch (e) {
    skipped.push({ englishTitle, n, why: `German page failed: ${e.message}` });
    continue;
  }
  pairs.push({ englishTitle, n, germanTitle, german, english });
}

console.log(`mapped: ${pairs.length}`);
console.log(`skipped: ${skipped.length}`);
for (const s of skipped) console.log(`  skip ${s.englishTitle} (KHM ${s.n}): ${s.why}`);

// Review every pair before writing. If the opening lines do not belong to the
// same tale, the mapping is wrong and the run stops.
for (const p of pairs) {
  console.log(`\nKHM ${p.n} | ${p.germanTitle} | ${p.englishTitle}`);
  console.log(`  DE ${p.german.slice(0, 150)}…`);
  console.log(`  EN ${p.english.slice(0, 150)}…`);
}

const bad = [];
for (const p of pairs) {
  if (p.german.length < 300) bad.push(`${p.englishTitle}: German too short (${p.german.length})`);
  if (p.german.length > 30000) bad.push(`${p.englishTitle}: German too long (${p.german.length})`);
  if (/Textdaten|Kategorien|Quellentext|Bearbeitungsstand/.test(p.german))
    bad.push(`${p.englishTitle}: German has page furniture`);
  if (p.english.length < 300) bad.push(`${p.englishTitle}: English too short (${p.english.length})`);
  if (/Project Gutenberg|CONTENTS:/.test(p.english))
    bad.push(`${p.englishTitle}: English has book furniture`);
}
if (bad.length) {
  console.error("\nREFUSING:");
  for (const b of bad) console.error("  " + b);
  process.exit(1);
}

if (!apply) {
  console.log("\nDry run. Re-run with --apply to write.");
  process.exit(0);
}

async function get(path) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status} ${await res.text()}`);
  return res.json();
}

async function patch(path, body) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    method: "PATCH",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status} ${await res.text()}`);
}

const entries = await get(
  `entries?source_id=eq.${GRIMM_SOURCE}&retired_at=is.null&select=id,story_title,original_text`,
);
const byTitle = new Map(entries.map((e) => [e.story_title, e]));

let wrote = 0;
for (const p of pairs) {
  const entry = byTitle.get(p.englishTitle);
  if (!entry) {
    console.log(`no entry for ${p.englishTitle}; skipping`);
    continue;
  }
  if (entry.original_text) continue;
  await patch(`entries?id=eq.${entry.id}`, {
    original_text: p.german,
    edition: EDITION(p.n, p.germanTitle),
    scholarly_translation: p.english,
    scholarly_source: SCHOLARLY_SOURCE,
    scholarly_rights: "public_domain",
    translation_notes:
      `German KHM ${p.n} "${p.germanTitle}" and the Taylor and Edwardes English ` +
      `attached by KHM number. The English is a retelling and may soften or omit ` +
      `episodes. Neither text has been checked by a German reader; ` +
      `translation_status stays working.`,
  });
  wrote++;
}
console.log(`\nApplied: ${wrote} entries updated.`);
