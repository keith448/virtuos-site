#!/usr/bin/env node
// Build the deployable site: only the three public HTML files plus robots.txt.
// The repo root holds .env with the service key, so never deploy the root.
//
//   node scripts/build-site.mjs
//   npx vercel deploy site --prod

import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";

const out = resolve("site");
mkdirSync(out, { recursive: true });

for (const f of ["reviewer.html", "coverage.html", "entry.html"]) {
  copyFileSync(resolve(f), resolve(out, f));
}

writeFileSync(
  resolve(out, "robots.txt"),
  "User-agent: *\nDisallow: /\n",
);

writeFileSync(
  resolve(out, "index.html"),
  `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex">
<title>VirtuOS</title>
<style>html{background:#fffff8}body{margin:0;font:17px/1.6 Georgia,serif;color:#111}
main{max-width:640px;margin:0 auto;padding:60px 26px}
a{color:#111;text-underline-offset:3px}.m{color:#6b6b6b;font-size:13px;font-style:italic}</style>
<main>
<div style="font-variant:small-caps;letter-spacing:.08em;color:#6b6b6b;font-size:12px">VirtuOS</div>
<h1 style="font-weight:normal;font-size:26px;margin:8px 0 4px">Working pages</h1>
<p class="m">Sign-in required. The data is protected by row-level security; these pages hold no data themselves.</p>
<ul>
  <li><a href="reviewer.html">Review</a> — one entry, one virtue</li>
  <li><a href="coverage.html">Coverage</a> — approved entries by lineage root</li>
  <li><a href="entry.html">Entries</a> — read-only view</li>
</ul>
</main>`,
);

console.log("Built site/ — deploy this folder, never the repository root.");
