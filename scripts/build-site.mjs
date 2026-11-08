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

for (const f of ["reviewer.html", "coverage.html", "entry.html", "applications.html"]) {
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
<style>
  :root { --paper:#fffff8; --ink:#111; --muted:#6b6b6b; --rule:#e6e1d4; }
  html { background:var(--paper); }
  body { margin:0; color:var(--ink); font:17px/1.62 Georgia, "Iowan Old Style", serif; }
  main { max-width:680px; margin:0 auto; padding:56px 26px 100px; }
  .kicker { font-variant:small-caps; letter-spacing:.08em; color:var(--muted); font-size:12px; }
  h1 { font-weight:normal; font-size:28px; margin:8px 0 18px; }
  p { margin:0 0 14px; }
  .muted { color:var(--muted); font-size:13px; font-style:italic; }
  hr { border:0; border-top:1px solid var(--rule); margin:26px 0; }
  a { color:var(--ink); text-underline-offset:3px; }
  li { margin-bottom:6px; }
  ul { padding-left:18px; }
</style>
<main>
  <div class="kicker">VirtuOS</div>
  <h1>Working pages</h1>

  <p>VirtuOS is a dataset of how good people act, gathered across the world's traditions in
  five layers: scripture, ancient fables, folk tales, hero films, and real human achievement.
  Every entry has the same four parts: the situation, what the wise person did or said, why it
  worked, and the tempting wrong answer.</p>

  <p>A virtue enters the shared core when five lineages reached it independently and a
  reviewer outside each lineage agreed. The count is published with the sources behind it,
  so a reader can open the text and check the claim.</p>

  <p>Nothing is in the core yet, and no translation is verified. The pages below show the
  dataset as it stands, including the empty parts.</p>

  <hr>

  <ul>
    <li><a href="reviewer.html">Review</a> — one entry, one virtue, one judgment</li>
    <li><a href="coverage.html">Coverage</a> — approved entries by lineage root, and distance to the core</li>
    <li><a href="entry.html">Entries</a> — read-only view with sources and translations</li>
    <li><a href="applications.html">Applications</a> — curator only</li>
  </ul>

  <hr>

  <p class="muted">Data: CC BY-SA 4.0. Code: Apache-2.0. Sign-in is required; the data is
  protected by row-level security and these pages hold no data themselves.</p>
</main>`,
);

console.log("Built site/ — Vercel runs this on deploy; the folder is gitignored.");
