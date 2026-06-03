// Per-thread "last seen" tracker for plan_comments. Lives in localStorage
// (per browser, per side) — simpler than a server-side read-state table and
// good enough for the alerts/badges UX (a CSM mostly stays on one machine
// for a given client; clients use a single browser too).
//
// `side` distinguishes CSM and client read state because both can be looking
// at the same threads from different perspectives.

const KEY_PREFIX = "teale:comments:lastSeen:";

function key(side: "csm" | "client", threadId: string): string {
  return `${KEY_PREFIX}${side}:${threadId}`;
}

export function getThreadLastSeen(side: "csm" | "client", threadId: string): number {
  if (typeof window === "undefined") return 0;
  const v = window.localStorage.getItem(key(side, threadId));
  if (!v) return 0;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

const _listeners = new Set<() => void>();

export function markThreadRead(side: "csm" | "client", threadId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key(side, threadId), String(Date.now()));
  _listeners.forEach((l) => l());
}

export function subscribeReadState(listener: () => void): () => void {
  _listeners.add(listener);
  // Cross-tab sync: writes in another tab fire a storage event we forward
  // to listeners so badges in this tab clear in real time too.
  const onStorage = (e: StorageEvent) => {
    if (e.key && e.key.startsWith(KEY_PREFIX)) listener();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    _listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}
