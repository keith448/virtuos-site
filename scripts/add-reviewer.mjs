#!/usr/bin/env node
// Onboard a reviewer: create the auth user, then the labeler row with a queue
// role and tradition_ids. Uses the service key, so it runs on the curator's
// machine, never in a browser.
//
//   node scripts/add-reviewer.mjs --email a@b.c --name "Ada" --tradition "Rabbinic Judaism"
//   node scripts/add-reviewer.mjs --email a@b.c --name "Ada" --tradition "Rabbinic Judaism" --tradition "Hebrew Bible"
//   node scripts/add-reviewer.mjs --email a@b.c --role reviewer_translation --languages "Sanskrit,Pali"
//   node scripts/add-reviewer.mjs --list
//   node scripts/add-reviewer.mjs --delete --email a@b.c
//   node scripts/add-reviewer.mjs --reset-password --email a@b.c
//   node scripts/add-reviewer.mjs --link --email a@b.c --role curator

import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

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
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !SERVICE) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const admin = {
  apikey: SERVICE,
  Authorization: `Bearer ${SERVICE}`,
  "Content-Type": "application/json",
};

// --- args ------------------------------------------------------------------
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const values = (name) => {
  const out = [];
  args.forEach((a, i) => {
    if (a === name && args[i + 1]) out.push(args[i + 1]);
  });
  return out;
};

async function get(path) {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: admin });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status} ${await r.text()}`);
  return r.json();
}

async function traditionsByNames(names) {
  if (!names.length) return [];
  const all = await get("traditions?select=id,name,parent_id");
  const out = [];
  for (const n of names) {
    const hit = all.find((t) => t.name.toLowerCase() === n.toLowerCase());
    if (!hit) {
      console.error(`No tradition named "${n}". Known names include:`);
      console.error(all.slice(0, 40).map((t) => `  ${t.name}`).join("\n"));
      process.exit(1);
    }
    out.push(hit);
  }
  return out;
}

async function findUser(email) {
  const r = await fetch(`${URL_BASE}/auth/v1/admin/users?page=1&per_page=200`, { headers: admin });
  const j = await r.json();
  return (j.users ?? []).find((u) => u.email?.toLowerCase() === email.toLowerCase());
}

// --- list ------------------------------------------------------------------
if (flag("--list")) {
  const rows = await get("labelers?select=id,name,role,tradition_ids,user_id,languages&order=name");
  if (!rows.length) console.log("No labelers.");
  for (const l of rows) {
    console.log(`${l.name.padEnd(24)} ${String(l.role).padEnd(20)} user=${l.user_id ?? "-"} traditions=${(l.tradition_ids ?? []).length}`);
  }
  process.exit(0);
}

// --- delete ----------------------------------------------------------------
if (flag("--delete")) {
  const email = value("--email");
  if (!email) { console.error("--delete needs --email"); process.exit(1); }
  const u = await findUser(email);
  if (!u) { console.log(`No auth user for ${email}`); process.exit(0); }
  await fetch(`${URL_BASE}/rest/v1/labelers?user_id=eq.${u.id}`, { method: "DELETE", headers: admin });
  await fetch(`${URL_BASE}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: admin });
  console.log(`Deleted ${email} and their labeler row.`);
  process.exit(0);
}

// --- add -------------------------------------------------------------------
const email = value("--email");
const name = value("--name");
const role = value("--role") ?? "reviewer_virtue";
const password = value("--password") ?? randomBytes(12).toString("base64url") + "!A1";
const languageList = (value("--languages") ?? "").split(",").map((s) => s.trim()).filter(Boolean);

if (!email) {
  console.error('Usage: node scripts/add-reviewer.mjs --email x --name "Name" [--role reviewer_virtue] [--tradition "Name" ...] [--languages "Sanskrit,Pali"]');
  process.exit(1);
}

// --- reset password --------------------------------------------------------
if (flag("--reset-password")) {
  const u = await findUser(email);
  if (!u) {
    console.error(`No auth user for ${email}. Run without --reset-password to create one.`);
    process.exit(1);
  }
  const r = await fetch(`${URL_BASE}/auth/v1/admin/users/${u.id}`, {
    method: "PUT",
    headers: admin,
    body: JSON.stringify({ password }),
  });
  if (!r.ok) {
    console.error("Password reset failed:", await r.text());
    process.exit(1);
  }
  console.log(`Password reset for ${email}`);
  console.log(`  user     ${u.id}`);
  console.log(`  password ${password}   ← shown once`);
  process.exit(0);
}

