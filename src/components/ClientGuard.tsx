"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { impersonationStore } from "@/lib/impersonation-store";
import { ClientContextProvider, type ActiveClient } from "@/lib/client-context";

/**
 * Gate for the client portal (the `(client)` route group).
 *  • Not logged in        → /login
 *  • CSM, not previewing   → /csm
 *  • CSM, previewing       → portal, scoped to the previewed company
 *  • Client                → portal, scoped to their own company
 *
 * Once resolved, the active client is exposed via ClientContext so pages read
 * it from React state (`useActiveClient`) — no module-load race, no reload.
 * The Supabase RLS policies remain the real data boundary.
 */
export default function ClientGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [active, setActive] = useState<ActiveClient | null>(null);

  useEffect(() => {
    let alive = true;

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
      if (!alive) return;
      if (!profile) {
        router.replace("/login");
        return;
      }

      if (profile.role === "csm") {
        // A CSM only reaches the portal in preview mode.
        const ctx = impersonationStore.get();
        if (ctx && ctx.mode === "csm-preview") {
          setActive({ clientId: ctx.clientId, clientName: ctx.clientName, color: ctx.color });
        } else {
          router.replace("/csm");
        }
        return;
      }

      // Client — scope the portal to their own company.
      if (!profile.client_id) {
        router.replace("/login");
        return;
      }
      const { data: company } = await supabase
        .from("clients")
        .select("name, color")
        .eq("id", profile.client_id)
        .single();
      if (!alive) return;
      const resolved: ActiveClient = {
        clientId: profile.client_id,
        clientName: company?.name ?? "",
        color: company?.color ?? "#5eead4",
      };
      // Keep the impersonation store in sync (CSM-preview banner / legacy reads).
      impersonationStore.set({ mode: "self", ...resolved });
      setActive(resolved);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  if (!active) {
    return (
      <div className="flex h-full items-center justify-center bg-[#061a16]">
        <div className="flex items-center gap-2.5 text-[13px] text-[#94a8a0]">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1a3530] border-t-[#5eead4]" />
          Chargement de votre espace…
        </div>
      </div>
    );
  }

  return <ClientContextProvider value={active}>{children}</ClientContextProvider>;
}
