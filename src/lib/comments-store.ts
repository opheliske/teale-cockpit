import { supabase } from "@/lib/supabase";

export type PlanComment = {
  id: number;
  threadId: string;
  author: "client" | "csm";
  text: string;
  date: string; // ISO
};

function fromRow(row: Record<string, unknown>): PlanComment {
  return {
    id: Number(row.id),
    threadId: row.thread_id as string,
    author: row.author as "client" | "csm",
    text: row.text as string,
    date: row.created_at as string,
  };
}

let _comments: PlanComment[] = [];
let _loadedThreads = new Set<string>();
const _listeners = new Set<() => void>();

function notify() {
  _listeners.forEach((l) => l());
}

export const commentsStore = {
  getByThread: (threadId: string): PlanComment[] =>
    _comments.filter((c) => c.threadId === threadId),

  load: async (threadId: string) => {
    if (_loadedThreads.has(threadId)) return;
    _loadedThreads.add(threadId);
    const { data } = await supabase
      .from("plan_comments")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at");
    if (data) {
      const fetched = data.map(fromRow);
      _comments = [
        ..._comments.filter((c) => c.threadId !== threadId),
        ...fetched,
      ];
      notify();
    }
  },

  add: async (threadId: string, author: "client" | "csm", text: string) => {
    const { data } = await supabase
      .from("plan_comments")
      .insert({ thread_id: threadId, author, text })
      .select()
      .single();
    if (data) {
      _comments = [..._comments, fromRow(data)];
      notify();
    }
  },

  subscribe: (listener: () => void): (() => void) => {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  },
};
