import { supabase, ensureSession } from "@/lib/supabase";
import { notifyChange, watchChanges } from "@/lib/sync";
import type { HomeAction } from "./clients-data";

let _actions: HomeAction[] = [];
let _loaded = false;
const _listeners = new Set<() => void>();

function fromRow(row: Record<string, unknown>): HomeAction {
  return {
    id: Number(row.id),
    text: row.text as string,
    clients: row.clients as { name: string; color: string }[],
    echeance: row.echeance as string,
    overdue: row.overdue as boolean,
    done: row.done as boolean,
  };
}

async function ensureLoaded() {
  if (_loaded) return;
  // Skip on unusable session — see supabase.ts.
  if (!(await ensureSession())) return;
  _loaded = true;
  const { data } = await supabase
    .from("client_actions")
    .select("*")
    .order("created_at");
  // No front-side seeding (consistent with workshops/kits stores) — an empty
  // table just yields an empty action list.
  _actions = (data ?? []).map(fromRow);
  _listeners.forEach((l) => l());
}

// Plain re-fetch (no seeding) when an action changed elsewhere.
async function reloadActions() {
  if (!(await ensureSession())) return;
  const { data } = await supabase
    .from("client_actions")
    .select("*")
    .order("created_at");
  _actions = data ? data.map(fromRow) : [];
  _listeners.forEach((l) => l());
}
watchChanges(["client_actions"], () => {
  void reloadActions();
});

export const clientActionsStore = {
  getActions: (): HomeAction[] => _actions,

  // Keep legacy alias used by existing components
  getExtra: (): HomeAction[] => _actions,

  load: async () => ensureLoaded(),

  add: async (action: Omit<HomeAction, "id">) => {
    await ensureLoaded();
    if (!(await ensureSession())) return;
    const { data } = await supabase
      .from("client_actions")
      .insert({
        text: action.text,
        clients: action.clients,
        echeance: action.echeance,
        overdue: action.overdue ?? false,
        done: action.done ?? false,
      })
      .select()
      .single();
    if (data) {
      _actions = [..._actions, fromRow(data)];
      _listeners.forEach((l) => l());
      notifyChange("client_actions");
    }
  },

  // Legacy method used by existing components
  addLegacy: (action: HomeAction) => {
    _actions = [..._actions, action];
    _listeners.forEach((l) => l());
    supabase
      .from("client_actions")
      .insert({
        text: action.text,
        clients: action.clients,
        echeance: action.echeance,
        overdue: action.overdue ?? false,
        done: action.done ?? false,
      })
      .then(() => notifyChange("client_actions"));
  },

  update: async (id: number, patch: Partial<Omit<HomeAction, "id">>) => {
    await ensureLoaded();
    if (!(await ensureSession())) return;
    const { data } = await supabase
      .from("client_actions")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (data) {
      _actions = _actions.map((a) => (a.id === id ? fromRow(data) : a));
      _listeners.forEach((l) => l());
      notifyChange("client_actions");
    }
  },

  remove: async (id: number) => {
    if (!(await ensureSession())) return;
    await supabase.from("client_actions").delete().eq("id", id);
    _actions = _actions.filter((a) => a.id !== id);
    _listeners.forEach((l) => l());
    notifyChange("client_actions");
  },

  subscribe: (listener: () => void): (() => void) => {
    _listeners.add(listener);
    ensureLoaded();
    return () => _listeners.delete(listener);
  },
};
