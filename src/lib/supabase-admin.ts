import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// ─────────────────────────────────────────────────────────────────────────────
// Admin-only server utilities. Imported EXCLUSIVELY by the /api/admin route
// handlers (server-side), each of which calls requireAdmin() before touching
// the privileged client. The service_role key must never reach the browser —
// never import this module from a client component ("use client").
// ─────────────────────────────────────────────────────────────────────────────

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * A Supabase client authenticated with the service_role key. It BYPASSES Row
 * Level Security and can call the auth admin API (createUser, deleteUser,
 * updateUserById, …). Create it only inside an admin-gated route handler.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  // Fail with an actionable message instead of supabase-js's cryptic
  // "supabaseKey is required." A missing key almost always means the dev
  // server was started before the var was in .env.local (restart it), or the
  // deployment env doesn't define SUPABASE_SERVICE_ROLE_KEY.
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY absente de l'environnement serveur. " +
        "En local : redémarrez `npm run dev` après l'avoir ajoutée à .env.local. " +
        "En production : définissez-la dans les variables d'environnement du déploiement.",
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export class AdminAuthError extends Error {
  constructor(
    public readonly status: 401 | 403,
    message: string,
  ) {
    super(message);
    this.name = "AdminAuthError";
  }
}

/**
 * Verifies the caller (via their session cookie) is a logged-in admin.
 * Throws AdminAuthError(401|403) otherwise. Role is read from app_metadata —
 * the same authoritative source the proxy uses; it cannot be self-edited.
 * Returns the service_role client for the handler to use.
 */
export async function requireAdmin(): Promise<SupabaseClient> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new AdminAuthError(401, "Not authenticated");
  if (user.app_metadata?.role !== "admin") {
    throw new AdminAuthError(403, "Admin access required");
  }
  return createSupabaseAdminClient();
}

/** Maps a thrown error to a JSON Response; rethrows unknown errors' messages. */
export function adminErrorResponse(err: unknown): Response {
  if (err instanceof AdminAuthError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  const message = err instanceof Error ? err.message : "Unexpected error";
  return Response.json({ error: message }, { status: 500 });
}
