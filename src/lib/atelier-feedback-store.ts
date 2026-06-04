import { supabase, ensureSession } from "@/lib/supabase";
import { notifyChange, watchChanges } from "@/lib/sync";

export type AtelierFeedback = {
  itemId: number;
  rating: number;
  comment: string;
};

function fromRow(row: Record<string, unknown>): AtelierFeedback {
  return {
    itemId: Number(row.item_id),
    rating: Number(row.rating),
    comment: (row.comment as string) ?? "",
  };
}

// Map keyed by itemId for O(1) lookup from the page.
let _feedbacks: Record<number, AtelierFeedback> = {};
let _clientId: string | null = null;
const _listeners = new Set<() => void>();
function notify() {
  _listeners.forEach((l) => l());
}

async function fetchFeedback(clientId: string) {
  if (!(await ensureSession())) return;
  const { data, error } = await supabase
    .from("client_atelier_feedback")
    .select("*")
    .eq("client_id", clientId);
  if (error) {
    // Transient failure — keep the cache rather than blanking the feedback.
    console.error("[atelier-feedback-store] load", error);
    return;
  }
  const map: Record<number, AtelierFeedback> = {};
  for (const row of data ?? []) {
    const fb = fromRow(row);
    map[fb.itemId] = fb;
  }
  _feedbacks = map;
  notify();
}

watchChanges(["client_atelier_feedback"], () => {
  if (_clientId) void fetchFeedback(_clientId);
});

export const atelierFeedbackStore = {
  getAll: (): Record<number, AtelierFeedback> => _feedbacks,
  get: (itemId: number): AtelierFeedback | undefined => _feedbacks[itemId],

  load: async (clientId: string): Promise<void> => {
    _clientId = clientId;
    await fetchFeedback(clientId);
  },

  /** Inserts or updates the feedback for one atelier (upsert by composite PK). */
  upsert: async (itemId: number, rating: number, comment: string): Promise<void> => {
    if (!_clientId) return;
    if (!(await ensureSession())) return;
    const { data } = await supabase
      .from("client_atelier_feedback")
      .upsert({
        client_id: _clientId,
        item_id: itemId,
        rating,
        comment,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (data) {
      _feedbacks = { ..._feedbacks, [itemId]: fromRow(data) };
      notify();
      notifyChange("client_atelier_feedback");
    }
  },

  subscribe(listener: () => void): () => void {
    _listeners.add(listener);
    return () => {
      _listeners.delete(listener);
    };
  },
};
