// Per-catalogue "seen IDs" tracker. We persist the *set* of IDs the user
// has already seen in a given catalogue (workshops, kits) in localStorage
// — when a new id appears in the catalogue, it's flagged as new until the
// user visits the matching page (which marks the full current set as seen).
//
// Simpler than a "lastSeenAt" timestamp because items can be added back-
// dated (no created_at on some kits tables) and we don't want server-side
// schema changes for what's essentially a per-browser UX hint.

type CatalogueType = "ateliers" | "kits";

const KEY_PREFIX = "teale:catalogue:seen:";

function key(type: CatalogueType): string {
  return `${KEY_PREFIX}${type}`;
}

export function getSeenIds(type: CatalogueType): Set<string> {
  if (typeof window === "undefined") return new Set();
  const v = window.localStorage.getItem(key(type));
  if (!v) return new Set();
  try {
    const arr = JSON.parse(v) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

/** Returns true once the user has visited at least once (first-visit
 *  bootstrap can use it to seed the seen set without flagging everything
 *  as "new"). */
export function isInitialized(type: CatalogueType): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(key(type)) !== null;
}

const _listeners = new Set<() => void>();

export function setSeenIds(type: CatalogueType, ids: Iterable<string>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key(type), JSON.stringify([...ids]));
  _listeners.forEach((l) => l());
}

export function subscribeCatalogueReadState(listener: () => void): () => void {
  _listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key && e.key.startsWith(KEY_PREFIX)) listener();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    _listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}
