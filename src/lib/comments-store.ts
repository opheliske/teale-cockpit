export type PlanComment = {
  id: number;
  threadId: string;
  author: "client" | "csm";
  text: string;
  date: string; // ISO
};

let _comments: PlanComment[] = [];
let _seq = 1;
const _listeners = new Set<() => void>();

function notify() {
  _listeners.forEach((l) => l());
}

export const commentsStore = {
  getByThread: (threadId: string): PlanComment[] =>
    _comments.filter((c) => c.threadId === threadId),

  add(threadId: string, author: "client" | "csm", text: string): void {
    _comments = [
      ..._comments,
      { id: _seq++, threadId, author, text, date: new Date().toISOString() },
    ];
    notify();
  },

  subscribe(listener: () => void): () => void {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  },
};
