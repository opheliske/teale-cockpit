"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { impersonationStore } from "@/lib/impersonation-store";

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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (active) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("id, role, client_id, full_name, email")
        .eq("id", user.id)
        .single();
      if (active) {
        setProfile((data as Profile) ?? null);
        setLoading(false);
      }
    }

    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { profile, loading };
}

/**
 * Signs the user out, clears the active client context, and sends them to
 * the login page. Uses a hard navigation so the proxy re-evaluates with the
 * cleared session cookies and no stale client state survives.
 */
export async function signOut() {
  try {
    // scope "local" clears the local session without a network round-trip,
    // so the redirect can't hang on a slow/offline revocation request.
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Ignore — we still clear the local context and leave the app.
  }
  impersonationStore.set(null);
  window.location.href = "/login";
}
