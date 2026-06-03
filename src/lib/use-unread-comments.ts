"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase, ensureSession } from "@/lib/supabase";
import { watchChanges } from "@/lib/sync";
import { getThreadLastSeen, subscribeReadState } from "@/lib/comments-read-state";

export type UnreadThreadSummary = {
  threadId: string;
  clientId: string;
  count: number;
  latestDate: string; // ISO
  latestText: string;
};

type Side = "csm" | "client";

/**
 * Returns the threads where the OTHER side has posted at least one message
 * since this side last opened them.
 *
 *   side="csm"    → unread messages authored by clients
 *                   (RLS already scopes to clients the CSM owns ; pass
 *                    `clientId` to narrow to a single client)
 *   side="client" → unread messages authored by the CSM, scoped to the
 *                   client's own company (RLS enforces)
 *
 * The "last seen" timestamps live in localStorage via comments-read-state.
 */
export function useUnreadComments(
  side: Side,
  clientId?: string | null,
): { unread: Map<string, UnreadThreadSummary>; loading: boolean } {
  type Row = {
    thread_id: string;
    client_id: string;
    author: "csm" | "client";
    text: string;
    created_at: string;
  };
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  // Bumped whenever a thread is marked read so consumers re-evaluate.
  const [readTick, setReadTick] = useState(0);

  useEffect(() => {
    let active = true;
    const otherAuthor: Side = side === "csm" ? "client" : "csm";
    const load = async () => {
      if (!(await ensureSession())) return;
      let query = supabase
        .from("plan_comments")
        .select("thread_id, client_id, author, text, created_at")
        .eq("author", otherAuthor)
        .order("created_at", { ascending: false });
      if (clientId) query = query.eq("client_id", clientId);
      const { data, error } = await query;
      if (!active) return;
      if (error) {
        console.error("[use-unread-comments] load", error);
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

  const unread = useMemo(() => {
    // `readTick` is intentionally a dependency: it forces re-evaluation
    // when getThreadLastSeen() returns a fresh value after markThreadRead.
    void readTick;
    const byThread = new Map<string, Row[]>();
    for (const r of rows) {
      const list = byThread.get(r.thread_id) ?? [];
      list.push(r);
      byThread.set(r.thread_id, list);
    }
    const result = new Map<string, UnreadThreadSummary>();
    for (const [threadId, list] of byThread) {
      // `list` is already sorted desc by created_at thanks to the query.
      const latest = list[0];
      const seenAt = getThreadLastSeen(side, threadId);
      const newer = list.filter((r) => new Date(r.created_at).getTime() > seenAt);
      if (newer.length === 0) continue;
      result.set(threadId, {
        threadId,
        clientId: latest.client_id,
        count: newer.length,
        latestDate: latest.created_at,
        latestText: latest.text,
      });
    }
    return result;
  }, [rows, readTick, side]);

  return { unread, loading };
}
