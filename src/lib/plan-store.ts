import { supabase } from "@/lib/supabase";
import { notifyChange, watchChanges } from "@/lib/sync";
import type { PlanItemFile } from "@/lib/clients-data";

export type StoredPlanItemType = "atelier" | "kit" | "csm" | "qbr" | "custom";

export type QuarterThemes = { Q1: string; Q2: string; Q3: string; Q4: string };

export type StoredPlanItem = {
  id: number;
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  // Plan year the item belongs to. Absent ⇒ current (back-compatible).
  year?: "current" | "next";
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
  themes: QuarterThemes;
  // Quarter themes for the following year (absent on legacy rows).
  nextThemes?: QuarterThemes;
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
    ? {
        themes: data.themes as QuarterThemes,
        nextThemes: (data.next_themes as QuarterThemes | null) ?? undefined,
        items: data.items as StoredPlanItem[],
      }
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
      next_themes: state.nextThemes ?? null,
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
