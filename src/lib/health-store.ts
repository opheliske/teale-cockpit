export type HealthStatut = "SAIN" | "VIGILANCE" | "À RISQUE";

export type HealthEntry = {
  id: number;
  date: string;
  isoDate: string;
  statut: HealthStatut;
  note?: string;
};

type State = Record<string, HealthEntry[]>;

const seed: State = {
  bx: [
    { id: 1, date: "1 sept. 2025",  isoDate: "2025-09-01", statut: "VIGILANCE", note: "Baseline onboarding — adoption démarrant, équipes à embarquer" },
    { id: 2, date: "17 déc. 2025",  isoDate: "2025-12-17", statut: "VIGILANCE", note: "Fin Q1 — adoption initiale satisfaisante, Joy bien activé" },
    { id: 3, date: "25 mars 2026",  isoDate: "2026-03-25", statut: "SAIN",      note: "QBR T2 — engagement en nette progression, objectifs atteints" },
    { id: 4, date: "6 mai 2026",    isoDate: "2026-05-06", statut: "SAIN",      note: "Point CSM mai — bonne dynamique, sous-conso Pulse à surveiller" },
  ],
};

let state: State = { ...seed };
const listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((l) => l());
}

export const healthStore = {
  getEntries: (clientId: string): HealthEntry[] =>
    [...(state[clientId] ?? [])].sort((a, b) => a.isoDate.localeCompare(b.isoDate)),

  addEntry: (
    clientId: string,
    entry: Omit<HealthEntry, "id">
  ) => {
    const existing = state[clientId] ?? [];
    const id = existing.length > 0 ? Math.max(...existing.map((e) => e.id)) + 1 : 1;
    state = { ...state, [clientId]: [...existing, { ...entry, id }] };
    notify();
  },

  removeEntry: (clientId: string, entryId: number) => {
    state = {
      ...state,
      [clientId]: (state[clientId] ?? []).filter((e) => e.id !== entryId),
    };
    notify();
  },

  subscribe: (listener: () => void) => {
    listeners.push(listener);
    return () => {
      const i = listeners.indexOf(listener);
      if (i > -1) listeners.splice(i, 1);
    };
  },
};
