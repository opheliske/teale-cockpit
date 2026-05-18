export type StoredDocumentFile = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  sizeLabel: string;
  url: string; // blob URL from URL.createObjectURL — valid for the session
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

const DEFAULT_DOCS: StoredDocument[] = [
  { id: "plan-annuel-2026",    title: "Plan d'animation annuel 2026",             type: "Stratégie", size: "2,4 Mo", date: "15 janvier 2026",  author: "Lucie Martin, CSM" },
  { id: "qbr-q1-2026",        title: "Compte-rendu QBR Q1 2026",                 type: "QBR",       size: "1,8 Mo", date: "14 mars 2026",      author: "Lucie Martin, CSM" },
  { id: "strategie-managers",  title: "Stratégie de déploiement managers",        type: "Stratégie", size: "3,1 Mo", date: "5 février 2026",    author: "Lucie Martin, CSM" },
  { id: "bilan-q1",            title: "Bilan trimestriel Q1 — KPI & insights",   type: "Bilan",     size: "1,2 Mo", date: "28 mars 2026",      author: "Lucie Martin, CSM" },
  { id: "guide-ambassadeurs",  title: "Guide d'accompagnement des ambassadeurs",  type: "Guide",     size: "0,9 Mo", date: "22 avril 2026",     author: "Lucie Martin, CSM" },
];

let _docs: StoredDocument[] = [...DEFAULT_DOCS];
const _listeners = new Set<() => void>();

export const docsStore = {
  getDocs: (): StoredDocument[] => _docs,
  setDocs(docs: StoredDocument[]): void {
    _docs = docs;
    _listeners.forEach((l) => l());
  },
  subscribe(listener: () => void): () => void {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  },
};
