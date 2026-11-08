#!/usr/bin/env node
// Build the publishable release artifact: the citable spine.
//
//   node scripts/export-release.mjs [version]
//
// Writes release/<version>/ with entries.jsonl, virtue_reach.csv,
// virtue_reach_raw.csv, tree.csv, README.md (dataset card) and manifest.json
// with sha256 checksums. Only publishable_now sources are included.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const version = process.argv[2] ?? "v0.1-draft";
const outDir = resolve("release", version);
mkdirSync(outDir, { recursive: true });

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
const PAGE = 1000;

async function pull(table, select = "*") {
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    const params = new URLSearchParams({ select, limit: String(PAGE), offset: String(offset) });
    const res = await fetch(`${URL_BASE}/rest/v1/${table}?${params}`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    });
    if (!res.ok) throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`);
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < PAGE) break;
  }
  return rows;
}

const [entries, sources, traditions, virtues, entryVirtues, parallels, release, reach, raw] =
  await Promise.all([
    pull("publishable_entries"),
    pull("sources"),
    pull("traditions", "id,name,parent_id,region,era"),
    pull("virtues", "id,name,description"),
    pull("entry_virtues"),
    pull("parallels", "id,entry_a,entry_b,virtue_id,note"),
    pull("source_release", "id,title,rights_status,licence,release_status"),
    pull("virtue_reach"),
    pull("virtue_reach_raw"),
  ]);

const byId = (rows) => new Map(rows.map((r) => [r.id, r]));
const sourceById = byId(sources);
const traditionById = byId(traditions);
const virtueById = byId(virtues);
const releaseById = byId(release);

const virtuesByEntry = new Map();
for (const ev of entryVirtues) {
  const v = virtueById.get(ev.virtue_id);
  if (!v) continue;
  if (!virtuesByEntry.has(ev.entry_id)) virtuesByEntry.set(ev.entry_id, []);
  virtuesByEntry.get(ev.entry_id).push({ name: v.name, strength: ev.strength });
}

const parallelByEntry = new Map();
for (const p of parallels) {
  for (const [self, other] of [[p.entry_a, p.entry_b], [p.entry_b, p.entry_a]]) {
    if (!parallelByEntry.has(self)) parallelByEntry.set(self, []);
    parallelByEntry.get(self).push({ entry_id: other, virtue: virtueById.get(p.virtue_id)?.name ?? null, note: p.note });
  }
}

const rows = entries.map((e) => {
  const s = sourceById.get(e.source_id) ?? {};
  const t = traditionById.get(e.origin_tradition_id) ?? traditionById.get(s.tradition_id) ?? {};
  return {
    id: e.id,
    layer: s.layer ?? null,
    tradition: t.name ?? null,
    language: s.original_language ?? null,
    source: {
      title: s.title ?? null,
      author: s.author ?? null,
      date_or_era: s.date_or_era ?? null,
      citation: s.citation ?? null,
      licence: releaseById.get(s.id)?.licence ?? s.licence ?? null,
    },
    story_title: e.story_title,
    situation: e.situation,
    wise_response: e.wise_response,
    why_it_worked: e.why_it_worked,
    tempting_wrong_answer: e.tempting_wrong_answer,
    correction_moment: e.correction_moment,
    virtues: (virtuesByEntry.get(e.id) ?? []).sort((a, b) => b.strength - a.strength),
    parallels: parallelByEntry.get(e.id) ?? [],
    narrative_form: e.narrative_form,
    agent_unit: e.agent_unit,
    beneficiary_unit: e.beneficiary_unit,
    translation: {
      original_text: e.original_text,
      edition: e.edition,
      scholarly_translation: e.scholarly_translation,
      scholarly_source: e.scholarly_source,
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
      created_at: e.created_at,
    },
  };
});

const jsonl = rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
writeFileSync(resolve(outDir, "entries.jsonl"), jsonl);

const csvCell = (v) => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (headers, data) =>
  [headers.join(","), ...data.map((r) => headers.map((h) => csvCell(r[h])).join(","))].join("\n") + "\n";

writeFileSync(
  resolve(outDir, "virtue_reach.csv"),
  toCsv(["virtue_id", "virtue", "traditions_reached", "reviewed_entries", "in_shared_core"], reach),
);
writeFileSync(
  resolve(outDir, "virtue_reach_raw.csv"),
  toCsv(["virtue_id", "virtue", "traditions_approved", "approved_entries", "would_be_core"], raw),
);
writeFileSync(
  resolve(outDir, "tree.csv"),
  toCsv(["id", "name", "parent_id", "region", "era"], traditions),
);

// Coverage for the card.
const countBy = (fn) => {
  const m = new Map();
  for (const r of rows) {
    const k = fn(r);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

const byLayer = countBy((r) => r.layer ?? "(none)");
const byLanguage = countBy((r) => r.language ?? "(none)");
const roots = new Set();
for (const t of traditions) {
  let cur = t;
  const seen = new Set();
  while (cur?.parent_id && !seen.has(cur.id)) {
    seen.add(cur.id);
    cur = traditionById.get(cur.parent_id);
  }
  roots.add(cur?.id ?? t.id);
}

const verified = rows.filter((r) => r.translation.status === "verified").length;
const withOriginal = rows.filter((r) => r.translation.original_text).length;
const core = reach.filter((r) => r.in_shared_core).map((r) => r.virtue);

const card = `# VirtuOS — ${version}

