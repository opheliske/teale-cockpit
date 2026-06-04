#!/usr/bin/env node
/**
 * Admin script — promote an existing account to the `admin` role.
 *
 * Usage:
 *   npm run set-admin -- --email=ophelie.bazard@teale.io
 *
 * Idempotent: if the account is already admin it just confirms. The admin role
 * carries no company, so client_id is cleared. Run the SQL migrations first
 * (the `admin` enum value + constraint must exist).
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * The service_role key is admin-level: never commit it, never expose it.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv(file) {
  const env = {};
  try {
    const raw = readFileSync(resolve(process.cwd(), file), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* file may not exist — fall back to process.env */
  }
  return env;
}

function parseArgs(argv) {
  const args = {};
  for (const a of argv) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  }
  return args;
}

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

const env = loadEnv(".env.local");
const url = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  fail("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const args = parseArgs(process.argv.slice(2));
const email = args.email;
if (!email) fail("--email is required");

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Look the account up by email (service_role bypasses RLS on profiles).
const { data: profile, error: profErr } = await supabase
  .from("profiles")
  .select("id, role, full_name")
  .eq("email", email)
  .maybeSingle();

if (profErr) fail(`Lookup failed: ${profErr.message}`);
if (!profile) {
  fail(`No account found for ${email}. Create it first (npm run create-user), then re-run.`);
}

// 1) app_metadata.role drives the proxy's authorization — set it to admin.
const { error: authErr } = await supabase.auth.admin.updateUserById(profile.id, {
  app_metadata: { role: "admin" },
});
if (authErr) fail(`Failed to update auth role: ${authErr.message}`);

// 2) Mirror into profiles (admin carries no company → client_id null).
const { error: updErr } = await supabase
  .from("profiles")
  .update({ role: "admin", client_id: null })
  .eq("id", profile.id);
if (updErr) fail(`Failed to update profile: ${updErr.message}`);

console.log("✓ Account promoted to admin");
console.log("  email:", email);
console.log("  id:   ", profile.id);
console.log("  was:  ", profile.role);
console.log("  now:   admin");
