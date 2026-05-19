export type StoredPlanItemType = "atelier" | "kit" | "csm" | "qbr" | "custom";

export type StoredPlanItem = {
  id: number;
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  type: StoredPlanItemType;
  icon: string;
  title: string;
  meta: string;
  done: boolean;
  impact?: string;
  targets?: string[];
};

export type StoredPlanState = {
  themes: { Q1: string; Q2: string; Q3: string; Q4: string };
  items: StoredPlanItem[];
};

let _state: StoredPlanState | null = null;
const _listeners = new Set<() => void>();

export const planStore = {
  getState: (): StoredPlanState | null => _state,
  setState(state: StoredPlanState): void {
    _state = state;
    _listeners.forEach((l) => l());
  },
  subscribe(listener: () => void): () => void {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  },
};
