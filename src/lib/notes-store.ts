import { supabase, ensureSession } from "@/lib/supabase";
import { notifyChange, watchChanges } from "@/lib/sync";
import type { Note, NoteType } from "@/lib/clients-data";

function fromRow(row: Record<string, unknown>): Note {
  return {
    id: Number(row.id),
    type: row.type as NoteType,
    date: row.date as string,
    text: row.text as string,
    ctaLabel: (row.cta_label as string) ?? "",
    ctaVariant: (row.cta_variant as Note["ctaVariant"]) ?? "default",
    alert: row.alert as boolean | undefined,
  };
}

let _notes: Note[] = [];
let _clientId: string | null = null;
const _listeners = new Set<() => void>();
function notify() {
  _listeners.forEach((l) => l());
}

async function fetchNotes(clientId: string) {
  if (!(await ensureSession())) return;
  const { data, error } = await supabase
    .from("client_notes")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) {
    // Transient failure — keep the cache rather than blanking the list.
    console.error("[notes-store] load", error);
    return;
  }
  _notes = data ? data.map(fromRow) : [];
  notify();
}

// Live updates across tabs / CSM devices.
watchChanges(["client_notes"], () => {
  if (_clientId) void fetchNotes(_clientId);
});

export const notesStore = {
  getNotes: (): Note[] => _notes,

  load: async (clientId: string) => {
    _clientId = clientId;
    await fetchNotes(clientId);
  },

  addNote: async (note: Omit<Note, "id">): Promise<void> => {
    if (!_clientId) return;
    if (!(await ensureSession())) return;
    const { data } = await supabase
      .from("client_notes")
      .insert({
        client_id: _clientId,
        type: note.type,
        date: note.date,
        text: note.text,
        cta_label: note.ctaLabel ?? "",
        cta_variant: note.ctaVariant ?? "default",
        alert: note.alert ?? false,
      })
      .select()
      .single();
    if (data) {
      _notes = [fromRow(data), ..._notes];
      notify();
      notifyChange("client_notes");
    }
  },

  updateNote: async (id: number, patch: Partial<Omit<Note, "id">>): Promise<void> => {
    if (!(await ensureSession())) return;
    const row: Record<string, unknown> = {};
    if (patch.type !== undefined) row.type = patch.type;
    if (patch.date !== undefined) row.date = patch.date;
    if (patch.text !== undefined) row.text = patch.text;
    if (patch.ctaLabel !== undefined) row.cta_label = patch.ctaLabel;
    if (patch.ctaVariant !== undefined) row.cta_variant = patch.ctaVariant;
    if (patch.alert !== undefined) row.alert = patch.alert;
    const { data } = await supabase
      .from("client_notes")
      .update(row)
      .eq("id", id)
      .select()
      .single();
    if (data) {
      _notes = _notes.map((n) => (n.id === id ? fromRow(data) : n));
      notify();
      notifyChange("client_notes");
    }
  },

  removeNote: async (id: number): Promise<void> => {
    if (!(await ensureSession())) return;
    await supabase.from("client_notes").delete().eq("id", id);
    _notes = _notes.filter((n) => n.id !== id);
    notify();
    notifyChange("client_notes");
  },

  subscribe(listener: () => void): () => void {
    _listeners.add(listener);
    return () => {
      _listeners.delete(listener);
    };
  },
};
