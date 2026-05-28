#!/usr/bin/env node
/**
 * Admin script — Phase 2a of the HR Knowledge Base import.
 *
 *   - Creates a public Supabase Storage bucket `hr-kb-assets` (idempotent).
 *   - Uploads every image from <export>/images/* to the bucket, preserving
 *     filenames. Upserts: re-running just refreshes the files.
 *   - Builds a best-effort filename → public-URL map by stripping the
 *     trailing `_<12-hex>.ext` hash that the Notion scraper appends, so the
 *     filenames listed in `kits_animation` row properties resolve.
 *   - For each kits_animation row, replaces the filename strings in
 *     `images_fr` / `images_en` with the matching public URL. Filenames that
 *     don't match a disk file (the Notion scraper only downloaded inline
 *     image blocks, not all attachments — ~80% of the row-property
 *     references aren't in the export) stay as filename strings.
 *   - PDFs are NOT in the export folder, so `pdf_fr` / `pdf_en` stay as
 *     filename strings.
 *
 * Usage:  npm run upload-hr-kb -- /path/to/teale-hr-kb-export
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 *
 * Idempotent: bucket creation tolerates "already exists", uploads use
 * `upsert: true`, kits_animation update is an UPSERT keyed on id.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, extname, basename } from "node:path";
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
  console.error("✗ Usage: npm run upload-hr-kb -- /path/to/teale-hr-kb-export");
  process.exit(1);
}

const jsonPath = resolve(exportDir, "hr-knowledge-base.json");
const imagesDir = resolve(exportDir, "images");
let kb;
try {
  kb = JSON.parse(readFileSync(jsonPath, "utf8"));
} catch (err) {
  console.error(`✗ Cannot read ${jsonPath}:`, err.message);
  process.exit(1);
}

let imageFiles;
try {
  imageFiles = readdirSync(imagesDir).filter((f) => !f.startsWith("."));
} catch (err) {
  console.error(`✗ Cannot read ${imagesDir}:`, err.message);
  process.exit(1);
}
console.log(`Found ${imageFiles.length} image files in ${imagesDir}`);

const BUCKET = "hr-kb-assets";
const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── 1. Ensure bucket exists ────────────────────────────────────────────────
{
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: "50MB",
  });
  if (error && !/already exists|duplicate/i.test(error.message)) {
    console.error("✗ createBucket:", error.message);
    process.exit(1);
  }
  console.log(`✓ Bucket ${BUCKET} ready (public).`);
}

// ─── 2. Upload all images (parallel, chunked) ──────────────────────────────
const CONTENT_TYPES = { png: "image/png", webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg" };
function contentTypeFor(name) {
  const ext = extname(name).slice(1).toLowerCase();
  return CONTENT_TYPES[ext] || "application/octet-stream";
}

async function uploadOne(filename) {
  const filePath = resolve(imagesDir, filename);
  const body = readFileSync(filePath);
  const { error } = await supabase.storage.from(BUCKET).upload(filename, body, {
    contentType: contentTypeFor(filename),
    upsert: true,
  });
  if (error) throw new Error(`${filename}: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(filename).data.publicUrl;
}

// Chunked parallel uploads: 8 in flight keeps the Storage API happy.
const CHUNK = 8;
const uploaded = new Map(); // disk filename → public URL
const failed = [];
console.log(`\n— Uploading ${imageFiles.length} files (chunks of ${CHUNK})…`);
for (let i = 0; i < imageFiles.length; i += CHUNK) {
  const batch = imageFiles.slice(i, i + CHUNK);
  const results = await Promise.allSettled(batch.map((f) => uploadOne(f).then((url) => [f, url])));
  for (const r of results) {
    if (r.status === "fulfilled") uploaded.set(r.value[0], r.value[1]);
    else failed.push(r.reason.message);
  }
  process.stdout.write(`  ${Math.min(i + CHUNK, imageFiles.length)}/${imageFiles.length}\r`);
}
console.log(`\n✓ Uploaded ${uploaded.size}/${imageFiles.length} files.`);
if (failed.length) {
  console.log(`✗ Failed (${failed.length}):`);
  for (const f of failed.slice(0, 10)) console.log(`  - ${f}`);
  if (failed.length > 10) console.log(`  … ${failed.length - 10} more`);
}

// ─── 3. Build filename-prefix → URL index ──────────────────────────────────
// Disk convention: <normalised_name>_<12-hex>.<ext>
// kits_animation row properties hold filenames like "Challenge Meditation —
// Desktop FR.png". We normalise both sides (lower-case, non-alnum → "_")
// and match by prefix on the normalised disk name (minus the hash tail).
function normalise(name) {
  return name
    .toLowerCase()
    .replace(/\.[^.]+$/, "") // strip extension
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// disk_norm (no hash) → URL
const diskIndex = new Map();
const HASH_TAIL_RE = /_[0-9a-f]{12}$/i;
for (const [filename, url] of uploaded) {
  const norm = normalise(filename);
  const noHash = norm.replace(HASH_TAIL_RE, "");
  // First wins. Disk filenames are unique post-scraper, so collisions on the
  // truncated form would mean two distinct images with the same source
  // filename — rare; the first-wins is acceptable for a best-effort relink.
  if (!diskIndex.has(noHash)) diskIndex.set(noHash, url);
  // Also index by the full normalised form (with hash), in case row props
  // happen to embed the hashed form.
  diskIndex.set(norm, url);
}

function resolveFilename(propFilename) {
  const norm = normalise(propFilename);
  return diskIndex.get(norm) ?? diskIndex.get(norm.replace(HASH_TAIL_RE, "")) ?? null;
}

// ─── 4. Relink kits_animation rows ─────────────────────────────────────────
function findCollection(node, namePrefix) {
  if (node && typeof node === "object") {
    if (
      (node.type === "collection_view" || node.type === "collection_view_page") &&
      typeof node.collection_name === "string" &&
      node.collection_name.startsWith(namePrefix)
    ) return node;
    for (const k of ["blocks", "rows", "children"]) {
      const arr = node[k];
      if (Array.isArray(arr)) for (const c of arr) {
        const r = findCollection(c, namePrefix);
        if (r) return r;
      }
    }
  }
  return null;
}

function splitCsv(raw) {
  if (!raw) return [];
  return String(raw).split(",").map((s) => s.trim()).filter(Boolean);
}

const letsTalk = findCollection(kb.root, "Kit de communication");
if (!letsTalk) {
  console.error("✗ 'Kit de communication' collection not found");
  process.exit(1);
}

let totalRefs = 0;
let resolvedRefs = 0;
const updates = [];
for (const r of letsTalk.rows ?? []) {
  const p = r.properties ?? {};
  function mapList(propKey) {
    const items = splitCsv(p[propKey]);
    return items.map((it) => {
      totalRefs++;
      const url = resolveFilename(it);
      if (url) { resolvedRefs++; return url; }
      return it; // keep filename if unresolved
    });
  }
  updates.push({
    id: r.id,
    images_fr: mapList("🇫🇷 PNG FR"),
    images_en: mapList("🇬🇧 PNG EN"),
    // PDFs aren't in the export folder — keep filename strings unchanged.
    pdf_fr: splitCsv(p["🇫🇷 PDF FR"]),
    pdf_en: splitCsv(p["🇬🇧 PDF EN"]),
  });
}

console.log(`\n— kits_animation image relink: ${resolvedRefs}/${totalRefs} filenames matched a disk file.`);

console.log("— Updating kits_animation rows…");
let updated = 0;
for (const u of updates) {
  const { error } = await supabase
    .from("kits_animation")
    .update({
      images_fr: u.images_fr,
      images_en: u.images_en,
      pdf_fr: u.pdf_fr,
      pdf_en: u.pdf_en,
    })
    .eq("id", u.id);
  if (error) {
    console.error(`✗ update row ${u.id.slice(0, 8)}:`, error.message);
  } else {
    updated++;
  }
}
console.log(`✓ Updated ${updated}/${updates.length} kits_animation rows.`);

console.log("\nDone. Bucket:", BUCKET, "(public). Run again to re-sync.");
