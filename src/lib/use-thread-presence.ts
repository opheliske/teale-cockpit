"use client";

import { useEffect, useRef, useState } from "react";
import { supabase, ensureSession } from "@/lib/supabase";
import { watchChanges } from "@/lib/sync";

// Indicateur « en train d'écrire » via Supabase Realtime Broadcast, par fil.
// `notifyTyping()` (throttlé) diffuse un ping ; `otherTyping` passe à true ~3,5 s
// quand l'autre côté écrit.
export function useThreadTyping(
  threadId: string,
  side: "csm" | "client",
): { otherTyping: boolean; notifyTyping: () => void } {
  const [otherTyping, setOtherTyping] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const clearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentRef = useRef(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset à chaque changement de fil
    setOtherTyping(false);
    const ch = supabase.channel(`thread-typing-${threadId}`, {
      config: { broadcast: { self: false } },
    });
    ch.on("broadcast", { event: "typing" }, (msg) => {
      if ((msg.payload as { side?: string })?.side === side) return; // ignore son propre côté
      setOtherTyping(true);
      if (clearRef.current) clearTimeout(clearRef.current);
      clearRef.current = setTimeout(() => setOtherTyping(false), 3500);
    });
    ch.subscribe();
    channelRef.current = ch;
    return () => {
      if (clearRef.current) clearTimeout(clearRef.current);
      void supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [threadId, side]);

  const notifyTyping = () => {
    const now = Date.now();
    if (now - lastSentRef.current < 1500) return; // limite la fréquence des pings
    lastSentRef.current = now;
    void channelRef.current?.send({ type: "broadcast", event: "typing", payload: { side } });
  };

  return { otherTyping, notifyTyping };
}

// « Lu » : dernier horodatage de lecture de l'AUTRE participant pour ce fil
// (ms epoch, 0 si aucun). Réagit aux changements realtime de comment_reads.
export function useThreadOtherSeen(threadId: string): number {
  const [seen, setSeen] = useState(0);
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!(await ensureSession())) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("comment_reads")
        .select("user_id, last_seen_at")
        .eq("thread_id", threadId);
      if (!active || !data) return;
      let max = 0;
      for (const r of data) {
        if (r.user_id === user.id) continue;
        const ms = new Date(r.last_seen_at as string).getTime();
        if (ms > max) max = ms;
      }
      setSeen(max);
    };
    void load();
    const unwatch = watchChanges(["comment_reads"], () => void load());
    return () => {
      active = false;
      unwatch();
    };
  }, [threadId]);
  return seen;
}
