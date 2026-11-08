#!/usr/bin/env node
// Gate (b) exercise: create a real auth user, sign in with a password, and call
// cast_label over the public API with that user's JWT. No service key on the
// label call, so RLS and auth.uid() are exercised for real.
//
//   node scripts/gate-b.mjs            # create, sign in, label
//   node scripts/gate-b.mjs --cleanup  # remove label, labeler and auth user

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
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = env.SUPABASE_ANON_KEY;
if (!URL_BASE || !SERVICE || !ANON) {
  console.error("Need SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

const EMAIL = "reviewer.test@virtuos.local";
const PASSWORD = "VirtuosTest!2026";
const TRADITION = "ca1353b7-2a07-46b0-a97d-3e2a46650081"; // Rabbinic Judaism
const ENTRY = "6f703a13-78cd-42fe-b8ba-623a91fdd194"; // Luke 6:31, Christian
const VIRTUE = "12098774-1d6b-4b37-9d31-d502ec455dc5"; // reciprocity

const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const pub = { apikey: ANON, "Content-Type": "application/json" };

async function findUser() {
  const r = await fetch(`${URL_BASE}/auth/v1/admin/users?page=1&per_page=200`, { headers: admin });
  const j = await r.json();
  return (j.users ?? []).find((u) => u.email === EMAIL);
}

async function cleanup() {
  const u = await findUser();
  if (!u) {
    console.log("no test user to remove");
    return;
  }
  await fetch(`${URL_BASE}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: admin });
  console.log(`removed auth user ${u.id} (labeler cascades via on delete set null, so check manually)`);
}

if (process.argv.includes("--cleanup")) {
  await cleanup();
  process.exit(0);
}

let user = await findUser();
if (!user) {
  const r = await fetch(`${URL_BASE}/auth/v1/admin/users`, {
    method: "POST",
    headers: admin,
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, email_confirm: true }),
  });
  user = await r.json();
  if (!user.id) {
    console.error("user create failed:", JSON.stringify(user));
    process.exit(1);
  }
  console.log(`created auth user ${user.id}`);
} else {
  console.log(`reusing auth user ${user.id}`);
}

// Labeler row, with the queue role and a tradition.
const ins = await fetch(`${URL_BASE}/rest/v1/labelers`, {
  method: "POST",
  headers: { ...admin, Prefer: "resolution=merge-duplicates,return=representation" },
  body: JSON.stringify([
    {
      user_id: user.id,
      name: "Test Reviewer (gate b)",
      role: "reviewer_virtue",
      tradition_ids: [TRADITION],
    },
  ]),
});
const labelerRows = await ins.json();
if (!Array.isArray(labelerRows) || !labelerRows[0]?.id) {
  console.error("labeler upsert failed:", JSON.stringify(labelerRows));
  process.exit(1);
}
console.log(`labeler ${labelerRows[0].id} role=${labelerRows[0].role}`);

// Sign in with the publishable key, exactly as a browser client would.
const tok = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: pub,
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
const session = await tok.json();
if (!session.access_token) {
  console.error("sign-in failed:", JSON.stringify(session));
  process.exit(1);
}
console.log(`signed in, jwt sub=${JSON.parse(Buffer.from(session.access_token.split(".")[1], "base64").toString()).sub}`);

// Call the function as the signed-in reviewer. No service key here.
const call = await fetch(`${URL_BASE}/rest/v1/rpc/cast_label`, {
  method: "POST",
  headers: { apikey: ANON, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ p_entry: ENTRY, p_virtue: VIRTUE, p_agrees: true, p_notes: "gate b exercise" }),
});
console.log(`cast_label HTTP ${call.status}: ${(await call.text()).slice(0, 200)}`);
