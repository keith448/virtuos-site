#!/usr/bin/env node
// Attach the Chinese original to the 200 Analects entries, using the
// book.verse map built by scripts/fetch-analects.mjs.
//
//   node scripts/backfill-analects.mjs          # dry run
//   node scripts/backfill-analects.mjs --apply  # write
//
// Matching is by story_title ("Analects 1.1"). Read the dry run before applying.

import { readFileSync } from "node:fs";

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

const verses = JSON.parse(readFileSync("data/analects/verses.json", "utf8"));

const EDITION =
  "Analects, Chinese text from Chinese Wikisource (論語), CC BY-SA 4.0 transcription; English tr. James Legge, public domain";

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

const sources = await get(`sources?external_id=eq.pg-3330&select=id,title,licence`);
const source = sources[0];
if (!source) {
  console.error("Source pg-3330 not found.");
  process.exit(1);
}

const entries = await get(
  `entries?source_id=eq.${source.id}&retired_at=is.null&select=id,story_title,original_text`,
);

const matched = [];
const unmatched = [];
for (const e of entries) {
  const m = /Analects\s+(\d+)\.(\d+)/.exec(e.story_title ?? "");
  if (!m) {
    unmatched.push({ id: e.id, title: e.story_title, why: "no book.verse in title" });
    continue;
  }
  const key = `${Number(m[1])}.${Number(m[2])}`;
  const text = verses[key];
  if (!text) {
    unmatched.push({ id: e.id, title: e.story_title, why: `verse ${key} not parsed` });
    continue;
  }
  matched.push({ id: e.id, title: e.story_title, key, text });
}

console.log(`entries: ${entries.length}`);
console.log(`matched: ${matched.length}`);
console.log(`unmatched: ${unmatched.length}`);
for (const u of unmatched.slice(0, 10)) console.log(`  ${u.title} — ${u.why}`);
if (matched[0]) console.log(`sample ${matched[0].key}: ${matched[0].text.slice(0, 50)}`);

if (!apply) {
  console.log("\nDry run. Re-run with --apply to write.");
  process.exit(0);
}

for (const row of matched) {
  await patch(`entries?id=eq.${row.id}`, {
    original_text: row.text,
    edition: EDITION,
  });
}
await patch(`sources?id=eq.${source.id}`, {
  licence:
    "Chinese text public domain; transcription from Chinese Wikisource (CC BY-SA 4.0). English tr. James Legge, public domain",
});

console.log(`\nApplied: ${matched.length} entries updated.`);