A dataset of how good people act, gathered across traditions in five layers:
scripture, ancient fables, folk tales, hero films, and real human achievement.
Every entry has the same four parts: the situation, what the wise person did or
said, why it worked, and the tempting wrong answer.

This is a **draft spine**, not a citable release. It is published to fix the
format and to make the gaps visible.

## Licence

Data: **CC BY-SA 4.0**. Code: Apache-2.0.

Sources whose licence is \`research_only\` (non-commercial) or \`unclear\` are
excluded from this file. The licence of every included source is recorded per
entry.

## What is in this release

| | |
|---|---|
| Entries | ${rows.length} |
| Lineage roots | ${roots.size} |
| Languages | ${byLanguage.length} |
| Virtues | ${virtues.length} |
| Entries holding original-language text | ${withOriginal} |
| Translations verified by two readers | **${verified}** |
| Virtues in the shared core | **${core.length ? core.join(", ") : "none"}** |

By layer:

${byLayer.map(([k, n]) => `- ${k}: ${n}`).join("\n")}

By language:

${byLanguage.map(([k, n]) => `- ${k}: ${n}`).join("\n")}

## What this release does not claim

- **The shared core is empty.** No virtue has reached five lineages with an
  outside reviewer's label. \`virtue_reach_raw.csv\` shows the unreviewed count;
  \`virtue_reach.csv\` shows the reviewed count, which is zero everywhere.
- **No translation is verified.** Every entry is \`working\`. Verification needs
  two readers of the source language, at least one from the tradition.
- **Coverage is uneven.** Scripture is deep and narrow; film and achievement are
  shallow and broad. Coverage limits are stated, not hidden.

## Files

- \`entries.jsonl\` — one JSON object per entry, with source, virtues, parallels,
  translation and provenance.
- \`virtue_reach.csv\` — reviewed reach per virtue. Zero everywhere today.
- \`virtue_reach_raw.csv\` — unreviewed reach, for comparison.
- \`tree.csv\` — traditions with parent ids. Counts are computed against roots.
- \`manifest.json\` — counts and sha256 checksums.

## Citation

If you use this draft, cite it as \`VirtuOS ${version}\`, and say plainly that it
is unreviewed. Do not describe its contents as cross-cultural consensus.
`;

writeFileSync(resolve(outDir, "README.md"), card);

const sha = (file) => createHash("sha256").update(readFileSync(resolve(outDir, file))).digest("hex");
const files = ["entries.jsonl", "virtue_reach.csv", "virtue_reach_raw.csv", "tree.csv", "README.md"];
const manifest = {
  version,
  generated_at: new Date().toISOString(),
  licence: "CC BY-SA 4.0",
  counts: {
    entries: rows.length,
    roots: roots.size,
    languages: byLanguage.length,
    virtues: virtues.length,
    with_original: withOriginal,
    verified_translations: verified,
    core: core.length,
  },
  files: Object.fromEntries(files.map((f) => [f, { sha256: sha(f), bytes: readFileSync(resolve(outDir, f)).length }])),
};
writeFileSync(resolve(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

console.log(`Wrote release/${version}`);
console.log(`  entries ${rows.length}, roots ${roots.size}, languages ${byLanguage.length}`);
console.log(`  original text ${withOriginal}, verified ${verified}, core ${core.length}`);
