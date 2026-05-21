import { supabase } from "@/lib/supabase";
import { notifyChange, watchChanges } from "@/lib/sync";

export type HealthStatut = "SAIN" | "VIGILANCE" | "À RISQUE";

export type HealthEntry = {
  id: number;
  date: string;
  isoDate: string;
  statut: HealthStatut;
  note?: string;
};

function fromRow(row: Record<string, unknown>): HealthEntry {
  return {
    id: Number(row.id),
    date: row.date as string,
    isoDate: row.iso_date as string,
    statut: row.statut as HealthStatut,
    note: row.note as string | undefined,
  };
}

type State = Record<string, HealthEntry[]>;
let state: State = {};
const listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((l) => l());
}

// Re-fetch every loaded client when a health entry changed elsewhere.
watchChanges(["health_entries"], async () => {
  for (const clientId of Object.keys(state)) {
    const { data } = await supabase
      .from("health_entries")
      .select("*")
      .eq("client_id", clientId)
      .order("iso_date");
    state = { ...state, [clientId]: data ? data.map(fromRow) : [] };
  }
  notify();
});

export const healthStore = {
  getEntries: (clientId: string): HealthEntry[] =>
    [...(state[clientId] ?? [])].sort((a, b) => a.isoDate.localeCompare(b.isoDate)),

  load: async (clientId: string) => {
    const { data } = await supabase
      .from("health_entries")
      .select("*")
      .eq("client_id", clientId)
      .order("iso_date");
    state = { ...state, [clientId]: data ? data.map(fromRow) : [] };
    notify();
  },

  addEntry: async (clientId: string, entry: Omit<HealthEntry, "id">) => {
    const { data } = await supabase
      .from("health_entries")
      .insert({
        client_id: clientId,
        date: entry.date,
        iso_date: entry.isoDate,
        statut: entry.statut,
        note: entry.note ?? null,
      })
      .select()
      .single();
    if (data) {
      state = { ...state, [clientId]: [...(state[clientId] ?? []), fromRow(data)] };
      notify();
      notifyChange("health_entries");
    }
  },

  removeEntry: async (clientId: string, entryId: number) => {
    await supabase.from("health_entries").delete().eq("id", entryId);
    state = {
      ...state,
      [clientId]: (state[clientId] ?? []).filter((e) => e.id !== entryId),
    };
    notify();
    notifyChange("health_entries");
  },

  subscribe: (listener: () => void) => {
    listeners.push(listener);
    return () => {
      const i = listeners.indexOf(listener);
      if (i > -1) listeners.splice(i, 1);
    };
  },
};
