#!/usr/bin/env node
// Export the VirtuOS dataset from Supabase into flat files on disk.
//
//   node scripts/export.mjs [outDir]
//
// Writes:
//   data/snapshot.jsonl   one JSON object per entry, with source, tradition,
//                         virtues and parallels embedded
//   data/coverage.json    counts by layer, language, tradition, verification
//   data/meta.json        when it ran and how many rows came back
//
// Read-only. Uses the service key, so it can see drafts as well as approved
// rows. It never writes to the database.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

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
if (!URL_BASE || !KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const outDir = resolve(process.argv[2] ?? "data");
mkdirSync(outDir, { recursive: true });

const PAGE = 1000;

async function pull(table, select = "*", order = null) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    const params = new URLSearchParams({ select, limit: String(PAGE), offset: String(offset) });
    if (order) params.set("order", order);
    const res = await fetch(`${URL_BASE}/rest/v1/${table}?${params}`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    });
    if (!res.ok) {
      console.error(`${table}: HTTP ${res.status} ${await res.text()}`);
      process.exit(1);
    }
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < PAGE) break;
  }
  return rows;
}

const [entries, sources, traditions, virtues, entryVirtues, parallels] = await Promise.all([
  pull("entries", "*", "id"),
  pull("sources", "*", "id"),
  pull("traditions", "*", "id"),
  pull("virtues", "*", "id"),
  pull("entry_virtues", "*"),
  pull("parallels", "*", "id"),
]);

const byId = (rows) => new Map(rows.map((r) => [r.id, r]));
const sourceById = byId(sources);
const traditionById = byId(traditions);
const virtueById = byId(virtues);

const virtuesByEntry = new Map();
for (const ev of entryVirtues) {
  if (!virtuesByEntry.has(ev.entry_id)) virtuesByEntry.set(ev.entry_id, []);
  const v = virtueById.get(ev.virtue_id);
  if (v) virtuesByEntry.get(ev.entry_id).push({ name: v.name, strength: ev.strength });
}

// origin_tradition_id overrides the source's tradition, matching virtue_reach.
const traditionOf = (e, s) =>
  traditionById.get(e.origin_tradition_id) ?? traditionById.get(s?.tradition_id) ?? null;

const parallelByEntry = new Map();
for (const p of parallels) {
  for (const [self, other] of [
    [p.entry_a, p.entry_b],
    [p.entry_b, p.entry_a],
  ]) {
    if (!parallelByEntry.has(self)) parallelByEntry.set(self, []);
    parallelByEntry.get(self).push({
      entry_id: other,
      virtue: virtueById.get(p.virtue_id)?.name ?? null,
      note: p.note,
    });
  }
}

const verification = (e) => {
  if (e.verified_by?.length) return "verified";
  if (e.status === "approved") return "reviewed";
  return "draft";
};

const rows = entries.map((e) => {
  const s = sourceById.get(e.source_id) ?? null;
  const t = traditionOf(e, s);
  return {
    id: e.id,
    status: e.status,
    verification: verification(e),
    layer: s?.layer ?? null,
    tradition: t?.name ?? null,
    region: t?.region ?? null,
    source: s
      ? {
          id: s.id,
          title: s.title,
          author: s.author,
          date_or_era: s.date_or_era,
          original_language: s.original_language,
          rights_status: s.rights_status,
          citation: s.citation,
          external_id: s.external_id,
        }
      : null,
    story_title: e.story_title,
    situation: e.situation,
    wise_response: e.wise_response,
    why_it_worked: e.why_it_worked,
    tempting_wrong_answer: e.tempting_wrong_answer,
    correction_moment: e.correction_moment,
    virtues: (virtuesByEntry.get(e.id) ?? []).sort((a, b) => b.strength - a.strength),
    parallels: parallelByEntry.get(e.id) ?? [],
    translation: {
      edition: e.edition,
      original_text: e.original_text,
      scholarly_translation: e.scholarly_translation,
      scholarly_source: e.scholarly_source,
      scholarly_rights: e.scholarly_rights,
      ai_translation: e.ai_translation,
      ai_model: e.ai_model,
      ai_translated_at: e.ai_translated_at,
      key_terms: e.key_terms,
      translation_notes: e.translation_notes,
      verified_by: e.verified_by,
      status: e.translation_status,
    },
    provenance: {
      draft_origin: e.draft_origin,
      drafted_by: e.drafted_by,
      source_locator: e.source_locator,
      created_by: e.created_by,
      created_at: e.created_at,
      updated_at: e.updated_at,
      retired_at: e.retired_at,
      retired_reason: e.retired_reason,
    },
  };
});

writeFileSync(resolve(outDir, "snapshot.jsonl"), rows.map((r) => JSON.stringify(r)).join("\n") + "\n");

const count = (fn) => {
  const m = new Map();
  for (const r of rows) {
    const k = fn(r);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return Object.fromEntries([...m.entries()].sort((a, b) => b[1] - a[1]));
};

const coverage = {
  total: rows.length,
  by_status: count((r) => r.status),
  by_verification: count((r) => r.verification),
  by_layer: count((r) => r.layer ?? "(none)"),
  by_language: count((r) => r.source?.original_language ?? "(none)"),
  by_tradition: count((r) => r.tradition ?? "(none)"),
  with_original_text: rows.filter((r) => r.translation.original_text).length,
  with_scholarly_translation: rows.filter((r) => r.translation.scholarly_translation).length,
  with_correction_moment: rows.filter((r) => r.correction_moment).length,
  with_named_verifier: rows.filter((r) => r.translation.verified_by?.length).length,
};

writeFileSync(resolve(outDir, "coverage.json"), JSON.stringify(coverage, null, 2) + "\n");
writeFileSync(
  resolve(outDir, "meta.json"),
  JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      project: "virtuos-dataset",
      ref: "tgfbsplvimtzoxtffkpx",
      tables: {
        entries: entries.length,
        sources: sources.length,
        traditions: traditions.length,
        virtues: virtues.length,
        entry_virtues: entryVirtues.length,
        parallels: parallels.length,
      },
    },
    null,
    2,
  ) + "\n",
);

console.log(`Wrote ${rows.length} entries to ${outDir}`);
console.log(JSON.stringify(coverage.by_verification));
console.log(JSON.stringify(coverage.by_layer));
