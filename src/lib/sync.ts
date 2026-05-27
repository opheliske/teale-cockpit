import { supabase } from "@/lib/supabase";

// ─────────────────────────────────────────────────────────────────────────────
// Cross-context sync — keeps the singleton stores in sync across:
//   • other tabs of the same browser  → BroadcastChannel
//   • other users / devices           → Supabase Realtime (postgres_changes)
//
// A store calls notifyChange("<table>") after a write, and watchChanges(...)
// to be told when one of its tables changed elsewhere — it then re-fetches.
// ─────────────────────────────────────────────────────────────────────────────

type ChangeListener = () => void;
type Entry = { tables: Set<string>; cb: ChangeListener };

const CHANNEL_NAME = "teale-sync";

const entries = new Set<Entry>();
const realtimeChannels = new Map<string, ReturnType<typeof supabase.channel>>();
let bc: BroadcastChannel | null = null;

function dispatch(table: string) {
  for (const e of entries) {
    if (e.tables.has(table)) e.cb();
  }
}

function initBroadcast() {
  if (bc || typeof window === "undefined" || !("BroadcastChannel" in window)) return;
  bc = new BroadcastChannel(CHANNEL_NAME);
  bc.onmessage = (ev: MessageEvent) => {
    const table = (ev.data as { table?: string } | null)?.table;
    if (table) dispatch(table);
  };
}

function initRealtimeTable(table: string) {
  if (typeof window === "undefined" || realtimeChannels.has(table)) return;
  // RLS applies to Realtime too — a client only receives changes it can read.
  const channel = supabase
    .channel(`teale-rt-${table}`)
    .on("postgres_changes", { event: "*", schema: "public", table }, () => dispatch(table))
    .subscribe();
  realtimeChannels.set(table, channel);
}

/** Broadcasts a local write so the other tabs of this browser re-fetch. */
export function notifyChange(table: string) {
  initBroadcast();
  bc?.postMessage({ table });
}

/**
 * Calls `onChange` whenever one of `tables` changes elsewhere — another tab
 * (BroadcastChannel) or another user/device (Supabase Realtime).
 * Returns an unsubscribe function.
 */
export function watchChanges(tables: string[], onChange: ChangeListener): () => void {
  initBroadcast();
  for (const t of tables) initRealtimeTable(t);
  const entry: Entry = { tables: new Set(tables), cb: onChange };
  entries.add(entry);
  return () => {
    entries.delete(entry);
  };
}

/**
 * Triggers every registered watchChanges callback. Used by SessionWatchdog
 * after a successful token refresh — the previous fetch may have raced an
 * expired token and cached empty data, so we ask every store to re-fetch.
 */
export function forceReloadAll() {
  for (const entry of entries) entry.cb();
}

/**
 * Tears down every Realtime channel and the BroadcastChannel. Call it on
 * sign-out so the WebSocket and channel aren't left open across sessions.
 */
export function closeSync() {
  for (const channel of realtimeChannels.values()) {
    supabase.removeChannel(channel);
  }
  realtimeChannels.clear();
  bc?.close();
  bc = null;
  entries.clear();
}
