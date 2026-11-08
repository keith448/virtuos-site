#!/usr/bin/env node
// Build the audit bundle for a second-pass reviewer. Read-only.
//
//   node scripts/export-audit.mjs [outDir]
//
// Writes compact CSVs plus a 20-entry sample for codebook spot-checking. The full
// snapshot is deliberately not included: a 4 MB JSONL is not a chat attachment.

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
const outDir = resolve(process.argv[2] ?? "exports/audit");
mkdirSync(outDir, { recursive: true });

const PAGE = 1000;
async function pull(table, select = "*") {
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    const params = new URLSearchParams({ select, limit: String(PAGE), offset: String(offset) });
    const res = await fetch(`${URL_BASE}/rest/v1/${table}?${params}`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    });
    if (!res.ok) throw new Error(`${table}: HTTP ${res.status}`);
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < PAGE) break;
  }
  return rows;
}

const [entries, sources, traditions, virtues, entryVirtues, labels, labelers, reach, raw] =
  await Promise.all([
    pull("entries"),
    pull("sources"),
    pull("traditions", "id,name,parent_id"),
    pull("virtues", "id,name"),
    pull("entry_virtues"),
    pull("labels"),
    pull("labelers", "id,name,tradition_id,role,tradition_background"),
    pull("virtue_reach"),
    pull("virtue_reach_raw"),
  ]);

const byId = (rows) => new Map(rows.map((r) => [r.id, r]));
const sourceById = byId(sources);
const traditionById = byId(traditions);
const virtueById = byId(virtues);

const csvCell = (v) => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (headers, rows) =>
  [headers.join(","), ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(","))].join("\n") + "\n";

const virtueNames = new Map();
for (const ev of entryVirtues) {
  const v = virtueById.get(ev.virtue_id);
  if (!v) continue;
  if (!virtueNames.has(ev.entry_id)) virtueNames.set(ev.entry_id, []);
  virtueNames.get(ev.entry_id).push(`${v.name}:${ev.strength}`);
}

const entryRows = entries.map((e) => {
  const s = sourceById.get(e.source_id) ?? {};
  const t = traditionById.get(e.origin_tradition_id) ?? traditionById.get(s.tradition_id) ?? {};
  const vs = (virtueNames.get(e.id) ?? []).sort();
  return {
    id: e.id,
    status: e.status,
    retired_at: e.retired_at,
    layer: s.layer,
    tradition: t.name,
    language: s.original_language,
    source_title: s.title,
    source_external_id: s.external_id,
    source_author: s.author,
    date_or_era: s.date_or_era,
    rights_status: s.rights_status,
    licence: s.licence,
    citation: s.citation,
    has_original: e.original_text ? "yes" : "no",
    has_edition: e.edition ? "yes" : "no",
    has_scholarly: e.scholarly_translation ? "yes" : "no",
    has_ai_translation: e.ai_translation ? "yes" : "no",
    translation_status: e.translation_status,
    verified_by_count: (e.verified_by ?? []).length,
    narrative_form: e.narrative_form,
    agent_unit: e.agent_unit,
    beneficiary_unit: e.beneficiary_unit,
    virtues: vs.join(" "),
    story_title: e.story_title,
  };
});

const entryHeaders = Object.keys(entryRows[0] ?? {});
writeFileSync(resolve(outDir, "entries.csv"), toCsv(entryHeaders, entryRows));
writeFileSync(resolve(outDir, "traditions.csv"), toCsv(["id", "name", "parent_id"], traditions));
writeFileSync(
  resolve(outDir, "labelers.csv"),
  toCsv(["id", "name", "tradition_id", "role", "tradition_background"], labelers),
);
writeFileSync(
  resolve(outDir, "labels.csv"),
  toCsv(["id", "entry_id", "labeler_id", "virtue_id", "agrees", "notes", "created_at"], labels),
);
writeFileSync(
  resolve(outDir, "virtue_reach.csv"),
  toCsv(["virtue_id", "virtue", "traditions_reached", "reviewed_entries", "in_shared_core"], reach),
);
writeFileSync(
  resolve(outDir, "virtue_reach_raw.csv"),
  toCsv(
    ["virtue_id", "virtue", "traditions_approved", "approved_entries", "would_be_core"],
    raw,
  ),
);

// Deterministic 20-entry sample, spread across languages, for the V1/V2 spot-check.
const live = entries.filter((e) => !e.retired_at);
const byLanguage = new Map();
for (const e of live) {
  const s = sourceById.get(e.source_id) ?? {};
  const lang = s.original_language ?? "(none)";
  if (!byLanguage.has(lang)) byLanguage.set(lang, []);
  byLanguage.get(lang).push(e);
}
const langs = [...byLanguage.keys()].sort();
const sample = [];
for (let i = 0; sample.length < 20 && i < 200; i += 1) {
  const lang = langs[i % langs.length];
  const pool = byLanguage.get(lang) ?? [];
  const e = pool[Math.floor(i / langs.length)];
  if (!e) continue;
  const vs = entryVirtues.filter((ev) => ev.entry_id === e.id && ev.strength === 3);
  if (vs.length === 0) continue;
  const s = sourceById.get(e.source_id) ?? {};
  sample.push({
    id: e.id,
    story_title: e.story_title,
    language: s.original_language,
    tradition: (traditionById.get(e.origin_tradition_id) ?? traditionById.get(s.tradition_id) ?? {}).name,
    source_title: s.title,
    strength3_virtues: vs.map((v) => virtueById.get(v.virtue_id)?.name).filter(Boolean),
    situation: e.situation,
    wise_response: e.wise_response,
    why_it_worked: e.why_it_worked,
    tempting_wrong_answer: e.tempting_wrong_answer,
    original_text: e.original_text,
    scholarly_translation: e.scholarly_translation,
    ai_translation: e.ai_translation,
  });
}
writeFileSync(resolve(outDir, "sample-20.json"), JSON.stringify(sample, null, 2) + "\n");

const kb = (p) => Math.round(readFileSync(resolve(outDir, p)).length / 1024);
console.log(`Wrote ${outDir}`);
for (const f of [
  "entries.csv",
  "traditions.csv",
  "labelers.csv",
  "labels.csv",
  "virtue_reach.csv",
  "virtue_reach_raw.csv",
  "sample-20.json",
]) {
  console.log(`  ${f}  ${kb(f)} KB`);
}
console.log(`entries: ${entryRows.length} (${entryRows.filter((r) => !r.retired_at).length} live)`);
console.log(`labels: ${labels.length}`);
