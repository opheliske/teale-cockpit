"use client";

import { useEffect } from "react";
import { supabase, ensureSession, REFRESH_MARGIN_MS } from "@/lib/supabase";
import { forceReloadAll } from "@/lib/sync";

/**
 * Keeps the Supabase auth session healthy while the app is open.
 *
 * Background: the JWT expires (1 h by default, but some projects use a
 * shorter TTL like 2 min for tighter security). The `@supabase/auth-js`
 * client is supposed to rotate it automatically, but its internal
 * Navigator LockManager can deadlock — the same fragility we already work
 * around in signOut. When that happens, the token stays expired, every
 * query goes anonymous, the RLS returns zero rows and the whole UI looks
 * empty without any error message.
 *
 * This watchdog covers four failure modes:
 *   1. Session genuinely lost (server-side rejection, sign-out elsewhere):
 *      onAuthStateChange → SIGNED_OUT / TOKEN_REFRESHED-without-session →
 *      hard navigation to /login.
 *   2. Tab regains focus after a long absence: visibilitychange triggers
 *      ensureSession, which forces a refresh attempt and validates.
 *   3. Token rotates while you're on the page (TOKEN_REFRESHED with a
 *      fresh session): every store may have cached empty data from a query
 *      that raced the expired token, so we ask them all to re-fetch.
 *   4. Page is open and idle for the JWT TTL: nothing was triggering
 *      ensureSession, the auth-js internal auto-refresh deadlocks, the
 *      token expires and the next interaction silently fails. We avoid
 *      this by running our own proactive refresh timer based on the
 *      current session's `expires_at`.
 */
// How long before `expires_at` the proactive timer should fire. Set
// slightly inside REFRESH_MARGIN_MS so ensureSession ALWAYS treats the
// scheduled tick as "needs refresh".
const PROACTIVE_LEAD_MS = REFRESH_MARGIN_MS + 5_000;
// Clamp the proactive timer so it doesn't oscillate when something off
// (clock drift, very short TTL). Never sooner than 15 s, never later than
// 30 min — a refresh attempt twice per hour at worst is fine.
const MIN_PROACTIVE_DELAY_MS = 15_000;
const MAX_PROACTIVE_DELAY_MS = 30 * 60 * 1000;

export default function SessionWatchdog() {
  useEffect(() => {
    let mounted = true;
    let proactiveTimer: ReturnType<typeof setTimeout> | null = null;

    const goToLogin = () => {
      if (typeof window === "undefined") return;
      if (window.location.pathname === "/login") return;
      window.location.replace("/login");
    };

    const validateSession = async () => {
      try {
        // ensureSession also forces a refresh when the token is near expiry,
        // so coming back to the tab after a long absence revives the
        // in-memory JWT. Its TOKEN_REFRESHED side-effect triggers
        // forceReloadAll() via the onAuthStateChange handler below.
        const ok = await ensureSession();
        if (!mounted) return;
        if (!ok) goToLogin();
      } catch {
        // network blip — leave it; the next event/visibility will retry
      }
    };

    // Walk the current cookie session and arm a setTimeout that fires
    // PROACTIVE_LEAD_MS before its expires_at. On fire, run ensureSession
    // (which refreshes if needed, marks status), then this same scheduler
    // re-runs via the TOKEN_REFRESHED handler below.
    const scheduleNextRefresh = async () => {
      if (proactiveTimer) { clearTimeout(proactiveTimer); proactiveTimer = null; }
      if (!mounted) return;
      const { data } = await supabase.auth.getSession();
      const exp = (data.session?.expires_at ?? 0) * 1000;
      if (!exp) return; // no session — nothing to refresh
      const untilRefresh = exp - Date.now() - PROACTIVE_LEAD_MS;
      const delay = Math.max(MIN_PROACTIVE_DELAY_MS, Math.min(MAX_PROACTIVE_DELAY_MS, untilRefresh));
      proactiveTimer = setTimeout(() => {
        if (!mounted) return;
        void validateSession();
        // validateSession's success path fires TOKEN_REFRESHED, which
        // re-arms the timer. Re-arm here too as a safety net for the case
        // where the refresh produced no event (e.g. cookie was already
        // fresh enough so ensureSession returned without calling refreshSession).
        void scheduleNextRefresh();
      }, delay);
    };

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (event === "TOKEN_REFRESHED" && !session)) {
        if (proactiveTimer) { clearTimeout(proactiveTimer); proactiveTimer = null; }
        goToLogin();
        return;
      }
      if (event === "TOKEN_REFRESHED" && session) {
        // Fresh token — re-fetch every store in case it had cached empty data
        // from the brief window where the previous token was expired, then
        // re-arm the proactive timer against the new expires_at.
        forceReloadAll();
        void scheduleNextRefresh();
      }
      if (event === "SIGNED_IN" && session) {
        void scheduleNextRefresh();
      }
    });

    const onVisibility = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void validateSession();
        void scheduleNextRefresh();
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
    }

    // Initial arm — covers the case where the user lands on the page and
    // never switches tabs (no visibilitychange) and doesn't trigger a fetch.
    void scheduleNextRefresh();

    return () => {
      mounted = false;
      if (proactiveTimer) clearTimeout(proactiveTimer);
      data.subscription.unsubscribe();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
    };
  }, []);

  return null;
}
