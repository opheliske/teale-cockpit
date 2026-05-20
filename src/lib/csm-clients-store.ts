import { supabase } from "./supabase";
import type { ContractFormule, ProduitTeale, Client, ClientDetail, Statut } from "./clients-data";

export type StoredCsmClient = {
  id: string;
  name: string;
  initials: string;
  color: string;
  collab: number;
  csm: string;
  csmLabel: string;
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
  csm: string;
  csm_label: string;
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
    csm: row.csm,
    csmLabel: row.csm_label,
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
    csm: c.csm,
    csm_label: c.csmLabel,
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
const _listeners = new Set<() => void>();

function notify() { _listeners.forEach((l) => l()); }

async function ensureLoaded() {
  if (_loaded) return;
  _loaded = true;
  const { data } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
  _clients = (data ?? []).map((r) => fromRow(r as DbRow));
  notify();
}

export const csmClientsStore = {
  getAll: (): StoredCsmClient[] => _clients,

  get: (id: string): StoredCsmClient | undefined => _clients.find((c) => c.id === id),

  add: async (client: StoredCsmClient) => {
    const { error } = await supabase.from("clients").upsert(toRow(client));
    if (error) { console.error("csmClientsStore.add", error); return; }
    _clients = [client, ..._clients.filter((c) => c.id !== client.id)];
    notify();
  },

  subscribe: (listener: () => void) => {
    _listeners.add(listener);
    ensureLoaded();
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
    csm: s.csmLabel,
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
