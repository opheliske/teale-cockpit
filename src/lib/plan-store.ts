import { supabase } from "@/lib/supabase";
import { notifyChange, watchChanges } from "@/lib/sync";
import type { PlanItemFile } from "@/lib/clients-data";

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
  responsable?: string;
  detail?: string;
  files?: PlanItemFile[];
};

export type StoredPlanState = {
  themes: { Q1: string; Q2: string; Q3: string; Q4: string };
  items: StoredPlanItem[];
};

let _state: StoredPlanState | null = null;
let _clientId: string | null = null;
const _listeners = new Set<() => void>();

async function fetchPlan(clientId: string) {
  const { data } = await supabase
    .from("plan_state")
    .select("*")
    .eq("client_id", clientId)
    .single();
  _state = data
    ? { themes: data.themes as StoredPlanState["themes"], items: data.items as StoredPlanItem[] }
    : null;
  _listeners.forEach((l) => l());
}

// Re-fetch when the plan changed in another tab or from another user.
watchChanges(["plan_state"], () => {
  if (_clientId) void fetchPlan(_clientId);
});

export const planStore = {
  getState: (): StoredPlanState | null => _state,

  load: async (clientId: string) => {
    _clientId = clientId;
    await fetchPlan(clientId);
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
    notifyChange("plan_state");
  },

  subscribe: (listener: () => void): (() => void) => {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  },
};
