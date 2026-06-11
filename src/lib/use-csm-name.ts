"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useActiveClient } from "@/lib/client-context";

/**
 * Nom du CSM propriétaire de la société du client connecté — pour personnaliser
 * le chat côté client (« Ophélie » plutôt que « CSM »). Le client lit son
 * `owner_csm_id` (table clients, RLS OK) puis le `full_name` du profil
 * correspondant (RLS profiles_select_own_csm). Replie sur « CSM ».
 */
export function useCsmName(): string {
  const { clientId } = useActiveClient();
  const [name, setName] = useState("CSM");

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!clientId) return;
      const { data: company } = await supabase
        .from("clients")
        .select("owner_csm_id")
        .eq("id", clientId)
        .maybeSingle();
      const ownerId = (company?.owner_csm_id as string | null) ?? null;
      if (!ownerId) return;
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", ownerId)
        .maybeSingle();
      const full = ((prof?.full_name as string | null) ?? "").trim();
      if (alive && full) setName(full);
    })();
    return () => {
      alive = false;
    };
  }, [clientId]);

  return name;
}
