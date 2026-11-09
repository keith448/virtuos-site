#!/usr/bin/env node
// Attach the Greek original (Chambry) and Townsend's 1867 English to the
// Aesopic fables, using the three concordant numbers the source pages state:
//
//   entry "The Mole and His Mother"
//        -> Townsend 16  (mythfolklore.net/aesopica/townsend/16.htm)
//        -> Perry 214
//        -> Chambry 326  (mythfolklore.net/aesopica/chambry/326.htm)
//
// Title is the join key, because the corpus locator follows the Gutenberg order
// and drifts from the Aesopica index after fable 288. Each number is read from
// the page, not guessed. Ties go to the lowest Chambry number; fables with no
// Chambry text are reported and left alone.
//
//   node scripts/attach-aesop-originals.mjs            # dry run, writes report
//   node scripts/attach-aesop-originals.mjs --apply    # write to Supabase
//
// Cached HTML lives in data/aesop/cache/ (gitignored).

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

const AESOP_SOURCE = "09379a4d-05a5-4d56-9584-ec041b6b8bf1";
const CACHE = "data/aesop/cache";
const TOWNSEND_MAX = 312;
const CHAMBRY_MAX = 358;

const EDITION =
  "Chambry, Ésope: Fables (Les Belles Lettres, 1925–1926; standard single-volume numeration), Greek text as digitised by the Aesopica project";
const SCHOLARLY_SOURCE =
  "George Fyler Townsend, Three Hundred Æsop's Fables (George Routledge and Sons, 1867), public domain";

mkdirSync(CACHE, { recursive: true });

// ---------------------------------------------------------------- fetching

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url, file) {
  const path = join(CACHE, file);
  if (existsSync(path)) return readFileSync(path, "utf8");
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "virtuOS provenance backfill (one-off)" },
      });
      if (res.status === 404) {
        writeFileSync(path, "");
        return "";
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      writeFileSync(path, text);
      await sleep(120);
      return text;
    } catch (e) {
      if (attempt === 3) throw e;
      await sleep(1000 * (attempt + 1));
    }
  }
}

function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }
  return Promise.all(Array.from({ length: limit }, worker)).then(() => out);
}

// ----------------------------------------------------------------- parsing

function contentBlock(html) {
  const m = html.match(
    /InstanceBeginEditable name="content" -->([\s\S]*?)<!-- InstanceEndEditable/,
  );
  return m ? m[1] : "";
}

