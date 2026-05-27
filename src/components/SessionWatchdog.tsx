"use client";

import { useEffect } from "react";
import { supabase, ensureSession } from "@/lib/supabase";
import { forceReloadAll } from "@/lib/sync";

/**
 * Keeps the Supabase auth session healthy while the app is open.
 *
 * Background: the JWT expires every hour (default). The `@supabase/auth-js`
 * client is supposed to rotate it automatically, but its LockManager can
 * deadlock — the same fragility we already work around in signOut. When that
 * happens, the token stays expired, every query goes anonymous, the RLS
 * returns zero rows and the whole UI looks empty without any error message.
 *
 * This watchdog covers the three real failure modes:
 *   1. Session genuinely lost (server-side rejection, sign-out elsewhere):
 *      onAuthStateChange → SIGNED_OUT / TOKEN_REFRESHED-without-session →
 *      hard navigation to /login.
 *   2. Tab regains focus after a long absence: visibilitychange triggers
 *      `getUser()`, which forces a refresh attempt and validates the session.
 *   3. Token rotates while you're on the page (TOKEN_REFRESHED with a fresh
 *      session): every store may have cached empty data from a query that
 *      raced the expired token, so we ask them all to re-fetch.
 */
export default function SessionWatchdog() {
  useEffect(() => {
    let mounted = true;

    const goToLogin = () => {
      if (typeof window === "undefined") return;
      if (window.location.pathname === "/login") return;
      window.location.replace("/login");
    };

    const validateSession = async () => {
      try {
        // ensureSession also forces a refresh when the token is near expiry,
        // so coming back to the tab after a long absence revives the in-memory
        // JWT. Its TOKEN_REFRESHED side-effect triggers forceReloadAll() via
        // the onAuthStateChange handler below, so we don't have to call it
        // here.
        const ok = await ensureSession();
        if (!mounted) return;
        if (!ok) goToLogin();
      } catch {
        // network blip — leave it; the next event/visibility will retry
      }
    };

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (event === "TOKEN_REFRESHED" && !session)) {
        goToLogin();
        return;
      }
      if (event === "TOKEN_REFRESHED" && session) {
        // Fresh token — re-fetch every store in case it had cached empty data
        // from the brief window where the previous token was expired.
        forceReloadAll();
      }
    });

    const onVisibility = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void validateSession();
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
    };
  }, []);

  return null;
}
