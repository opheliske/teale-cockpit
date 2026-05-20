import { supabase } from "./supabase";
import type { ContractFormule, ProduitTeale, Client, ClientDetail, Statut } from "./clients-data";

export type StoredCsmClient = {
  id: string;
  name: string;
  initials: string;
  color: string;
  collab: number;
  ownerCsmId: string | null;
  statut: "green" | "amber" | "danger";
  formule: ContractFormule;
  atelierTotal: number;
  rdvParCollab: number;
  contractStart: string;
  contractEnd: string;
  churnNotice: string;
  produits: ProduitTeale[];
  arr: number;
  createdAt: string;
};

type DbRow = {
  id: string;
  name: string;
  initials: string;
  color: string;
  collab: number;
  owner_csm_id: string | null;
  statut: "green" | "amber" | "danger";
  formule: ContractFormule;
  atelier_total: number;
  rdv_par_collab: number;
  contract_start: string;
  contract_end: string;
  churn_notice: string;
  produits: ProduitTeale[];
  arr: number;
  created_at: string;
};

function fromRow(row: DbRow): StoredCsmClient {
  return {
    id: row.id,
    name: row.name,
    initials: row.initials,
    color: row.color,
    collab: row.collab,
    ownerCsmId: row.owner_csm_id ?? null,
    statut: row.statut,
    formule: row.formule,
    atelierTotal: row.atelier_total,
    rdvParCollab: row.rdv_par_collab,
    contractStart: row.contract_start,
    contractEnd: row.contract_end,
    churnNotice: row.churn_notice,
    produits: row.produits ?? [],
    arr: row.arr,
    createdAt: row.created_at,
  };
}

function toRow(c: StoredCsmClient): Omit<DbRow, "created_at"> {
  return {
    id: c.id,
    name: c.name,
    initials: c.initials,
    color: c.color,
    collab: c.collab,
    owner_csm_id: c.ownerCsmId,
    statut: c.statut,
    formule: c.formule,
    atelier_total: c.atelierTotal,
    rdv_par_collab: c.rdvParCollab,
    contract_start: c.contractStart,
    contract_end: c.contractEnd,
    churn_notice: c.churnNotice,
    produits: c.produits,
    arr: c.arr,
  };
}

let _clients: StoredCsmClient[] = [];
let _loaded = false;
let _loadPromise: Promise<void> | null = null;
const _listeners = new Set<() => void>();

function notify() { _listeners.forEach((l) => l()); }

// Loads the clients once. Returns the same promise on every call so late
// subscribers can await it instead of being silently skipped.
function ensureLoaded(): Promise<void> {
  if (!_loadPromise) {
    _loadPromise = (async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) console.error("[csm-clients-store] load", error);
      _clients = (data ?? []).map((r) => fromRow(r as DbRow));
      _loaded = true;
      notify();
    })();
  }
  return _loadPromise;
}

export const csmClientsStore = {
  getAll: (): StoredCsmClient[] => _clients,

  get: (id: string): StoredCsmClient | undefined => _clients.find((c) => c.id === id),

  // True once the initial load has completed (with or without rows).
  isLoaded: (): boolean => _loaded,

  // Creates or updates a client. Returns the error message (or null) so the
  // caller can surface a failure instead of navigating into a broken page.
  add: async (client: StoredCsmClient): Promise<{ error: string | null }> => {
    const { error } = await supabase.from("clients").upsert(toRow(client));
    if (error) {
      console.error("[csm-clients-store] add", error);
      return { error: error.message };
    }
    _clients = [client, ..._clients.filter((c) => c.id !== client.id)];
    notify();
    return { error: null };
  },

  subscribe: (listener: () => void) => {
    _listeners.add(listener);
    // Always wake the new subscriber once data is ready, even if the load
    // already completed before it subscribed.
    ensureLoaded().then(() => listener());
    return () => { _listeners.delete(listener); };
  },
};

const STATUT_MAP: Record<"green" | "amber" | "danger", Statut> = {
  green: "SAIN",
  amber: "VIGILANCE",
  danger: "À RISQUE",
};

export function toClient(s: StoredCsmClient): Client {
  return {
    id: s.id,
    initials: s.initials,
    color: s.color,
    name: s.name,
    collab: s.collab,
    statut: STATUT_MAP[s.statut],
    consoAteliers: [0, s.atelierTotal],
    action: "",
    actionDate: "",
    renouvDate: s.contractEnd,
    arr: s.arr,
  };
}

export function toClientDetail(s: StoredCsmClient): ClientDetail {
  return {
    piloteRH: "",
    csm: "", // CSM name is resolved from owner_csm_id + profiles by the UI
    contrat: "",
    dernierPoint: "",
    contractStart: s.contractStart,
    contractEnd: s.contractEnd,
    churnNotice: s.churnNotice,
    atelierTotal: s.atelierTotal,
    atelierRemaining: s.atelierTotal,
    formule: s.formule,
    rdvParCollab: s.rdvParCollab,
    produits: s.produits,
    statusTags: [],
    lastModified: s.createdAt,
    nextEvent: { label: "", title: "Aucun événement planifié", meta: "", deckPct: 0, deckLabel: "", sections: "0" },
    bigPicture: {
      contrat: { days: 0, range: `${s.contractStart} → ${s.contractEnd}`, arr: `${s.arr.toLocaleString("fr")} €`, progress: 0, footer: "" },
      avancement: { done: 0, total: s.atelierTotal, detail: "", progress: 0, footer: "" },
      sante: { nps: 0, engagement: 0, trend: "", progress: 0 },
      alertes: { count: 0, detail: "", upsell: "" },
    },
    actions: [],
    planQ1: [],
    planQ2Theme: "", planQ2Period: "", planQ2Sub: "", planQ2Done: [], planQ2Upcoming: [],
    planQ3Theme: "", planQ3Period: "", planQ3Sub: "", planQ3: [],
    planQ4Theme: "", planQ4Period: "", planQ4Sub: "", planQ4: [],
    notes: [],
    history: [],
  };
}
