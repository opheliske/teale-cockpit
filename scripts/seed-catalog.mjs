#!/usr/bin/env node
/**
 * Admin script — seeds the workshop catalogue (table `workshops`).
 *
 * Usage:  npm run seed-catalog
 *
 * Replaces the former front-side auto-seed (which could re-seed concurrently
 * from several tabs). Idempotent: rows are upserted by id, so re-running just
 * refreshes the catalogue.
 *
 * Reads the default catalogue from src/app/(client)/catalogue-ateliers/data.ts
 * and NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * The service_role key bypasses RLS — never commit it, never ship it.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { workshops } from "../src/app/(client)/catalogue-ateliers/data.ts";

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

const rows = workshops.map((w) => ({
  id: w.id,
  title: w.title,
  subtitle: w.subtitle ?? null,
  theme_id: w.themeId,
  objectives: w.objectives,
  programme: w.programme,
  target_audience: w.targetAudience,
  already_animated: w.alreadyAnimated ?? false,
}));

const { error } = await supabase.from("workshops").upsert(rows);
if (error) {
  console.error("✗ Échec du seed du catalogue :", error.message);
  process.exit(1);
}
console.log(`✓ Catalogue d'ateliers : ${rows.length} ateliers (upsert).`);
