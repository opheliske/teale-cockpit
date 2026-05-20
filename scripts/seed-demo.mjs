#!/usr/bin/env node
/**
 * Seed script — rebuilds a clean demo dataset in one command.
 *
 * Usage:  npm run seed-demo
 *
 * Creates 3 demo clients (ids "demo-…") with a yearly plan (ateliers + kits),
 * CSM actions and health alerts. Idempotent and safe:
 *   - clients / plan_state are upserted by id → re-running just refreshes them
 *   - health_entries are replaced only for the demo clients
 *   - CSM actions are marked "[DÉMO]" and only those are replaced
 * It NEVER touches non-demo data.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * The service_role key bypasses RLS — never commit it, never ship it to the front.
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

const DEMO_PREFIX = "[DÉMO] ";

// ─── Demo clients ────────────────────────────────────────────────────────────
const CLIENTS = [
  {
    id: "demo-acme", name: "Acme Corp", initials: "AC", color: "#bbf7d0",
    collab: 420, statut: "green", formule: "holistique",
    atelier_total: 20, rdv_par_collab: 2,
    contract_start: "2026-01-15", contract_end: "2027-01-14", churn_notice: "",
    produits: ["Joy", "Dashboard RH", "Pulse"], arr: 48,
  },
  {
    id: "demo-globex", name: "Globex", initials: "GX", color: "#fde68a",
    collab: 180, statut: "amber", formule: "digital + tokens",
    atelier_total: 10, rdv_par_collab: 1,
    contract_start: "2025-09-01", contract_end: "2026-07-15", churn_notice: "",
    produits: ["Joy", "Pulse"], arr: 22,
  },
  {
    id: "demo-initech", name: "Initech", initials: "IN", color: "#fca5a5",
    collab: 90, statut: "danger", formule: "digital only",
    atelier_total: 6, rdv_par_collab: 1,
    contract_start: "2025-06-01", contract_end: "2026-06-10",
    churn_notice: "2026-06-01",
    produits: ["Joy"], arr: 9,
  },
];

// Yearly plan per client — a mix of ateliers and kits, some already done.
function planItems() {
  return [
    { id: 1, quarter: "Q1", type: "atelier", icon: "🎓", title: "Atelier — Gérer son stress", meta: "Janvier", done: true },
    { id: 2, quarter: "Q1", type: "kit",     icon: "📢", title: "Kit de lancement interne", meta: "Janvier", done: true },
    { id: 3, quarter: "Q2", type: "atelier", icon: "🎓", title: "Atelier — Charge mentale", meta: "Mai", done: true },
    { id: 4, quarter: "Q2", type: "csm",     icon: "📞", title: "Point CSM trimestriel", meta: "Juin", done: false },
    { id: 5, quarter: "Q3", type: "atelier", icon: "🎓", title: "Atelier — Manager bienveillant", meta: "Septembre", done: false },
    { id: 6, quarter: "Q4", type: "qbr",     icon: "📊", title: "QBR annuel", meta: "Décembre", done: false },
  ];
}

const PLAN_THEMES = {
  Q1: "🚀 Lancement & onboarding",
  Q2: "🌱 Sensibilisation & engagement",
  Q3: "📈 Animation & fidélisation",
  Q4: "📊 Bilan & perspectives",
};

// ─── Demo CSM actions (global to-do list) ────────────────────────────────────
const ACTIONS = [
  { text: DEMO_PREFIX + "Préparer le QBR Acme Corp", clients: [{ name: "Acme Corp", color: "#bbf7d0" }], echeance: "30 juin 2026", overdue: false, done: false },
  { text: DEMO_PREFIX + "Relancer Globex sur les ateliers Q2", clients: [{ name: "Globex", color: "#fde68a" }], echeance: "5 juin 2026", overdue: false, done: false },
  { text: DEMO_PREFIX + "Plan de sauvetage Initech", clients: [{ name: "Initech", color: "#fca5a5" }], echeance: "22 mai 2026", overdue: true, done: false },
];

// ─── Demo health alerts ──────────────────────────────────────────────────────
const HEALTH = [
  { client_id: "demo-acme",    date: "12 mai 2026", iso_date: "2026-05-12", statut: "SAIN",     note: "Engagement en hausse, NPS solide." },
  { client_id: "demo-globex",  date: "14 mai 2026", iso_date: "2026-05-14", statut: "VIGILANCE", note: "Consommation d'ateliers en retard sur le plan." },
  { client_id: "demo-initech", date: "16 mai 2026", iso_date: "2026-05-16", statut: "À RISQUE",  note: "Churn notice reçue — renouvellement incertain." },
];

async function main() {
  // Assign the demo clients to the first CSM profile, if any.
  const { data: csm } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "csm")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  const ownerCsmId = csm?.id ?? null;

  // 1. Clients (upsert by id).
  const { error: clientsErr } = await supabase.from("clients").upsert(
    CLIENTS.map((c) => ({
      ...c,
      csm: "",
      csm_label: "",
      owner_csm_id: ownerCsmId,
    })),
  );
  if (clientsErr) {
    console.error("✗ clients:", clientsErr.message);
    process.exit(1);
  }
  console.log(`✓ ${CLIENTS.length} clients de démo`);

  // 2. Yearly plan (upsert by client_id).
  const { error: planErr } = await supabase.from("plan_state").upsert(
    CLIENTS.map((c) => ({
      client_id: c.id,
      themes: PLAN_THEMES,
      items: planItems(),
      updated_at: new Date().toISOString(),
    })),
  );
  if (planErr) console.error("✗ plan_state:", planErr.message);
  else console.log("✓ plan annuel (ateliers + kits) pour chaque client");

  // 3. Health alerts — replace only the demo clients' entries.
  const demoIds = CLIENTS.map((c) => c.id);
  await supabase.from("health_entries").delete().in("client_id", demoIds);
  const { error: healthErr } = await supabase.from("health_entries").insert(HEALTH);
  if (healthErr) console.error("✗ health_entries:", healthErr.message);
  else console.log(`✓ ${HEALTH.length} alertes santé`);

  // 4. CSM actions — replace only the "[DÉMO]" ones.
  await supabase.from("client_actions").delete().like("text", `${DEMO_PREFIX}%`);
  const { error: actionsErr } = await supabase.from("client_actions").insert(ACTIONS);
  if (actionsErr) console.error("✗ client_actions:", actionsErr.message);
  else console.log(`✓ ${ACTIONS.length} actions CSM`);

  console.log("\n✓ Démo prête. Clients : " + demoIds.join(", "));
}

main();
