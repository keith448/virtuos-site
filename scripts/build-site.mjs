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
  main { max-width:660px; margin:0 auto; padding:56px 26px 100px; }
  .kicker { font-variant:small-caps; letter-spacing:.08em; color:var(--muted); font-size:12px; }
  h1 { font-weight:normal; font-size:30px; margin:8px 0 6px; }
  h2 { font-weight:normal; font-size:15px; font-variant:small-caps; letter-spacing:.06em;
       color:var(--muted); margin:34px 0 8px; border-top:1px solid var(--rule); padding-top:16px; }
  p { margin:0 0 14px; }
  .muted { color:var(--muted); font-size:13px; font-style:italic; }
  a { color:var(--ink); text-underline-offset:3px; }
  ul { padding-left:18px; margin:0 0 14px; }
  li { margin-bottom:5px; }
</style>
<main>
  <div class="kicker">VirtuOS</div>
  <h1>Prove your model's values come from somewhere other than you.</h1>

  <p>VirtuOS is a dataset of how good people act, gathered across the world's traditions,
  and the test built on top of it. Every entry has four parts: the situation, what the wise
  person did or said, why it worked, and the tempting wrong answer. Each entry names its
  source, and where the text survives, the original language and the edition it came from.</p>

  <p>A virtue enters the shared core when five lineages reached it independently and a
  reviewer outside each lineage agreed. The count is published with the sources behind it,
  so a reader can open the text and check the claim.</p>

  <h2>Where it stands</h2>
  <p>The shared core is empty. No translation has been verified by two readers. The corpus
  holds about fifteen hundred entries; a small number are approved and the rest are drafts.
  The pages below show that state without rounding it up.</p>

  <h2>The working pages</h2>
  <ul>
    <li><a href="reviewer.html">Review</a> — one entry, one virtue, one judgment. Sign-in required.</li>
    <li><a href="coverage.html">Coverage</a> — approved entries by lineage root, and distance to the core.</li>
    <li><a href="entry.html">Entries</a> — the read-only view, with sources and translations.</li>
  </ul>

  <h2>For labs</h2>
  <p>The data is free to cite under CC BY-SA 4.0. What we sell is measurement: a pilot in
  which your model is scored against entries your reviewers did not choose, with the sources
  attached to every case. The code is Apache-2.0.</p>

  <p>Keith Schroeder · <a href="mailto:keith@mirepoixpartners.com">keith@mirepoixpartners.com</a></p>

  <p class="muted">Curators: <a href="applications.html">applications</a>.</p>
</main>`,
);

console.log("Built site/ — Vercel runs this on deploy; the folder is gitignored.");
