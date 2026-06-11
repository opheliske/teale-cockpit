import { supabase, ensureSession } from "@/lib/supabase";
import { notifyChange, watchChanges } from "@/lib/sync";

export type PlanComment = {
  id: number;
  threadId: string;
  clientId: string;
  author: "client" | "csm";
  text: string;
  date: string; // ISO
  // États locaux d'un envoi optimiste (jamais présents sur les lignes serveur,
  // qui ont toujours un id > 0). `pending` : en cours ; `failed` : échec.
  status?: "pending" | "failed";
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
let _tempSeq = 0; // ids négatifs décroissants pour les messages optimistes
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
      // On préserve les messages optimistes locaux (id < 0) pas encore en base.
      const localTemps = _comments.filter((c) => c.threadId === threadId && c.id < 0);
      _comments = [
        ..._comments.filter((c) => c.threadId !== threadId),
        ...data.map(fromRow),
        ...localTemps,
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

async function insertComment(
  threadId: string,
  clientId: string,
  author: "client" | "csm",
  text: string,
  tempId: number,
): Promise<{ ok: boolean }> {
  if (!(await ensureSession())) {
    _comments = _comments.map((c) => (c.id === tempId ? { ...c, status: "failed" } : c));
    notify();
    return { ok: false };
  }
  const { data, error } = await supabase
    .from("plan_comments")
    .insert({ thread_id: threadId, client_id: clientId, author, text })
    .select()
    .single();
  if (error || !data) {
    if (error) console.error("[comments-store] add", error);
    _comments = _comments.map((c) => (c.id === tempId ? { ...c, status: "failed" } : c));
    notify();
    return { ok: false };
  }
  // Remplace le message optimiste par la ligne serveur.
  _comments = _comments.map((c) => (c.id === tempId ? fromRow(data) : c));
  notify();
  notifyChange("plan_comments");
  // Notification email du destinataire — best-effort, non bloquant, no-op si
  // RESEND_API_KEY n'est pas configurée côté serveur.
  void fetch("/api/messages/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ threadId, clientId, author, text }),
  }).catch(() => {});
  return { ok: true };
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
    const localTemps = _comments.filter((c) => c.threadId === threadId && c.id < 0);
    _comments = [
      ..._comments.filter((c) => c.threadId !== threadId),
      ...fetched,
      ...localTemps,
    ];
    notify();
  },

  // Envoi optimiste : le message apparaît immédiatement (status "pending"),
  // puis bascule en ligne serveur ou en "failed". clientId scope le message à
  // une société pour la RLS (un client n'écrit que pour la sienne).
  add: async (
    threadId: string,
    clientId: string,
    author: "client" | "csm",
    text: string,
  ): Promise<{ ok: boolean }> => {
    const tempId = (_tempSeq -= 1);
    const optimistic: PlanComment = {
      id: tempId,
      threadId,
      clientId,
      author,
      text,
      date: new Date().toISOString(),
      status: "pending",
    };
    _comments = [..._comments, optimistic];
    notify();
    return insertComment(threadId, clientId, author, text, tempId);
  },

  // Réessaie l'envoi d'un message en échec (conserve son id local).
  resend: async (tempId: number): Promise<{ ok: boolean }> => {
    const c = _comments.find((x) => x.id === tempId);
    if (!c) return { ok: false };
    _comments = _comments.map((x) => (x.id === tempId ? { ...x, status: "pending" } : x));
    notify();
    return insertComment(c.threadId, c.clientId, c.author, c.text, tempId);
  },

  // Abandonne un message en échec (le retire de la liste locale).
  discard: (tempId: number) => {
    _comments = _comments.filter((c) => c.id !== tempId);
    notify();
  },

  // Édite le texte d'un message déjà envoyé. La RLS n'autorise que ses propres
  // messages (CSM : tous ; client : author='client' de sa société).
  editMessage: async (id: number, text: string): Promise<{ ok: boolean }> => {
    const trimmed = text.trim();
    if (!trimmed || id < 0) return { ok: false };
    if (!(await ensureSession())) return { ok: false };
    const { error } = await supabase.from("plan_comments").update({ text: trimmed }).eq("id", id);
    if (error) {
      console.error("[comments-store] edit", error);
      return { ok: false };
    }
    _comments = _comments.map((c) => (c.id === id ? { ...c, text: trimmed } : c));
    notify();
    notifyChange("plan_comments");
    return { ok: true };
  },

  // Supprime un message (RLS : ses propres messages uniquement, cf. ci-dessus).
  deleteMessage: async (id: number): Promise<{ ok: boolean }> => {
    if (id < 0) {
      _comments = _comments.filter((c) => c.id !== id);
      notify();
      return { ok: true };
    }
    if (!(await ensureSession())) return { ok: false };
    const { error } = await supabase.from("plan_comments").delete().eq("id", id);
    if (error) {
      console.error("[comments-store] delete", error);
      return { ok: false };
    }
    _comments = _comments.filter((c) => c.id !== id);
    notify();
    notifyChange("plan_comments");
    return { ok: true };
  },

  // Removes a whole thread — called when the plan item it hangs off is
  // deleted. Without this, the messages stay in plan_comments and keep
  // surfacing on the client home as unread ("Nouveaux messages du CSM").
  // Scoped to clientId so the delete stays inside RLS boundaries.
  deleteThread: async (threadId: string, clientId: string) => {
    if (!(await ensureSession())) return;
    await supabase
      .from("plan_comments")
      .delete()
      .eq("thread_id", threadId)
      .eq("client_id", clientId);
    _comments = _comments.filter((c) => c.threadId !== threadId);
    _loadedThreads.delete(threadId);
    notify();
    notifyChange("plan_comments");
  },

  subscribe: (listener: () => void): (() => void) => {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  },
};
