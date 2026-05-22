"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { impersonationStore } from "@/lib/impersonation-store";

export default function ClientImpersonationBanner() {
  const router = useRouter();
  // External-store subscription — no setState-in-effect.
  const state = useSyncExternalStore(
    impersonationStore.subscribe,
    impersonationStore.get,
    impersonationStore.get,
  );

  // Only shown when a CSM is previewing — never for a client viewing their own space.
  if (!state || state.mode !== "csm-preview") return null;

  function exit() {
    const id = state?.clientId;
    impersonationStore.set(null);
    router.push(id ? `/csm/clients/${id}` : "/csm");
  }

  return (
    <div
      className="sticky top-0 z-50 flex items-center justify-between gap-3 px-5 py-2"
      style={{ background: state.color, minHeight: 36 }}
    >
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-black/60">
          Mode aperçu CSM
        </span>
        <span className="text-[11px] font-semibold text-black/80">
          — vous voyez l&apos;espace de{" "}
          <span className="font-bold text-black">{state.clientName}</span>
        </span>
      </div>
      <button
        onClick={exit}
        className="flex items-center gap-1.5 rounded-md bg-black/15 px-3 py-1 text-[11px] font-semibold text-black/80 transition hover:bg-black/25"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Retour au cockpit CSM
      </button>
    </div>
  );
}
