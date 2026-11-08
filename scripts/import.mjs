#!/usr/bin/env node
// Load a batch file into VirtuOS through the import_entries RPC.
//
//   node scripts/import.mjs batches/film-01.json [model-name]
//
// The batch is a JSON array. Each row carries an embedded `source`, so the film
// and achievement layers can be imported even though they have no pre-existing
// source rows. Re-running a batch is safe: sources upsert on external_id and
// entries skip on source_locator.

import { readFileSync } from "node:fs";
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

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/import.mjs <batch.json> [model-name]");
  process.exit(1);
}

const model = process.argv[3] ?? "deepseek-v4.1-flash";
const rows = JSON.parse(readFileSync(resolve(file), "utf8"));
if (!Array.isArray(rows)) {
  console.error("Batch must be a JSON array.");
  process.exit(1);
}

const res = await fetch(`${URL_BASE}/rest/v1/rpc/import_entries`, {
  method: "POST",
  headers: {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ payload: rows, model }),
});

if (!res.ok) {
  console.error(`HTTP ${res.status}: ${await res.text()}`);
  process.exit(1);
}

const inserted = await res.json();
console.log(`Sent ${rows.length} rows, inserted ${inserted}.`);
