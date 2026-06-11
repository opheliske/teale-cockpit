import { supabase, ensureSession } from "@/lib/supabase";
import { watchChanges } from "@/lib/sync";

// État « lu » des fils plan_comments, désormais côté serveur (table
// comment_reads, par utilisateur). Un cache mémoire alimente les lectures
// synchrones (badges/compteurs) ; les écritures sont optimistes (cache + notify
// immédiats) puis persistées. Cohérent entre les appareils d'un même
// utilisateur (chargement initial + realtime sur comment_reads).
//
// NB : la notion de « side » a disparu — l'utilisateur EST le côté (un compte
// est soit CSM/admin, soit client).

const _reads = new Map<string, number>(); // threadId -> last_seen (ms epoch)
let _loaded = false;
const _listeners = new Set<() => void>();

function notify() {
  _listeners.forEach((l) => l());
}

async function loadReads() {
  if (!(await ensureSession())) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { data, error } = await supabase
    .from("comment_reads")
    .select("thread_id, last_seen_at")
    .eq("user_id", user.id);
  if (error || !data) {
    if (error) console.error("[comments-read-state] load", error);
    return;
  }
  // On garde le max(cache, serveur) par fil pour ne pas écraser un marquage
  // optimiste tout juste posé par une lecture serveur plus ancienne.
  for (const r of data) {
    const serverMs = new Date(r.last_seen_at as string).getTime();
    const cur = _reads.get(r.thread_id as string) ?? 0;
    if (serverMs > cur) _reads.set(r.thread_id as string, serverMs);
  }
  _loaded = true;
  notify();
}

void loadReads();
watchChanges(["comment_reads"], () => {
  void loadReads();
});

/** True once the user's read markers have been fetched at least once. */
export function readsLoaded(): boolean {
  return _loaded;
}

export function getThreadLastSeen(threadId: string): number {
  return _reads.get(threadId) ?? 0;
}

/** Marque un fil comme lu (optimiste + persistance serveur). */
export function markThreadRead(threadId: string): void {
  const now = Date.now();
  if ((_reads.get(threadId) ?? 0) >= now) return;
  _reads.set(threadId, now);
  notify();
  void (async () => {
    if (!(await ensureSession())) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("comment_reads")
      .upsert({ user_id: user.id, thread_id: threadId, last_seen_at: new Date(now).toISOString() });
    if (error) console.error("[comments-read-state] mark", error);
  })();
}

export function subscribeReadState(listener: () => void): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}
