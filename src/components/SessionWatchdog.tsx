"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Watches the Supabase auth state. The JWT expires every hour by default; if
 * auto-refresh quietly fails (the @supabase/auth-js LockManager bug we already
 * work around in signOut), the token stays expired — RLS then returns zero
 * rows on every query and the whole UI looks empty without any error.
 *
 * Rather than letting the user stare at an empty cockpit, when the session
 * really is lost we send them to /login. The proxy then takes over and
 * re-validates fresh tokens on the next render.
 */
export default function SessionWatchdog() {
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // SIGNED_OUT fires when the session is invalidated (server-side
      // rejection, manual signOut, or refresh that came back without a
      // session). TOKEN_REFRESHED with a null session means the same thing.
      const sessionLost =
        event === "SIGNED_OUT" || (event === "TOKEN_REFRESHED" && !session);
      if (!sessionLost) return;
      if (typeof window === "undefined") return;
      if (window.location.pathname === "/login") return;
      window.location.replace("/login");
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  return null;
}