function textOf(html) {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;|&#32;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&mdash;|&ndash;/g, "—")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitle(t) {
  return t
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseTownsend(html) {
  const body = contentBlock(html);
  const first = body.split(/<\/p>/i)[0] ?? "";
  const head = textOf(first);
  const title = head
    .replace(/^(Townsend\s+)?\d+\.\s*/i, "")
    .replace(/\s*\(\s*Perry[\s\S]*$/i, "")
    .trim();
  const perry = /Perry\s+(\d+)/i.exec(head);
  const rest = body.split(/<\/p>/i).slice(1).join("</p>");
  const english = textOf(rest);
  return {
    title,
    perry: perry ? Number(perry[1]) : null,
    english: english.length > 40 ? english : null,
  };
}

function parseChambry(html) {
  const block = contentBlock(html);
  const head = /Chambry\s+(\d+)\s*=\s*<a[^>]*>Perry\s+(\d+)/i.exec(block);

  let body = block
    .replace(/Chambry\s+\d+\s*=\s*<a[^>]*>Perry\s+\d+<\/a>/i, "")
    .replace(/<p[^>]*>\s*<\/p>/i, "");
  const variantIdx = body.search(/\(variant/i);
  const titleMatch =
    /<h3 class="greek">([\s\S]*?)<\/h3>/i.exec(body) ??
    /<b>\s*<span class="greek">([\s\S]*?)<\/span>\s*<\/b>/i.exec(body) ??
    /<p[^>]*>\s*<b>([\s\S]*?)<\/b>\s*<\/p>/i.exec(body);
  const titleIdx = titleMatch ? titleMatch.index : -1;

  // Some pages print only Chambry's first-edition variant: either the standard
  // text is elided as "[...]" or the "(variant version...)" note comes before
  // the title. Those are marked so the edition claim stays exact.
  const omitted = body.includes("[...]");
  const variantOnly = variantIdx >= 0 && titleIdx >= 0 && variantIdx < titleIdx;
  const isVariant = omitted || variantOnly;

  let region = isVariant ? body.slice(titleIdx >= 0 ? titleIdx : 0) : body.slice(0, variantIdx >= 0 ? variantIdx : undefined);
  region = region
    .replace(/<h3 class="greek">[\s\S]*?<\/h3>/i, "")
    .replace(/<b>\s*<span class="greek">[\s\S]*?<\/span>\s*<\/b>/i, "")
    .replace(/<p[^>]*>\s*<b>[\s\S]*?<\/b>\s*<\/p>/i, "")
    .replace(/<a[^>]*>\s*<img[^>]*>\s*<\/a>/gi, "");
  // Editorial notes mark where our text of interest ends.
  region = region.split(/\((?:variant version|this version)[\s\S]*$/i)[0];
  const greek = textOf(region);

  return {
    chambry: head ? Number(head[1]) : null,
    perry: head ? Number(head[2]) : null,
    greekTitle: titleMatch ? textOf(titleMatch[1]) : null,
    greek: greek.length > 40 ? greek : null,
    variant: isVariant,
  };
}

// ------------------------------------------------------------------ scrape

console.log("scraping concordance pages (cached)…");
const townsend = await pool(
  Array.from({ length: TOWNSEND_MAX }, (_, i) => i + 1),
  4,
  async (n) => {
    const html = await fetchText(
      `http://mythfolklore.net/aesopica/townsend/${n}.htm`,
      `townsend-${n}.html`,
    );
    return html ? { n, ...parseTownsend(html) } : { n, title: null, perry: null, english: null };
  },
);
const chambry = await pool(
  Array.from({ length: CHAMBRY_MAX }, (_, i) => i + 1),
  4,
  async (n) => {
    const html = await fetchText(
      `http://mythfolklore.net/aesopica/chambry/${n}.htm`,
      `chambry-${n}.html`,
    );
    return html ? { n, ...parseChambry(html) } : { n, perry: null, greek: null };
  },
);

const chamByPerry = new Map();
for (const c of chambry) {
  if (c.perry == null) continue;
  if (!chamByPerry.has(c.perry)) chamByPerry.set(c.perry, []);
  chamByPerry.get(c.perry).push(c);
}

// -------------------------------------------------------------- db reading

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
  `entries?source_id=eq.${AESOP_SOURCE}&retired_at=is.null&select=id,story_title,source_locator,original_text,scholarly_translation`,
);

// -------------------------------------------------------------------- join

const matched = [];
const skipped = [];

// Title is the reliable key; the locator only disambiguates duplicate titles.
const townByTitle = new Map();
for (const t of townsend) {
  if (!t.title) continue;
  const k = normalizeTitle(t.title);
  if (!townByTitle.has(k)) townByTitle.set(k, []);
  townByTitle.get(k).push(t);
}

for (const e of entries) {
  const m = /^21-(\d{4})$/.exec(e.source_locator ?? "");
  const locatorN = m ? Number(m[1]) : null;
  const candidates = townByTitle.get(normalizeTitle(e.story_title)) ?? [];
  if (candidates.length === 0) {
    skipped.push({ ...e, why: `title not found in the Townsend index` });
    continue;
  }
  const t =
    candidates.length === 1
      ? candidates[0]
      : candidates.reduce((a, b) =>
          Math.abs(a.n - locatorN) <= Math.abs(b.n - locatorN) ? a : b,
        );
  if (t.perry == null) {
    skipped.push({ ...e, why: `Townsend ${t.n} has no Perry number` });
    continue;
  }
  const chambryCandidates = chamByPerry.get(t.perry) ?? [];
  if (chambryCandidates.length === 0) {
    skipped.push({ ...e, why: `Perry ${t.perry} absent from the Chambry selection` });
    continue;
  }
  const c = chambryCandidates.reduce((a, b) => (a.n <= b.n ? a : b));
  if (!c.greek) {
    skipped.push({ ...e, why: `Chambry ${c.n} has no digitised Greek text` });
    continue;
  }
  matched.push({
    entry: e,
    townsend: t,
    chambry: c,
    tied: chambryCandidates.length > 1,
    locatorOff: locatorN != null && locatorN !== t.n ? t.n - locatorN : 0,
  });
}

// ------------------------------------------------------------------ report

const REPORT = "data/aesop/report.csv";
const esc = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
const lines = [
  ["locator", "entry_title", "townsend_no", "townsend_title", "perry", "chambry", "greek_title", "variant", "status", "locator_offset"].join(","),
];
for (const r of matched) {
  lines.push(
    [
      r.entry.source_locator,
      esc(r.entry.story_title),
      r.townsend.n,
      esc(r.townsend.title),
      r.townsend.perry,
      r.chambry.n,
      esc(r.chambry.greekTitle),
      r.chambry.variant ? "variant" : "standard",
      r.tied ? "matched (perry tie; lowest Chambry used)" : "matched",
      r.locatorOff,
    ].join(","),
  );
}
for (const s of skipped) {
  lines.push(["", esc(s.story_title), s.source_locator ?? "", "", "", "", "", "", esc(s.why), ""].join(","));
}
writeFileSync(REPORT, lines.join("\n") + "\n");

console.log(`entries: ${entries.length}`);
console.log(`matched: ${matched.length} (${matched.filter((r) => r.chambry.variant).length} from Chambry's first-edition variant)`);
console.log(`skipped: ${skipped.length}`);
const reasons = {};
for (const s of skipped) reasons[s.why.replace(/:.*/, "")] = (reasons[s.why.replace(/:.*/, "")] ?? 0) + 1;
console.log("skip reasons:", reasons);
for (const s of skipped) console.log(`  ${s.story_title} — ${s.why}`);
console.log(`\nreport: ${REPORT}`);
if (matched[0]) {
  console.log(`\nsample ${matched[0].entry.source_locator}:`);
  console.log(`  ${matched[0].townsend.title} / Perry ${matched[0].townsend.perry} / Chambry ${matched[0].chambry.n}`);
  console.log(`  ${matched[0].chambry.greek.slice(0, 120)}…`);
}

// Guards: refuse to write a text that looks truncated, entity-encoded or
// contaminated by the site's boilerplate. Run in dry mode too.
for (const r of matched) {
  const g = r.chambry.greek;
  const en = r.townsend.english ?? "";
  const bad = [];
  if (g.length < 60) bad.push(`greek too short (${g.length})`);
  if (g.length > 4000) bad.push(`greek too long (${g.length})`);
  if (/[&<>]/.test(g)) bad.push("greek has markup/entities");
  if (/variant|Chambry|Perry/i.test(g)) bad.push(`greek has editorial text: ${g.match(/.{0,40}(variant|Chambry|Perry).{0,40}/i)?.[0]}`);
  if (en.length < 60) bad.push(`english too short (${en.length})`);
  if (/George Fyler|InstanceBegin|http/i.test(en)) bad.push("english has site boilerplate");
  if (bad.length) {
    console.error(`REFUSING ${r.entry.story_title}: ${bad.join("; ")}`);
    process.exit(1);
  }
}

if (!apply) {
  console.log("\nDry run. Re-run with --apply to write.");
  process.exit(0);
}

let wrote = 0;
for (const r of matched) {
  if (r.entry.original_text) continue;
  await patch(`entries?id=eq.${r.entry.id}`, {
    original_text: r.chambry.greek,
    edition: r.chambry.variant
      ? "Chambry, Ésope: Fables, first-edition variant (Les Belles Lettres, 1925–1926), Greek text as digitised by the Aesopica project"
      : EDITION,
    scholarly_translation: r.townsend.english,
    scholarly_source: SCHOLARLY_SOURCE,
    scholarly_rights: "public_domain",
    translation_notes:
      `Greek original and Townsend's 1867 English attached by number: ` +
      `Townsend ${r.townsend.n} = Perry ${r.townsend.perry} = Chambry ${r.chambry.n}` +
      `${r.chambry.variant ? " (first-edition variant; the standard single-volume text is not digitised on the source page)" : ""}` +
      `${r.tied ? "; more than one Chambry text carries this Perry number, the lowest was used" : ""}. ` +
      `Townsend translated the Greek vulgate; wording may differ in detail from the Chambry text. ` +
      `Neither text has been checked by a reader of Greek; translation_status stays working.`,
  });
  wrote++;
}
console.log(`\nApplied: ${wrote} entries updated.`);
