import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser Supabase client. Uses the connected user's session (stored in
// cookies via @supabase/ssr) — never the service_role key. All reads/writes
// are therefore filtered by the Row Level Security policies.
export const supabase = createBrowserClient(url, key);

// Refresh the access token if it expires within this many ms. 60 s gives
// the next request plenty of head-room — we never want a query to leave
// the browser with a token that's about to flip to invalid.
const REFRESH_MARGIN_MS = 60_000;
// Hard cap on the refresh round-trip. auth-js's LockManager has been
// observed to deadlock (same fragility we already work around in signOut
// and SessionWatchdog); without a timeout, the caller would hang.
const REFRESH_TIMEOUT_MS = 5_000;

/**
 * Resolves to `true` once the browser has a usable session whose access
 * token is *not* about to expire. Proactively forces a refresh when needed,
 * so callers never query PostgREST with a stale JWT.
 *
 * Background: the supabase-js client is supposed to auto-refresh the JWT
 * every hour. In practice, its LockManager can deadlock — when it does, the
 * in-memory token stays expired, every PostgREST request is treated as
 * anonymous, RLS returns `[]` with no error, and the stores write that
 * empty list to their cache, wiping the UI. The user only recovers via a
 * hard refresh (which re-reads the session from the cookie).
 *
 * Callers should treat `false` as "the session can't be used right now —
 * do not overwrite the cache". A subsequent TOKEN_REFRESHED (fired by this
 * function on success) or visibilitychange will retry the fetch.
 */
export async function ensureSession(): Promise<boolean> {
  // 1) Wait up to ~2 s for the cookie-side session to hydrate into memory.
  let session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] = null;
  for (let i = 0; i < 20; i++) {
    const { data } = await supabase.auth.getSession();
    if (data.session) { session = data.session; break; }
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!session) return false;

  // 2) If the token expires within the margin, force a refresh — bounded
  // by REFRESH_TIMEOUT_MS so a deadlocked LockManager can't hang us.
  const expiresAtMs = (session.expires_at ?? 0) * 1000;
  if (expiresAtMs - Date.now() < REFRESH_MARGIN_MS) {
    try {
      const fresh = await Promise.race([
        supabase.auth.refreshSession().then(({ data }) => data.session),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), REFRESH_TIMEOUT_MS)),
      ]);
      if (!fresh) return false;
    } catch {
      return false;
    }
  }
  return true;
}
