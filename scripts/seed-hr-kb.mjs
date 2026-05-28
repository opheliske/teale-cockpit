#!/usr/bin/env node
/**
 * Admin script — imports the HR Knowledge Base Notion export into the
 * communication catalogue tables (`kits_lancement`, `kits_animation`).
 *
 * Phase 1 (this script):
 *   - Launch collection (22 rows) → kits_lancement
 *   - Kit de communication / Let's Talk + Playlist (39 rows) → kits_animation
 *   - METADATA ONLY — images_fr/en and pdf_fr/en arrays hold the original
 *     Notion filenames as plain strings, NOT uploaded URLs. The catalogue UI
 *     already accepts string arrays for these fields, so it'll display the
 *     filenames as text until the Phase 2 image upload happens.
 *
 * Phase 2 (TODO, separate script):
 *   - Upload /tmp/teale-hr-kb/images/* to Supabase Storage
 *   - Rewrite kits_animation row arrays to point at the Storage URLs
 *   - Optionally import the other 7 collections into new tables
 *
 * Usage:
 *   npm run seed-hr-kb -- /path/to/teale-hr-kb-export
 *
 * The export path must point at a directory that contains
 *   hr-knowledge-base.json (and an images/ subdirectory, used in Phase 2).
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * The service_role key bypasses RLS — never commit it, never ship it.
 *
 * DESTRUCTIVE: truncates kits_lancement and kits_animation before inserting.
 * Run only against a database where you actually want the export to replace
 * the current catalogue.
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

const exportDir = process.argv[2];
if (!exportDir) {
  console.error("✗ Usage: npm run seed-hr-kb -- /path/to/teale-hr-kb-export");
  process.exit(1);
}

const jsonPath = resolve(exportDir, "hr-knowledge-base.json");
let kb;
try {
  kb = JSON.parse(readFileSync(jsonPath, "utf8"));
} catch (err) {
  console.error(`✗ Cannot read ${jsonPath}:`, err.message);
  process.exit(1);
}

// Walk the tree to find a collection by name prefix. Collections can be
// nested several levels deep inside subpages — the recursion handles that.
function findCollection(node, namePrefix) {
  if (node && typeof node === "object") {
    if (
      (node.type === "collection_view" || node.type === "collection_view_page") &&
      typeof node.collection_name === "string" &&
      node.collection_name.startsWith(namePrefix)
    ) {
      return node;
    }
    for (const key of ["blocks", "rows", "children"]) {
      const arr = node[key];
      if (Array.isArray(arr)) {
        for (const child of arr) {
          const r = findCollection(child, namePrefix);
          if (r) return r;
        }
      }
    }
  }
  return null;
}

// ─── Launch → kits_lancement ────────────────────────────────────────────────
function parseLaunchStep(raw) {
  const s = (raw || "").toLowerCase();
  if (s.includes("before") || s.includes("avant")) return "before";
  if (s.includes("d-day") || s.includes("jour j")) return "dday";
  if (s.includes("after") || s.includes("après") || s.includes("apres")) return "after";
  return null;
}

function parseLanguage(raw) {
  const s = (raw || "").toUpperCase();
  if (s.includes("FR")) return "FR";
  if (s.includes("EN")) return "EN";
  return null;
}

const launch = findCollection(kb.root, "Launch");
if (!launch) {
  console.error("✗ 'Launch' collection not found in the export");
  process.exit(1);
}

const launchRows = [];
const launchSkipped = [];
for (const r of launch.rows ?? []) {
  const p = r.properties ?? {};
  const step = parseLaunchStep(p["Step/Étape"]);
  const language = parseLanguage(p.Category);
  const title = (p.Name || "").trim();
  if (!step || !language || !title) {
    launchSkipped.push({ id: r.id, reason: `step=${step} lang=${language} title=${title?.slice(0, 30) || "∅"}` });
    continue;
  }
  launchRows.push({ id: r.id, title, step, language });
}

// ─── Kit de communication (Let's Talk / Playlist) → kits_animation ──────────
function splitCsv(raw) {
  if (!raw) return [];
  return String(raw).split(",").map((s) => s.trim()).filter(Boolean);
}

function parseLanguages(raw) {
  const out = new Set();
  for (const part of String(raw || "").split(",")) {
    const l = parseLanguage(part);
    if (l) out.add(l);
  }
  return [...out];
}

const letsTalk = findCollection(kb.root, "Kit de communication");
if (!letsTalk) {
  console.error("✗ 'Kit de communication' collection not found in the export");
  process.exit(1);
}

const animationRows = [];
const animationSkipped = [];
for (const r of letsTalk.rows ?? []) {
  const p = r.properties ?? {};
  const title = (p.Nom || "").trim();
  if (!title) {
    animationSkipped.push({ id: r.id, reason: "empty title" });
    continue;
  }
  animationRows.push({
    id: r.id,
    title,
    month: (p.Month || "").trim(),
    type: (p.Type || "").trim(),
    status: (p.Status || "").trim(),
    landing: p["Landing page"] ? String(p["Landing page"]).trim() : null,
    languages: parseLanguages(p.Language),
    images_fr: splitCsv(p["🇫🇷 PNG FR"]),
    images_en: splitCsv(p["🇬🇧 PNG EN"]),
    pdf_fr: splitCsv(p["🇫🇷 PDF FR"]),
    pdf_en: splitCsv(p["🇬🇧 PDF EN"]),
  });
}

// Required NOT NULL columns on kits_animation: month, type, status. Fill any
// blank with "—" so the insert doesn't violate the constraint.
for (const a of animationRows) {
  if (!a.month) a.month = "—";
  if (!a.type) a.type = "—";
  if (!a.status) a.status = "—";
}

console.log(`Parsed: ${launchRows.length} Launch rows, ${animationRows.length} Let's Talk/Playlist rows.`);
if (launchSkipped.length) {
  console.log(`Launch skipped (${launchSkipped.length}):`);
  for (const s of launchSkipped) console.log(`  - ${s.id?.slice(0, 8)} : ${s.reason}`);
}
if (animationSkipped.length) {
  console.log(`Let's Talk/Playlist skipped (${animationSkipped.length}):`);
  for (const s of animationSkipped) console.log(`  - ${s.id?.slice(0, 8)} : ${s.reason}`);
}

// ─── Write to Supabase ──────────────────────────────────────────────────────
const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Truncate then insert. We use a "delete where id is not null" trick because
// the supabase-js client doesn't expose TRUNCATE — for a few tens of rows
// this is fine, and it keeps the RLS / replication-friendly behaviour.
console.log("\n— Truncating kits_lancement…");
{
  const { error } = await supabase.from("kits_lancement").delete().not("id", "is", null);
  if (error) { console.error("✗ truncate kits_lancement:", error.message); process.exit(1); }
}
console.log("— Truncating kits_animation…");
{
  const { error } = await supabase.from("kits_animation").delete().not("id", "is", null);
  if (error) { console.error("✗ truncate kits_animation:", error.message); process.exit(1); }
}

console.log("\n— Inserting kits_lancement…");
{
  const { error } = await supabase.from("kits_lancement").insert(launchRows);
  if (error) { console.error("✗ insert kits_lancement:", error.message); process.exit(1); }
  console.log(`✓ kits_lancement : ${launchRows.length} rows.`);
}
console.log("— Inserting kits_animation…");
{
  const { error } = await supabase.from("kits_animation").insert(animationRows);
  if (error) { console.error("✗ insert kits_animation:", error.message); process.exit(1); }
  console.log(`✓ kits_animation : ${animationRows.length} rows.`);
}

console.log("\nDone. Phase 1 complete (metadata only). Phase 2 — image upload + extra collections — pending.");
