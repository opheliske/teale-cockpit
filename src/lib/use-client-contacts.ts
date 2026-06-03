"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type ClientContact = {
  id: string;
  full_name: string;
  email: string;
  last_sign_in_at: string | null;
};

/** Lists the client-role profiles attached to a given client (= the people
 *  who have an account on the client space). CSM-only — relies on the
 *  profiles RLS that lets CSMs read every profile. */
export function useClientContacts(clientId: string | null | undefined) {
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      // No client selected → empty list. Wrapped in the async closure to
      // avoid the react-hooks/set-state-in-effect lint that flags direct
      // synchronous setState calls in an effect body.
      if (!clientId) {
        if (active) {
          setContacts([]);
          setLoading(false);
        }
        return;
      }
      // Wait for the session before querying — otherwise the request can go
      // out unauthenticated and RLS returns no rows.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (active) {
          setContacts([]);
          setLoading(false);
        }
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, last_sign_in_at")
        .eq("role", "client")
        .eq("client_id", clientId)
        .order("full_name");
      if (error) console.error("[use-client-contacts]", error);
      if (active) {
        setContacts((data as ClientContact[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [clientId]);

  return { contacts, loading };
}
