import { supabase } from "@/lib/supabase";
import { HOME_ACTIONS, type HomeAction } from "./clients-data";

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
  _loaded = true;
  const { data } = await supabase
    .from("client_actions")
    .select("*")
    .order("created_at");
  if (data && data.length > 0) {
    _actions = data.map(fromRow);
  } else {
    // Seed with static home actions on first run
    const toInsert = HOME_ACTIONS.map(({ text, clients, echeance, overdue, done }) => ({
      text,
      clients,
      echeance,
      overdue: overdue ?? false,
      done: done ?? false,
    }));
    const { data: seeded } = await supabase.from("client_actions").insert(toInsert).select();
    _actions = seeded ? seeded.map(fromRow) : HOME_ACTIONS;
  }
  _listeners.forEach((l) => l());
}

export const clientActionsStore = {
  getActions: (): HomeAction[] => _actions,

  // Keep legacy alias used by existing components
  getExtra: (): HomeAction[] => _actions,

  load: async () => ensureLoaded(),

  add: async (action: Omit<HomeAction, "id">) => {
    await ensureLoaded();
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
    }
  },

  // Legacy method used by existing components
  addLegacy: (action: HomeAction) => {
    _actions = [..._actions, action];
    _listeners.forEach((l) => l());
    supabase.from("client_actions").insert({
      text: action.text,
      clients: action.clients,
      echeance: action.echeance,
      overdue: action.overdue ?? false,
      done: action.done ?? false,
    });
  },

  update: async (id: number, patch: Partial<Omit<HomeAction, "id">>) => {
    await ensureLoaded();
    const { data } = await supabase
      .from("client_actions")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (data) {
      _actions = _actions.map((a) => (a.id === id ? fromRow(data) : a));
      _listeners.forEach((l) => l());
    }
  },

  remove: async (id: number) => {
    await supabase.from("client_actions").delete().eq("id", id);
    _actions = _actions.filter((a) => a.id !== id);
    _listeners.forEach((l) => l());
  },

  subscribe: (listener: () => void): (() => void) => {
    _listeners.add(listener);
    ensureLoaded();
    return () => _listeners.delete(listener);
  },
};
