import { supabase } from "@/lib/supabase";
import { notifyChange, watchChanges } from "@/lib/sync";

export type TargetLabel = { id: string; name: string; color: string };

export const LABEL_COLORS = [
  "#a8e895", "#5eead4", "#93c5fd", "#fde047",
  "#fdba74", "#c4b5fd", "#fda4af", "#7dd3fc",
];

const DEFAULT_LABELS: Array<{ name: string; color: string }> = [
  { name: "Managers",       color: "#a8e895" },
  { name: "Collaborateurs", color: "#93c5fd" },
];

type LabelsMap = Record<string, TargetLabel[]>;
type AssignMap = Record<string, Record<number, string[]>>;

let labels: LabelsMap = {};
let assigns: AssignMap = {};
const _loadedClients = new Set<string>();
const listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((l) => l());
}

// Re-fetch a client's labels + assignments (no seeding — used on reload).
async function reloadClient(clientId: string) {
  const [{ data: labelRows }, { data: assignRows }] = await Promise.all([
    supabase.from("target_labels").select("*").eq("client_id", clientId),
    supabase.from("target_item_assignments").select("*").eq("client_id", clientId),
  ]);
  labels = { ...labels, [clientId]: (labelRows as TargetLabel[]) ?? [] };
  const clientAssigns: Record<number, string[]> = {};
  for (const row of assignRows ?? []) {
    const itemId = Number(row.item_id);
    clientAssigns[itemId] = [...(clientAssigns[itemId] ?? []), row.label_id as string];
  }
  assigns = { ...assigns, [clientId]: clientAssigns };
}

// Re-fetch when labels/assignments changed in another tab or from another user.
watchChanges(["target_labels", "target_item_assignments"], async () => {
  for (const clientId of _loadedClients) await reloadClient(clientId);
  notify();
});

export const targetsStore = {
  getLabels: (clientId: string): TargetLabel[] => labels[clientId] ?? [],

  getItemTargets: (clientId: string, itemId: number): string[] =>
    assigns[clientId]?.[itemId] ?? [],

  load: async (clientId: string) => {
    if (_loadedClients.has(clientId)) return;

    // Wait for the session before the RLS-scoped reads — otherwise they can
    // go out unauthenticated, come back empty, and trigger a bogus re-seed.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return; // not ready — a later call will retry

    _loadedClients.add(clientId);

    const [{ data: labelRows, error: labelErr }, { data: assignRows }] = await Promise.all([
      supabase.from("target_labels").select("*").eq("client_id", clientId),
      supabase.from("target_item_assignments").select("*").eq("client_id", clientId),
    ]);

    if (labelErr) {
      console.error("[targets-store] load", labelErr);
      _loadedClients.delete(clientId); // allow a retry
      return;
    }

    if (labelRows && labelRows.length > 0) {
      labels = { ...labels, [clientId]: labelRows as TargetLabel[] };
    } else {
      // Genuinely no labels yet → seed the defaults once.
      const seeded: TargetLabel[] = DEFAULT_LABELS.map(({ name, color }, i) => ({
        id: name.toLowerCase().replace(/\s+/g, "-") + "-" + (Date.now() + i).toString(36),
        name,
        color,
      }));
      const { error: seedErr } = await supabase
        .from("target_labels")
        .insert(seeded.map((l) => ({ ...l, client_id: clientId })));
      if (seedErr) console.error("[targets-store] seed", seedErr);
      labels = { ...labels, [clientId]: seeded };
    }

    const clientAssigns: Record<number, string[]> = {};
    for (const row of assignRows ?? []) {
      const itemId = Number(row.item_id);
      clientAssigns[itemId] = [...(clientAssigns[itemId] ?? []), row.label_id as string];
    }
    assigns = { ...assigns, [clientId]: clientAssigns };

    notify();
  },

  addLabel: async (clientId: string, name: string, color: string): Promise<string> => {
    const id =
      name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") +
      "-" +
      Date.now().toString(36);
    const newLabel: TargetLabel = { id, name, color };
    const { error } = await supabase
      .from("target_labels")
      .insert({ id, client_id: clientId, name, color });
    if (error) {
      console.error("[targets-store] addLabel", error);
      return id;
    }
    labels = { ...labels, [clientId]: [...(labels[clientId] ?? []), newLabel] };
    notify();
    notifyChange("target_labels");
    return id;
  },

  removeLabel: async (clientId: string, labelId: string) => {
    await supabase.from("target_labels").delete().eq("id", labelId);
    labels = { ...labels, [clientId]: (labels[clientId] ?? []).filter((l) => l.id !== labelId) };
    const ca = assigns[clientId] ?? {};
    const next: Record<number, string[]> = {};
    for (const [k, v] of Object.entries(ca)) {
      const filtered = (v as string[]).filter((x) => x !== labelId);
      if (filtered.length) next[Number(k)] = filtered;
    }
    assigns = { ...assigns, [clientId]: next };
    notify();
    notifyChange("target_labels");
  },

  toggleItemTarget: async (clientId: string, itemId: number, labelId: string) => {
    const cur = assigns[clientId]?.[itemId] ?? [];
    if (cur.includes(labelId)) {
      await supabase
        .from("target_item_assignments")
        .delete()
        .eq("client_id", clientId)
        .eq("item_id", itemId)
        .eq("label_id", labelId);
      assigns = {
        ...assigns,
        [clientId]: { ...(assigns[clientId] ?? {}), [itemId]: cur.filter((x) => x !== labelId) },
      };
    } else {
      await supabase
        .from("target_item_assignments")
        .insert({ client_id: clientId, item_id: itemId, label_id: labelId });
      assigns = {
        ...assigns,
        [clientId]: { ...(assigns[clientId] ?? {}), [itemId]: [...cur, labelId] },
      };
    }
    notify();
    notifyChange("target_item_assignments");
  },

  setItemTargets: async (clientId: string, itemId: number, labelIds: string[]) => {
    await supabase
      .from("target_item_assignments")
      .delete()
      .eq("client_id", clientId)
      .eq("item_id", itemId);
    if (labelIds.length > 0) {
      await supabase.from("target_item_assignments").insert(
        labelIds.map((label_id) => ({ client_id: clientId, item_id: itemId, label_id }))
      );
    }
    assigns = { ...assigns, [clientId]: { ...(assigns[clientId] ?? {}), [itemId]: labelIds } };
    notify();
    notifyChange("target_item_assignments");
  },

  subscribe: (listener: () => void) => {
    listeners.push(listener);
    return () => {
      const i = listeners.indexOf(listener);
      if (i > -1) listeners.splice(i, 1);
    };
  },
};
