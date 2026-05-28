import { createBrowserClient } from "@supabase/ssr";
import { sessionStatusStore } from "./session-status-store";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser Supabase client. Uses the connected user's session (stored in
// cookies via @supabase/ssr) — never the service_role key. All reads/writes
// are therefore filtered by the Row Level Security policies.
export const supabase = createBrowserClient(url, key);

// Refresh the access token if it expires within this many ms. 60 s gives
// the next request plenty of head-room — we never want a query to leave
// the browser with a token that's about to flip to invalid.
export const REFRESH_MARGIN_MS = 60_000;
// Hard cap on the refresh round-trip. auth-js's LockManager has been
// observed to deadlock (same fragility we already work around in signOut
// and SessionWatchdog); without a timeout, the caller would hang.
// 8 s instead of 5 s: slow mobile / shaky-wifi connections need more
// headroom; the LockManager deadlock is detected within ~1 s anyway, so
// the extra time only kicks in on a genuinely slow refresh.
const REFRESH_TIMEOUT_MS = 8_000;
// On a refresh failure we don't immediately surface "Session expirée" if
// the cookie still holds a token usable for at least this many ms — the
// queue of pending queries can still succeed; the proactive watchdog
// timer will retry shortly. Otherwise a one-off LockManager hiccup
// would flash the red banner even though everything still works.
const RECOVERY_GRACE_MS = 30_000;

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
  if (!session) {
    sessionStatusStore.set("lost");
    return false;
  }

  // 2) If the token expires within the margin, force a refresh — bounded
  // by REFRESH_TIMEOUT_MS so a deadlocked LockManager can't hang us.
  const expiresAtMs = (session.expires_at ?? 0) * 1000;
  if (expiresAtMs - Date.now() < REFRESH_MARGIN_MS) {
    let refreshed = false;
    try {
      const fresh = await Promise.race([
        supabase.auth.refreshSession().then(({ data }) => data.session),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), REFRESH_TIMEOUT_MS)),
      ]);
      if (fresh) refreshed = true;
    } catch {
      /* fall through to the cookie-recovery path below */
    }

    if (!refreshed) {
      // Refresh failed (LockManager deadlock most often). Don't immediately
      // flag the session as lost — re-read the cookie. If a still-valid
      // token is sitting there, ride it for now; the proactive watchdog
      // timer will retry the refresh on its next tick. We only escalate to
      // "lost" when the cookie itself has gone stale.
      const { data: refetch } = await supabase.auth.getSession();
      const fallback = refetch.session;
      const fallbackExpMs = (fallback?.expires_at ?? 0) * 1000;
      if (fallback && fallbackExpMs - Date.now() > RECOVERY_GRACE_MS) {
        sessionStatusStore.set("ok");
        return true;
      }
      sessionStatusStore.set("lost");
      return false;
    }
  }
  sessionStatusStore.set("ok");
  return true;
}
