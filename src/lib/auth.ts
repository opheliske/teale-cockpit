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
 * Signs the user out and sends them to the login page.
 *
 * Made bulletproof on purpose: `supabase.auth.signOut()` can hang (a stuck
 * internal auth lock), which previously blocked the redirect entirely. So we
 * cap the call with a timeout AND clear the Supabase auth cookies ourselves,
 * then do a hard navigation — the proxy then sees no session.
 */
export async function signOut() {
  impersonationStore.set(null);

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
