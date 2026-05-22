import { supabase } from "@/lib/supabase";
import { notifyChange, watchChanges } from "@/lib/sync";

export type StoredDocumentFile = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  sizeLabel: string;
  path: string; // path in the Supabase Storage "client-files" bucket
};

export type StoredDocument = {
  id: string;
  title: string;
  type: string;
  size: string;
  date: string;
  author: string;
  files?: StoredDocumentFile[];
};

function fromRow(row: Record<string, unknown>): StoredDocument {
  return {
    id: row.id as string,
    title: row.title as string,
    type: row.type as string,
    size: row.size as string,
    date: row.date as string,
    author: row.author as string,
    files: row.files as StoredDocumentFile[] | undefined,
  };
}

let _docs: StoredDocument[] = [];
let _clientId: string | null = null;
const _listeners = new Set<() => void>();

async function fetchDocs(clientId: string) {
  const { data } = await supabase
    .from("documents")
    .select("*")
    .eq("client_id", clientId)
    .order("date", { ascending: false });
  _docs = data ? data.map(fromRow) : [];
  _listeners.forEach((l) => l());
}

// Re-fetch when a document changed in another tab or from another user.
watchChanges(["documents"], () => {
  if (_clientId) void fetchDocs(_clientId);
});

export const docsStore = {
  getDocs: (): StoredDocument[] => _docs,

  load: async (clientId: string) => {
    _clientId = clientId;
    await fetchDocs(clientId);
  },

  addDoc: async (doc: StoredDocument) => {
    if (!_clientId) return;
    const { data } = await supabase
      .from("documents")
      .insert({
        id: doc.id,
        client_id: _clientId,
        title: doc.title,
        type: doc.type,
        size: doc.size,
        date: doc.date,
        author: doc.author,
        files: doc.files ?? [],
      })
      .select()
      .single();
    if (data) {
      _docs = [fromRow(data), ..._docs];
      _listeners.forEach((l) => l());
      notifyChange("documents");
    }
  },

  removeDoc: async (docId: string) => {
    if (!_clientId) return;
    await supabase.from("documents").delete().eq("id", docId).eq("client_id", _clientId);
    _docs = _docs.filter((d) => d.id !== docId);
    _listeners.forEach((l) => l());
    notifyChange("documents");
  },

  // Legacy setter used by existing components (local state only, no DB sync)
  setDocs(docs: StoredDocument[]): void {
    _docs = docs;
    _listeners.forEach((l) => l());
  },

  subscribe(listener: () => void): () => void {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  },
};
