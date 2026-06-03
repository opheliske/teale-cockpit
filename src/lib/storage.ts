import { supabase } from "@/lib/supabase";

// Private Supabase Storage bucket for client documents and plan attachments.
// Files are stored under "<clientId>/..." so Storage RLS can scope them.
const BUCKET = "client-files";

function isBucketMissing(message: string): boolean {
  return /bucket not found/i.test(message);
}

/**
 * Uploads a file to the private client-files bucket.
 * Returns the stored path (to persist), or a clear error message.
 */
export async function uploadClientFile(
  clientId: string,
  file: File,
): Promise<{ path: string | null; error: string | null }> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${clientId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file);
  if (error) {
    console.error("[storage] upload", error);
    return {
      path: null,
      error: isBucketMissing(error.message)
        ? "Le stockage de fichiers n'est pas configuré (bucket « client-files » absent — applique la migration storage_client_files)."
        : `Échec de l'envoi du fichier : ${error.message}`,
    };
  }
  return { path, error: null };
}

/** Returns a short-lived (1 h) signed URL for a stored file path, or null. */
export async function getClientFileUrl(
  path: string,
  downloadName?: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600, downloadName ? { download: downloadName } : undefined);
  if (error) {
    console.error("[storage] signed url", error);
    return null;
  }
  return data.signedUrl;
}

/** Opens a stored file in a new tab via a fresh signed URL. */
export async function openClientFile(path: string, downloadName?: string) {
  const url = await getClientFileUrl(path, downloadName);
  if (url) window.open(url, "_blank", "noopener");
}

// ─────────────────────────────────────────────────────────────────────────────
// Kit assets — shared catalogue bucket "kit-files" (CSM writes, all read).
// ─────────────────────────────────────────────────────────────────────────────
const KIT_BUCKET = "kit-files";

/** Uploads a kit asset under "<category>/<itemId>/…". Returns path or error. */
export async function uploadKitFile(
  category: "lancement" | "animation" | "email" | "visuels",
  itemId: string,
  file: File,
): Promise<{ path: string | null; error: string | null }> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${category}/${itemId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;
  const { error } = await supabase.storage.from(KIT_BUCKET).upload(path, file);
  if (error) {
    console.error("[storage] kit upload", error);
    return {
      path: null,
      error: isBucketMissing(error.message)
        ? "Le stockage de fichiers de kits n'est pas configuré (bucket « kit-files » absent — applique la migration storage_kit_files)."
        : `Échec de l'envoi du fichier : ${error.message}`,
    };
  }
  return { path, error: null };
}

/** Opens a kit asset in a new tab. Legacy filenames (no "/") are skipped. */
export async function openKitFile(path: string, downloadName?: string) {
  if (!path || !path.includes("/")) return; // legacy plain filename — nothing to fetch
  const { data, error } = await supabase.storage
    .from(KIT_BUCKET)
    .createSignedUrl(path, 3600, downloadName ? { download: downloadName } : undefined);
  if (error) {
    console.error("[storage] kit signed url", error);
    return;
  }
  window.open(data.signedUrl, "_blank", "noopener");
}

/** Returns a short-lived (1 h) signed URL for a kit asset, or null. Used for
 *  in-page thumbnail previews (no download attribute). */
export async function getKitFileUrl(path: string): Promise<string | null> {
  if (!path || !path.includes("/")) return null;
  const { data, error } = await supabase.storage
    .from(KIT_BUCKET)
    .createSignedUrl(path, 3600);
  if (error) {
    console.error("[storage] kit preview url", error);
    return null;
  }
  return data.signedUrl;
}

/** Friendly filename for a kit path. Strips the "<timestamp>-<rand>-" prefix. */
export function kitFileLabel(path: string): string {
  if (!path) return "";
  const last = path.split("/").pop() ?? path;
  return last.replace(/^\d+-[a-z0-9]+-/, "");
}