// --- link an existing unlinked labeler to an account -----------------------
if (flag("--link")) {
  const linkRole = value("--role") ?? "curator";
  let user = await findUser(email);
  let madeUser = false;
  if (!user) {
    const r = await fetch(`${URL_BASE}/auth/v1/admin/users`, {
      method: "POST",
      headers: admin,
      body: JSON.stringify({ email, password, email_confirm: true }),
    });
    user = await r.json();
    if (!user.id) { console.error("User creation failed:", JSON.stringify(user)); process.exit(1); }
    madeUser = true;
  }

  const candidates = await get(`labelers?role=eq.${linkRole}&user_id=is.null&select=id,name,tradition_ids,languages`);
  if (!candidates.length) {
    console.error(`No unlinked labeler with role ${linkRole}.`);
    process.exit(1);
  }
  if (candidates.length > 1) {
    console.error(`More than one unlinked ${linkRole}. Refusing to guess:`);
    candidates.forEach((c) => console.error(`  ${c.id}  ${c.name}`));
    process.exit(1);
  }
  const lb = candidates[0];

  const patch = await fetch(`${URL_BASE}/rest/v1/labelers?id=eq.${lb.id}`, {
    method: "PATCH",
    headers: admin,
    body: JSON.stringify({ user_id: user.id }),
  });
  if (!patch.ok) { console.error("Link failed:", await patch.text()); process.exit(1); }

  // Record the bootstrap explicitly: an application and a decision that says what it is.
  await fetch(`${URL_BASE}/rest/v1/reviewer_applications?on_conflict=user_id`, {
    method: "POST",
    headers: { ...admin, Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify([{
      user_id: user.id,
      email,
      name: lb.name,
      tradition_ids: lb.tradition_ids ?? [],
      languages: lb.languages,
      note: `bootstrap link for role ${linkRole}`,
    }]),
  });
  const apps = await get(`reviewer_applications?user_id=eq.${user.id}&select=id`);
  if (apps[0]) {
    await fetch(`${URL_BASE}/rest/v1/reviewer_decisions?on_conflict=application_id`, {
      method: "POST",
      headers: { ...admin, Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify([{
        application_id: apps[0].id,
        decision: "bootstrap",
        decided_by: lb.id,
        note: `bootstrap link: first account for role ${linkRole}`,
      }]),
    });
  }

  console.log(`Linked ${email} to ${lb.name} (${linkRole})`);
  console.log(`  user     ${user.id}`);
  console.log(`  labeler  ${lb.id}`);
  console.log(`  decision bootstrap`);
  if (madeUser) console.log(`  password ${password}   ← shown once`);
  process.exit(0);
}

if (!name) {
  console.error("--name is required to create or update a labeler.");
  process.exit(1);
}

const validRoles = ["reviewer_virtue", "reviewer_translation", "reviewer_adjudicator"];
if (!validRoles.includes(role)) {
  console.error(`Role must be one of: ${validRoles.join(", ")}`);
  process.exit(1);
}

const traditions = await traditionsByNames(values("--tradition"));
if (role !== "reviewer_translation" && traditions.length === 0) {
  console.error("reviewer_virtue and reviewer_adjudicator need at least one --tradition.");
  process.exit(1);
}
if (role === "reviewer_translation" && languageList.length === 0) {
  console.error("reviewer_translation needs --languages, e.g. --languages \"Sanskrit,Pali\".");
  process.exit(1);
}

let user = await findUser(email);
let created = false;
if (!user) {
  const r = await fetch(`${URL_BASE}/auth/v1/admin/users`, {
    method: "POST",
    headers: admin,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  user = await r.json();
  if (!user.id) {
    console.error("User creation failed:", JSON.stringify(user));
    process.exit(1);
  }
  created = true;
}

const upsert = await fetch(`${URL_BASE}/rest/v1/labelers?on_conflict=user_id`, {
  method: "POST",
  headers: { ...admin, Prefer: "resolution=merge-duplicates,return=representation" },
  body: JSON.stringify([{
    user_id: user.id,
    name,
    role,
    tradition_ids: traditions.map((t) => t.id),
    languages: languageList.length ? languageList : null,
  }]),
});
const rows = await upsert.json();
if (!Array.isArray(rows) || !rows[0]?.id) {
  console.error("Labeler upsert failed:", JSON.stringify(rows));
  process.exit(1);
}

// Audit trail: every labeler should trace to an application and a decision.
// The script bypasses the application form, so it writes both records itself.
try {
  const curators = await get("labelers?select=id&role=eq.curator&limit=1");
  const curatorId = curators[0]?.id ?? null;
  if (curatorId) {
    await fetch(`${URL_BASE}/rest/v1/reviewer_applications?on_conflict=user_id`, {
      method: "POST",
      headers: { ...admin, Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify([{
        user_id: user.id,
        email,
        name,
        tradition_ids: traditions.map((t) => t.id),
        languages: languageList.length ? languageList : null,
        note: `created via add-reviewer.mjs as ${role}`,
      }]),
    });
    const apps = await get(`reviewer_applications?user_id=eq.${user.id}&select=id`);
    if (apps[0]) {
      await fetch(`${URL_BASE}/rest/v1/reviewer_decisions?on_conflict=application_id`, {
        method: "POST",
        headers: { ...admin, Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify([{
          application_id: apps[0].id,
          decision: "approved",
          decided_by: curatorId,
          note: `created via add-reviewer.mjs as ${role}`,
        }]),
      });
    }
  }
} catch (e) {
  console.error(`warning: could not record the audit trail (${e.message})`);
}

console.log(`${created ? "Created" : "Updated"} ${email}`);
console.log(`  user     ${user.id}`);
console.log(`  labeler  ${rows[0].id}`);
console.log(`  role     ${role}`);
console.log(`  tradition(s) ${traditions.map((t) => t.name).join(", ") || "-"}`);
if (languageList.length) console.log(`  languages    ${languageList.join(", ")}`);
if (created) console.log(`  password ${password}   ← give this to the reviewer; it is shown once`);
console.log(`\nThey sign in at https://virtuos-swart.vercel.app/reviewer`);
