"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase, ensureSession } from "@/lib/supabase";
import { watchChanges } from "@/lib/sync";
import { getThreadLastSeen, subscribeReadState } from "@/lib/comments-read-state";

export type ThreadSummary = {
  threadId: string;
  clientId: string;
  lastText: string;
  lastDate: string; // ISO
  lastAuthor: "client" | "csm";
  unread: number; // messages de l'autre côté postérieurs au dernier « vu »
};

/**
 * Tous les fils de discussion visibles, triés du plus récent au plus ancien,
 * pour la vue « Messages » unifiée. Côté CSM (`side="csm"`) : tous ses clients
 * (RLS). Côté client : sa société (le filtre clientId est redondant mais sûr).
 */
export function useMessageThreads(
  side: "csm" | "client",
  clientId?: string | null,
): { threads: ThreadSummary[]; loading: boolean } {
  type Row = {
    thread_id: string;
    client_id: string;
    author: "client" | "csm";
    text: string;
    created_at: string;
  };
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [readTick, setReadTick] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!(await ensureSession())) return;
      let query = supabase
        .from("plan_comments")
        .select("thread_id, client_id, author, text, created_at")
        .order("created_at", { ascending: true });
      if (side === "client" && clientId) query = query.eq("client_id", clientId);
      const { data, error } = await query;
      if (!active) return;
      if (error) {
        console.error("[use-message-threads]", error);
        setLoading(false);
        return;
      }
      setRows((data ?? []) as Row[]);
      setLoading(false);
    };
    void load();
    const unwatch = watchChanges(["plan_comments"], () => void load());
    const unsubRead = subscribeReadState(() => setReadTick((t) => t + 1));
    return () => {
      active = false;
      unwatch();
      unsubRead();
    };
  }, [side, clientId]);

  const threads = useMemo<ThreadSummary[]>(() => {
    void readTick;
    const otherAuthor = side === "csm" ? "client" : "csm";
    const byThread = new Map<string, Row[]>();
    for (const r of rows) {
      const list = byThread.get(r.thread_id) ?? [];
      list.push(r);
      byThread.set(r.thread_id, list);
    }
    const out: ThreadSummary[] = [];
    for (const [threadId, list] of byThread) {
      const last = list[list.length - 1]; // trié asc par created_at
      const seenAt = getThreadLastSeen(threadId);
      const unread = list.filter(
        (r) => r.author === otherAuthor && new Date(r.created_at).getTime() > seenAt,
      ).length;
      out.push({
        threadId,
        clientId: last.client_id,
        lastText: last.text,
        lastDate: last.created_at,
        lastAuthor: last.author,
        unread,
      });
    }
    out.sort((a, b) => b.lastDate.localeCompare(a.lastDate));
    return out;
  }, [rows, side, readTick]);

  return { threads, loading };
}
