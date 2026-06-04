"use client";

import { useEffect, useState } from "react";
import { supabase, ensureSession } from "@/lib/supabase";
import { impersonationStore } from "@/lib/impersonation-store";
import { closeSync } from "@/lib/sync";
import { sessionStatusStore } from "@/lib/session-status-store";

export type UserRole = "csm" | "client";

export type Profile = {
  id: string;
  role: UserRole;
  client_id: string | null;
  full_name: string;
  email: string;
};

/**
 * Loads the current user's profile (role, company, name) from Supabase.
 * Returns { profile: null } when nobody is logged in.
 */
export function useAuth() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      // A silently-expired JWT (auth-js LockManager deadlock) would send the
      // SELECT out anonymous and RLS would return nothing. Crucially we must
      // NOT blank `profile` on a transient failure: load() re-runs on every
      // onAuthStateChange (TOKEN_REFRESHED fires often), and nulling the
      // profile cascades into UI that zeroes itself (e.g. the CSM home clears
      // its client list when profile.id is missing). So a failure just stops
      // updating — we keep the last good profile and let a later event retry.
      // A real sign-out is handled explicitly below.
      if (!(await ensureSession())) {
        if (active) setLoading(false);
        return;
      }
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (!user) {
        // ensureSession() only checks the token's *local* expiry. getUser()
        // validates it against the Auth server, so a 401/403 here means the
        // session is genuinely dead (revoked/expired refresh token, deleted
        // user) even though the cached token hadn't "expired" yet — exactly
        // the case a page reload can't fix. Escalate to "lost" so the
        // watchdog signs out cleanly and routes to /login, instead of leaving
        // the CSM area (which has no ClientGuard) stuck showing "—".
        // A network error has no HTTP status — treat that as transient.
        const status = (userErr as { status?: number } | null)?.status;
        if (status === 401 || status === 403) sessionStatusStore.set("lost");
        if (active) setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, client_id, full_name, email")
        .eq("id", user.id)
        .single();
      if (error) {
        // Transient fetch failure — keep the last good profile rather than
        // blanking it (same rationale as the guard above).
        console.error("[useAuth] profile fetch failed:", error);
        if (active) setLoading(false);
        return;
      }
      if (active) {
        setProfile((data as Profile) ?? null);
        setLoading(false);
      }
    }

    load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      // Only a genuine sign-out clears the profile; every other event just
      // refreshes it (without blanking on transient failure — see load()).
      if (event === "SIGNED_OUT") {
        if (active) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }
      load();
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { profile, loading };
}

/**
 * Signs the user out and sends them to the login page.
 *
 * KNOWN WORKAROUND — `supabase.auth.signOut()` can hang indefinitely when the
 * `@supabase/auth-js` Navigator LockManager lock gets stuck (observed across
 * tabs / after a Realtime socket close; see supabase/auth-js issues around the
 * `lock`/`navigatorLock` behaviour). A hung promise previously blocked the
 * redirect entirely, leaving the user "stuck logged in".
 *
 * So this is deliberately defensive rather than a clean `await signOut()`:
 *   1. Close the Realtime channels / BroadcastChannel (closeSync).
 *   2. Race the real signOut against a 1.5 s timeout — never block on it.
 *   3. Clear the `sb-*` auth cookies ourselves (the actual logout).
 *   4. Hard-navigate to /login — the proxy then sees no session.
 *
 * Revisit (drop the timeout, plain await) once the upstream lock issue is
 * fixed in a future @supabase/auth-js release.
 */
export async function signOut() {
  impersonationStore.set(null);
  closeSync();

  // Best-effort proper sign-out, but never let it block the redirect.
  try {
    await Promise.race([
      supabase.auth.signOut({ scope: "local" }),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
  } catch {
    // Ignore — the cookie clearing below is what actually logs the user out.
  }

  // Drop the Supabase session cookies directly, so the user is logged out
  // even if signOut() never finished.
  if (typeof document !== "undefined") {
    for (const entry of document.cookie.split(";")) {
      const name = entry.split("=")[0].trim();
      if (name.startsWith("sb-")) {
        document.cookie = `${name}=; path=/; max-age=0`;
      }
    }
  }

  window.location.replace("/login");
}
