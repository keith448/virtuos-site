#!/usr/bin/env node
// Fetch the Analects from Chinese Wikisource and build a book.verse -> text map.
//
//   node scripts/fetch-analects.mjs
//
// Writes data/analects/verses.json: { "1.1": "子曰：…", ... }
// Source pages carry one <div id="一之一">'''一之一'''</div> per verse.

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const API = "https://zh.wikisource.org/w/index.php";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function raw(title) {
  const res = await fetch(`${API}?title=${encodeURIComponent(title)}&action=raw`);
  if (!res.ok) throw new Error(`${title}: HTTP ${res.status}`);
  return res.text();
}

const DIGIT = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };

function cn2int(s) {
  if (!s) return null;
  if (s.includes("十")) {
    const [tensRaw, unitsRaw] = s.split("十");
    const tens = tensRaw ? (DIGIT[tensRaw] ?? 0) : 1;
    const units = unitsRaw ? (DIGIT[unitsRaw] ?? 0) : 0;
    return tens * 10 + units;
  }
  // Digit-by-digit forms appear for 21+: 二一 = 21.
  if ([...s].every((ch) => DIGIT[ch])) {
    return Number([...s].map((ch) => DIGIT[ch]).join(""));
  }
  return null;
}

function clean(text) {
  return text
    .replace(/<ref[^>]*\/>/g, "")
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "")
    .replace(/\{\{[\s\S]*?\}\}/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, "$1")
    .replace(/\[\[([^\]]*)\]\]/g, "$1")
    .replace(/'''?/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const index = await raw("論語");
const books = [...index.matchAll(/\[\[\/([^\]|]+)\|/g)]
  .map((m) => `論語/${m[1]}`)
  .filter((t) => /第[一二三四五六七八九十]+$/.test(t));

if (books.length === 0) {
  console.error("No book links found on the index page.");
  process.exit(1);
}

const verses = {};
let pageCount = 0;

for (const title of books) {
  const text = await raw(title);
  pageCount += 1;

  // <div id="一之一" ...>'''一之一'''</div> verse text
  const re = /<div id="([^"]+)"[^>]*>\s*'''[^']*'''\s*<\/div>\s*\n([\s\S]*?)(?=\n\s*<div id="|<\/onlyinclude>|$)/g;
  for (const m of text.matchAll(re)) {
    const id = m[1];
    const parts = id.split("之");
    if (parts.length !== 2) continue;
    const book = cn2int(parts[0]);
    const verse = cn2int(parts[1]);
    if (!book || !verse) continue;
    const body = clean(m[2]);
    if (body) verses[`${book}.${verse}`] = body;
  }
  await sleep(300);
}

mkdirSync(resolve("data/analects"), { recursive: true });
writeFileSync(resolve("data/analects/verses.json"), JSON.stringify(verses, null, 2) + "\n", "utf8");

const keys = Object.keys(verses);
console.log(`pages: ${pageCount}`);
console.log(`verses: ${keys.length}`);
console.log(`first: ${keys[0]} -> ${verses[keys[0]]?.slice(0, 40)}`);
console.log(`last:  ${keys[keys.length - 1]}`);
