#!/usr/bin/env node
// Recompute the shared-core test in plain JavaScript and diff it against the
// virtue_reach view. If the two disagree, the rule is not reproducible.
//
//   node scripts/verify-reach.mjs
//
// Reads only. Prints one row per virtue and exits non-zero on any mismatch.

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
if (!URL_BASE || !KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const PAGE = 1000;

async function pull(table, select = "*") {
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    const params = new URLSearchParams({ select, limit: String(PAGE), offset: String(offset) });
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

const [entries, sources, traditions, virtues, entryVirtues, labels, labelers, view] =
  await Promise.all([
    pull("entries", "id,status,source_id,origin_tradition_id,created_by,retired_at"),
    pull("sources", "id,tradition_id"),
    pull("traditions", "id,parent_id"),
    pull("virtues", "id,name"),
    pull("entry_virtues", "entry_id,virtue_id"),
    pull("labels", "entry_id,labeler_id,virtue_id,agrees"),
    pull("labelers", "id,tradition_id"),
    pull("virtue_reach", "virtue_id,virtue,traditions_reached,reviewed_entries,in_shared_core"),
  ]);

const entryById = new Map(entries.map((e) => [e.id, e]));
const sourceById = new Map(sources.map((s) => [s.id, s]));
const labelerById = new Map(labelers.map((l) => [l.id, l]));
const parentOf = new Map(traditions.map((t) => [t.id, t.parent_id]));

function rootOf(id) {
  const seen = new Set();
  let cur = id;
  while (cur) {
    if (seen.has(cur)) return null; // cycle
    seen.add(cur);
    const parent = parentOf.get(cur);
    if (!parent) return cur;
    cur = parent;
  }
  return null;
}

const entryTradition = (e) => e.origin_tradition_id ?? sourceById.get(e.source_id)?.tradition_id ?? null;

// Labels keyed by entry + virtue, since a label only counts for the virtue it names.
const labelsFor = new Map();
for (const l of labels) {
  const k = `${l.entry_id}|${l.virtue_id}`;
  if (!labelsFor.has(k)) labelsFor.set(k, []);
  labelsFor.get(k).push(l);
}

const computed = new Map();
for (const v of virtues) {
  const roots = new Set();
  const entriesCounted = new Set();

  for (const ev of entryVirtues) {
    if (ev.virtue_id !== v.id) continue;
    const e = entryById.get(ev.entry_id);
    if (!e || e.status !== "approved" || e.retired_at) continue;

    const entryRoot = rootOf(entryTradition(e));
    if (!entryRoot) continue;

    for (const l of labelsFor.get(`${e.id}|${v.id}`) ?? []) {
      if (!l.agrees) continue;
      const labeler = labelerById.get(l.labeler_id);
      if (!labeler?.tradition_id) continue;
      if (e.created_by && l.labeler_id === e.created_by) continue;
      const reviewerRoot = rootOf(labeler.tradition_id);
      if (!reviewerRoot || reviewerRoot === entryRoot) continue;
      roots.add(entryRoot);
      entriesCounted.add(e.id);
    }
  }

  computed.set(v.id, {
    virtue: v.name,
    traditions_reached: roots.size,
    reviewed_entries: entriesCounted.size,
    in_shared_core: roots.size >= 5,
  });
}

let mismatches = 0;
const rows = [...view].sort((a, b) => a.virtue.localeCompare(b.virtue));
console.log("virtue".padEnd(24), "view", "code", "match");
for (const row of rows) {
  const mine = computed.get(row.virtue_id);
  const ok =
    mine &&
    mine.traditions_reached === row.traditions_reached &&
    mine.reviewed_entries === row.reviewed_entries &&
    mine.in_shared_core === row.in_shared_core;
  if (!ok) mismatches += 1;
  console.log(
    row.virtue.padEnd(24),
    `${row.traditions_reached}/${row.reviewed_entries}`.padEnd(5),
    `${mine?.traditions_reached ?? "?"}/${mine?.reviewed_entries ?? "?"}`.padEnd(5),
    ok ? "ok" : "MISMATCH",
  );
}

const core = rows.filter((r) => r.in_shared_core).map((r) => r.virtue);
console.log(`\nshared core (view): ${core.length ? core.join(", ") : "empty"}`);
if (labels.length === 0) {
  console.log("WARNING: no labels exist, so this comparison is vacuous. It proves nothing yet.");
}
console.log(mismatches === 0 ? "reproduced: 0 mismatches" : `FAILED: ${mismatches} mismatches`);
process.exit(mismatches === 0 ? 0 : 1);
