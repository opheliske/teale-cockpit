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
