"use client";

import { useEffect, useState } from "react";
import { sessionStatusStore, type SessionStatus } from "@/lib/session-status-store";
import { supabase } from "@/lib/supabase";
import { closeSync } from "@/lib/sync";

/**
 * Sticky red banner at the top of the viewport when the session is no
 * longer usable. Catches the case where the LockManager in auth-js
 * deadlocks: no SIGNED_OUT event fires, but every PostgREST write goes
 * out anonymous and is silently denied by RLS. Before this banner, the
 * user had no way to tell.
 *
 * Click "Se reconnecter" → signOut + hard nav to /login.
 */
export default function SessionStatusBanner() {
  const [status, setStatus] = useState<SessionStatus>(() => sessionStatusStore.get());

  useEffect(() => {
    return sessionStatusStore.subscribe(() => setStatus(sessionStatusStore.get()));
  }, []);

  if (status !== "lost") return null;

  const handleReconnect = async () => {
    try {
      // Tear down realtime/broadcast first so the next page lands clean.
      closeSync();
      await supabase.auth.signOut();
    } catch {
      // signOut can hang on a deadlocked LockManager — we redirect anyway.
    }
    if (typeof window !== "undefined") {
      window.location.replace("/login");
    }
  };

  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-[200] flex items-center justify-center gap-3 border-b border-[#7a2a2a] bg-[#3a1414] px-5 py-2.5 text-[13px] text-[#ffd9d9] shadow-lg"
    >
      <span aria-hidden className="text-[15px]">⚠️</span>
      <span>
        <strong className="font-semibold">Session expirée</strong>{" "}
        — vos modifications ne sont plus enregistrées.
      </span>
      <button
        onClick={() => { void handleReconnect(); }}
        className="ml-1 rounded-[6px] bg-[#ff6b6b] px-3 py-1 text-[12px] font-semibold text-[#2a0a0a] transition-opacity hover:opacity-90"
      >
        Se reconnecter
      </button>
    </div>
  );
}
