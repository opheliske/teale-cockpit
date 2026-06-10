import { supabase, ensureSession } from "@/lib/supabase";
import { notifyChange, watchChanges } from "@/lib/sync";
import type { PlanItemFile, ChecklistItem, PlanItemMode } from "@/lib/clients-data";

export type StoredPlanItemType = "atelier" | "kit" | "qbr" | "custom" | "onboarding";

export type QuarterThemes = { Q1: string; Q2: string; Q3: string; Q4: string };

export type StoredPlanItem = {
  id: number;
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  // Plan year the item belongs to. Absent ⇒ current (back-compatible).
  year?: "current" | "next";
  // Month within the quarter (0-11). Absent on legacy rows.
  month?: number;
  // QBR / atelier — slide deck has been prepared by the CSM.
  deckCreated?: boolean;
  // Atelier marked as cancelled — kept on the plan but not deducted from
  // the contract's atelier quota.
  cancelled?: boolean;
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
  // Atelier — pre-filled from the catalogue at creation, then editable.
  // Absent on legacy rows and on non-atelier items.
  objectives?: string[];
  themeId?: string;
  // Atelier — référence au workshop catalogue (voir PlanItem.workshopId).
  // Permet de dériver le statut « déjà animé » par-client côté catalogue.
  workshopId?: string;
  // CSM-authored sub-tasks; both sides can toggle `done`.
  checklist?: ChecklistItem[];
  // Onboarding — présentiel ou distanciel.
  mode?: PlanItemMode;
  // Atelier — kit de communication du workshop, copié à la création de
  // l'item. Stocké dans le bucket kit-files (open via openKitFile).
  workshopKitFiles?: { id: string; path: string; name: string; mimeType: string }[];
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
  if (!(await ensureSession())) return;
  // maybeSingle (not single): a client with no plan row yet is "0 rows, no
  // error", which we want to read as an empty plan. A transient failure comes
  // back with `error` set — in that case keep the cached state rather than
  // blanking the whole planning view (single() conflates the two).
  const { data, error } = await supabase
    .from("plan_state")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();
  if (error) {
    console.error("[plan-store] load", error);
    return;
  }
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

  setState: async (state: StoredPlanState): Promise<{ error: string | null }> => {
    _state = state;
    _listeners.forEach((l) => l());
    if (!_clientId) return { error: null };
    if (!(await ensureSession())) return { error: "Session indisponible" };
    const { error } = await supabase.from("plan_state").upsert({
      client_id: _clientId,
      themes: state.themes,
      next_themes: state.nextThemes ?? null,
      items: state.items,
      updated_at: new Date().toISOString(),
    });
    if (error) return { error: error.message };
    notifyChange("plan_state");
    return { error: null };
  },

  // Flips a single checklist item. The plan_state RLS allows the client to
  // upsert their own row, so this path works from both sides — no separate
  // client endpoint is needed. Optimistic: in-memory state changes first,
  // a debounced concurrent edit would race us only if the same checklist
  // item is being flipped by two parties simultaneously.
  toggleChecklistItem: async (
    planItemId: number,
    checklistItemId: string,
  ): Promise<{ error: string | null }> => {
    const current = _state;
    if (!current) return { error: "Plan absent" };
    const nextItems = current.items.map((item) => {
      if (item.id !== planItemId || !item.checklist) return item;
      return {
        ...item,
        checklist: item.checklist.map((c) =>
          c.id === checklistItemId ? { ...c, done: !c.done } : c,
        ),
      };
    });
    return planStore.setState({ ...current, items: nextItems });
  },

  subscribe: (listener: () => void): (() => void) => {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  },
};
