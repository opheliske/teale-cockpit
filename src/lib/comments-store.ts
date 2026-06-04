import { supabase, ensureSession } from "@/lib/supabase";
import { notifyChange, watchChanges } from "@/lib/sync";

export type PlanComment = {
  id: number;
  threadId: string;
  clientId: string;
  author: "client" | "csm";
  text: string;
  date: string; // ISO
};

function fromRow(row: Record<string, unknown>): PlanComment {
  return {
    id: Number(row.id),
    threadId: row.thread_id as string,
    clientId: (row.client_id as string) ?? "",
    author: row.author as "client" | "csm",
    text: row.text as string,
    date: row.created_at as string,
  };
}

let _comments: PlanComment[] = [];
const _loadedThreads = new Set<string>();
const _listeners = new Set<() => void>();

// Re-fetch every loaded thread when a comment changed elsewhere.
async function reloadThreads() {
  if (!(await ensureSession())) return;
  for (const threadId of _loadedThreads) {
    const { data } = await supabase
      .from("plan_comments")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at");
    if (data) {
      _comments = [
        ..._comments.filter((c) => c.threadId !== threadId),
        ...data.map(fromRow),
      ];
    }
  }
  notify();
}
watchChanges(["plan_comments"], () => {
  void reloadThreads();
});

function notify() {
  _listeners.forEach((l) => l());
}

export const commentsStore = {
  getByThread: (threadId: string): PlanComment[] =>
    _comments.filter((c) => c.threadId === threadId),

  load: async (threadId: string) => {
    if (_loadedThreads.has(threadId)) return;
    if (!(await ensureSession())) return;
    const { data, error } = await supabase
      .from("plan_comments")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at");
    // Only mark the thread loaded once we actually have its rows — a transient
    // failure must not freeze it permanently empty (no retry, reload-only).
    if (error || !data) {
      if (error) console.error("[comments-store] load", error);
      return;
    }
    _loadedThreads.add(threadId);
    const fetched = data.map(fromRow);
    _comments = [
      ..._comments.filter((c) => c.threadId !== threadId),
      ...fetched,
    ];
    notify();
  },

  // clientId scopes the comment to a company so RLS can isolate it: a client
  // can only insert/read comments for its own company.
  add: async (
    threadId: string,
    clientId: string,
    author: "client" | "csm",
    text: string,
  ) => {
    if (!(await ensureSession())) return;
    const { data } = await supabase
      .from("plan_comments")
      .insert({ thread_id: threadId, client_id: clientId, author, text })
      .select()
      .single();
    if (data) {
      _comments = [..._comments, fromRow(data)];
      notify();
      notifyChange("plan_comments");
    }
  },

  subscribe: (listener: () => void): (() => void) => {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  },
};
