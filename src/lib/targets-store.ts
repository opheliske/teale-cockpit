export type TargetLabel = { id: string; name: string; color: string };

type LabelsMap  = Record<string, TargetLabel[]>;
type AssignMap  = Record<string, Record<number, string[]>>;

export const LABEL_COLORS = [
  "#a8e895", "#5eead4", "#93c5fd", "#fde047",
  "#fdba74", "#c4b5fd", "#fda4af", "#7dd3fc",
];

const seedLabels: LabelsMap = {
  bx: [
    { id: "managers",       name: "Managers",       color: "#a8e895" },
    { id: "collaborateurs", name: "Collaborateurs",  color: "#5eead4" },
    { id: "rh",             name: "RH",              color: "#93c5fd" },
    { id: "codir",          name: "Codir",           color: "#fde047" },
  ],
};

let labels:  LabelsMap = { ...seedLabels };
let assigns: AssignMap = {};
const listeners: (() => void)[] = [];
function notify() { listeners.forEach((l) => l()); }

export const targetsStore = {
  getLabels: (clientId: string): TargetLabel[] => labels[clientId] ?? [],

  addLabel: (clientId: string, name: string, color: string): string => {
    const id = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
      + "-" + Date.now().toString(36);
    labels = { ...labels, [clientId]: [...(labels[clientId] ?? []), { id, name, color }] };
    notify();
    return id;
  },

  removeLabel: (clientId: string, labelId: string) => {
    labels = { ...labels, [clientId]: (labels[clientId] ?? []).filter((l) => l.id !== labelId) };
    const ca = assigns[clientId] ?? {};
    const next: Record<number, string[]> = {};
    for (const [k, v] of Object.entries(ca)) {
      const filtered = v.filter((x) => x !== labelId);
      if (filtered.length) next[Number(k)] = filtered;
    }
    assigns = { ...assigns, [clientId]: next };
    notify();
  },

  getItemTargets: (clientId: string, itemId: number): string[] =>
    assigns[clientId]?.[itemId] ?? [],

  toggleItemTarget: (clientId: string, itemId: number, labelId: string) => {
    const cur = assigns[clientId]?.[itemId] ?? [];
    const next = cur.includes(labelId) ? cur.filter((x) => x !== labelId) : [...cur, labelId];
    assigns = { ...assigns, [clientId]: { ...(assigns[clientId] ?? {}), [itemId]: next } };
    notify();
  },

  setItemTargets: (clientId: string, itemId: number, labelIds: string[]) => {
    assigns = { ...assigns, [clientId]: { ...(assigns[clientId] ?? {}), [itemId]: labelIds } };
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
