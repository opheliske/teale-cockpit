#!/usr/bin/env node
/**
 * Seed script — demo login accounts.
 *
 * Usage:  npm run seed-users
 *
 * Creates two ready-to-use accounts so the app can be demoed immediately:
 *   • a CSM account    — full access to the CSM cockpit
 *   • a Client account — restricted to one company's space
 *
 * Idempotent: if an account already exists it is left untouched (the password
 * below is the one it was created with). Safe to re-run.
 *
 * The Client account is attached to an existing company: the demo client
 * "demo-acme" if present (run `npm run seed-demo` first), otherwise the first
 * company found in the clients table.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * The service_role key is admin-level: never commit it, never ship it to the front.
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
    /* fall back to process.env */
  }
  return env;
}

const env = loadEnv(".env.local");
const url = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("✗ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Fixed demo password — reproducible across runs.
const PASSWORD = "TealeDemo2026!";
const CSM = { email: "csm.demo@teale.io", name: "CSM Démo" };
const CLIENT = { email: "client.demo@teale.io", name: "RH Démo" };

/** Creates an auth user, or reports it already exists. */
async function ensureUser({ email, role, clientId, fullName }) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { role, client_id: clientId ?? "", full_name: fullName },
    app_metadata: { role },
  });
  if (error) {
    if (error.code === "email_exists" || /registered|already exists/i.test(error.message)) {
      return { status: "exists" };
    }
    return { status: "error", error: error.message };
  }
  return { status: "created", id: data.user.id };
}

async function main() {
  // ── CSM account ──
  const csm = await ensureUser({ email: CSM.email, role: "csm", fullName: CSM.name });
  if (csm.status === "error") {
    console.error(`✗ CSM: ${csm.error}`);
  } else {
    console.log(`✓ CSM ${csm.status === "created" ? "créé" : "déjà existant"} : ${CSM.email}`);
  }

  // ── Client account — find a company to attach it to ──
  let { data: company } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", "demo-acme")
    .maybeSingle();
  if (!company) {
    const { data: first } = await supabase
      .from("clients")
      .select("id, name")
      .order("created_at")
      .limit(1)
      .maybeSingle();
    company = first;
  }

  if (!company) {
    console.error(
      "⚠ Aucun client en base — impossible de créer le compte Client.\n" +
        "  Lance d'abord `npm run seed-demo` (ou crée un client), puis relance ce script.",
    );
  } else {
    const client = await ensureUser({
      email: CLIENT.email,
      role: "client",
      clientId: company.id,
      fullName: CLIENT.name,
    });
    if (client.status === "error") {
      console.error(`✗ Client: ${client.error}`);
    } else {
      console.log(
        `✓ Client ${client.status === "created" ? "créé" : "déjà existant"} : ${CLIENT.email} (entreprise : ${company.name})`,
      );
    }
  }

  // ── Recap ──
  console.log("\n── Comptes de démo ──");
  console.log(`  CSM     : ${CSM.email}`);
  console.log(`  Client  : ${CLIENT.email}`);
  console.log(`  Mot de passe (les deux) : ${PASSWORD}`);
}

main();
