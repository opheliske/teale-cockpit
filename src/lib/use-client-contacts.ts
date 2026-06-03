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
      // Try the full select first. If `last_sign_in_at` hasn't been added
      // yet (migration not applied), Postgres returns 42703 — we retry
      // without that column so the contacts list still loads.
      type Row = { id: string; full_name: string; email: string; last_sign_in_at?: string | null };
      let rows: Row[] | null = null;
      let err: { message: string; code?: string } | null = null;
      {
        const r = await supabase
          .from("profiles")
          .select("id, full_name, email, last_sign_in_at")
          .eq("role", "client")
          .eq("client_id", clientId)
          .order("full_name");
        rows = (r.data as Row[] | null) ?? null;
        err = r.error;
      }
      if (err && err.code === "42703") {
        console.warn(
          "[use-client-contacts] profiles.last_sign_in_at absent — applique la migration profiles_last_sign_in pour afficher la dernière connexion.",
        );
        const fallback = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("role", "client")
          .eq("client_id", clientId)
          .order("full_name");
        rows = (fallback.data as Row[] | null) ?? null;
        err = fallback.error;
      }
      if (err) console.error("[use-client-contacts]", err);
      if (active) {
        setContacts(
          (rows ?? []).map((r) => ({
            id: r.id,
            full_name: r.full_name,
            email: r.email,
            last_sign_in_at: r.last_sign_in_at ?? null,
          })),
        );
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [clientId]);

  return { contacts, loading };
}
