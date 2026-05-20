#!/usr/bin/env node
/**
 * Admin script — create a Teale Cockpit user (CSM or client).
 *
 * Usage:
 *   npm run create-user -- --email=jane@teale.co --role=csm --name="Jane Doe"
 *   npm run create-user -- --email=rh@acme.com --role=client --client_id=acme --name="RH Acme"
 *
 * Options:
 *   --email      (required) account email
 *   --role       (required) "csm" or "client"
 *   --client_id  (required for client, forbidden for csm) the clients.id of the company
 *   --name       (optional) full name shown in the UI
 *   --password   (optional) if omitted, a strong password is generated and printed
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * The service_role key is admin-level: never commit it, never expose it to the frontend.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
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
  fail(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
}

const args = parseArgs(process.argv.slice(2));
const email = args.email;
const role = args.role;
const clientId = args.client_id || null;
const fullName = args.name || "";
let password = args.password;
const passwordProvided = Boolean(password);

if (!email) fail("--email is required");
if (role !== "csm" && role !== "client") {
  fail('--role must be "csm" or "client"');
}
if (role === "client" && !clientId) {
  fail("--client_id is required for a client account");
}
if (role === "csm" && clientId) {
  fail("--client_id must NOT be set for a CSM account");
}
if (!password) password = randomBytes(12).toString("base64url");

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true, // no email flow — the account is usable immediately
  user_metadata: { role, client_id: clientId ?? "", full_name: fullName },
  app_metadata: { role },
});

if (error) fail(`Failed to create user: ${error.message}`);

// The on_auth_user_created trigger inserts the matching public.profiles row.
const { data: profile } = await supabase
  .from("profiles")
  .select("id, role, client_id, full_name")
  .eq("id", data.user.id)
  .single();

console.log("✓ User created");
console.log("  email:     ", email);
console.log(
  "  password:  ",
  password,
  passwordProvided ? "(provided)" : "(generated — share it securely)",
);
console.log("  role:      ", role);
if (clientId) console.log("  client_id: ", clientId);
console.log(
  "  profile:   ",
  profile ? "created ✓" : "⚠ NOT found — is the on_auth_user_created trigger applied?",
);
