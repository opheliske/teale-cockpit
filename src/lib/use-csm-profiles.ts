"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type CsmProfile = { id: string; full_name: string };

/**
 * Loads every CSM profile — used for the CSM filters/picker and the
 * "responsable" owner dropdown. Includes `admin` accounts : admin is a superset
 * of CSM (cf. is_csm()) et peut être propriétaire de clients ; sans ça, un admin
 * en charge de clients apparaît « Non assigné » et n'est pas sélectionnable.
 */
export function useCsmProfiles() {
  const [profiles, setProfiles] = useState<CsmProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      // Wait for the session before querying — otherwise the request can go
      // out unauthenticated and RLS returns no rows.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (active) {
          setProfiles([]);
          setLoading(false);
        }
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("role", ["csm", "admin"])
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
