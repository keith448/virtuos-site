#!/usr/bin/env node
// Copy the publishable release into the Python package's bundled data.
// Run scripts/export-release.mjs first.
//
//   node scripts/sync-package-data.mjs

import { copyFileSync, statSync } from "node:fs";

const source = "release/v0.1-draft/entries.jsonl";
const target = "src/virtuos_eval/data/v0.1-draft.jsonl";

copyFileSync(source, target);
const bytes = statSync(target).size;
console.log(`copied ${source} -> ${target} (${(bytes / 1e6).toFixed(1)} MB)`);
