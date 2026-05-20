"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { impersonationStore } from "@/lib/impersonation-store";

/**
 * Gate for the client space (the `(client)` route group).
 *  • Not logged in        → /login
 *  • CSM, not previewing   → /csm  (a CSM only reaches this space in preview)
 *  • CSM, previewing       → allowed
 *  • Client                → allowed, with the active client context seeded
 *                            to their own company.
 * The Supabase RLS policies remain the real data boundary — this is UX only.
 */
export default function ClientGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, client_id")
        .eq("id", user.id)
        .single();
      if (!active) return;
      if (!profile) {
        router.replace("/login");
        return;
      }

      if (profile.role === "csm") {
        const ctx = impersonationStore.get();
        if (ctx && ctx.mode === "csm-preview") setAllowed(true);
        else router.replace("/csm");
        return;
      }

      // Client — point the active context at their own company.
      if (!profile.client_id) {
        router.replace("/login");
        return;
      }
      const ctx = impersonationStore.get();
      if (!ctx || ctx.clientId !== profile.client_id) {
        const { data: company } = await supabase
          .from("clients")
          .select("name, color")
          .eq("id", profile.client_id)
          .single();
        if (!active) return;
        impersonationStore.set({
          mode: "self",
          clientId: profile.client_id,
          clientName: company?.name ?? "",
          color: company?.color ?? "#5eead4",
        });
        // Some pages read the client id at module load (e.g. mon-planning).
        // Reload once so they pick up the freshly-seeded context.
        window.location.reload();
        return;
      }
      setAllowed(true);
    })();

    return () => {
      active = false;
    };
  }, [router]);

  if (!allowed) return null;
  return <>{children}</>;
}
