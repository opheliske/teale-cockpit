"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type CsmProfile = { id: string; full_name: string };

/** Loads every CSM profile (role = 'csm') — used for the CSM filters/picker. */
export function useCsmProfiles() {
  const [profiles, setProfiles] = useState<CsmProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "csm")
        .order("full_name");
      if (error) console.error("[use-csm-profiles]", error);
      if (active) {
        setProfiles((data as CsmProfile[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return { profiles, loading };
}
