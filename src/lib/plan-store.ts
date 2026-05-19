import { supabase } from "@/lib/supabase";

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
let _clientId: string | null = null;
const _listeners = new Set<() => void>();

export const planStore = {
  getState: (): StoredPlanState | null => _state,

  load: async (clientId: string) => {
    _clientId = clientId;
    const { data } = await supabase
      .from("plan_state")
      .select("*")
      .eq("client_id", clientId)
      .single();
    _state = data
      ? { themes: data.themes as StoredPlanState["themes"], items: data.items as StoredPlanItem[] }
      : null;
    _listeners.forEach((l) => l());
  },

  setState: async (state: StoredPlanState) => {
    _state = state;
    _listeners.forEach((l) => l());
    if (!_clientId) return;
    await supabase.from("plan_state").upsert({
      client_id: _clientId,
      themes: state.themes,
      items: state.items,
      updated_at: new Date().toISOString(),
    });
  },

  subscribe: (listener: () => void): (() => void) => {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  },
};
