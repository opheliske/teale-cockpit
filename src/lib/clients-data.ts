export type Statut = "SAIN" | "VIGILANCE" | "À RISQUE";

export type Client = {
  id: string;
  initials: string;
  color: string;
  name: string;
  collab: number;
  tag?: string;
  statut: Statut;
  consoAteliers: [number, number];
  action: string;
  actionDate: string;
  renouvDate: string;
  churnNotice?: string; // ISO date, optional
  arr: number;
};

export const CLIENTS: Client[] = [];

export type RenewalItem = {
  initials: string;
  color: string;
  name: string;
  days: number;
  arr: number;
  status: string;
};

export const RENEWALS: RenewalItem[] = [];

export type ChurnNoticeItem = {
  id: string;
  initials: string;
  color: string;
  name: string;
  churnNotice: string; // ISO YYYY-MM-DD
  contractEnd: string; // ISO YYYY-MM-DD
  arr: number;
  statut: Statut;
};

export const CHURN_NOTICES: ChurnNoticeItem[] = [];

export type HomeAction = {
  id: number;
  text: string;
  clients: { name: string; color: string }[];
  overdue?: boolean;
  echeance: string;
  done?: boolean;
};

export const HOME_ACTIONS: HomeAction[] = [];

// ─── Detail types ─────────────────────────────────────────────────────────────

export type PrioActionStatus = "late" | "warn" | "normal" | "done";
export type PrioAction = {
  id: number;
  title: string;
  dueLabel: string;
  status: PrioActionStatus;
};

export type PlanItemType = "atelier" | "kit" | "csm" | "qbr" | "custom";
export type ContractFormule = "holistique" | "digital + tokens" | "digital only";
export type ProduitTeale = "Joy" | "Dashboard RH" | "Pulse" | "Call d'orientation" | "Ligne d'écoute" | "Assistante sociale";
export type PlanItemFile = {
  id: string;
  name: string;
  url: string;
  sizeLabel: string;
  mimeType: string;
};

export type PlanItem = {
  id: number;
  type: PlanItemType;
  icon: string;
  title: string;
  meta: string;
  done: boolean;
  responsable?: string;
  detail?: string;
  impact?: string;
  files?: PlanItemFile[];
  targets?: string[];
};

export type NoteType = "csm" | "decision" | "qbr" | "alert" | "atelier";
export type Note = {
  id: number;
  type: NoteType;
  date: string;
  text: string;
  ctaLabel: string;
  ctaVariant: "primary" | "default" | "danger";
  alert?: boolean;
};

export type HistoryEventType = "atelier" | "qbr" | "csm" | "kit" | "decision" | "renouvellement" | "alerte" | "onboarding";
export type HistoryEvent = {
  id: number;
  type: HistoryEventType;
  date: string;
  title: string;
  meta?: string;
};

export type QuarterSummary = {
  theme: string;
  period: string;
  done: number;
  total: number;
  highlight: string;
};

export type YearSummary = {
  yearLabel: string;
  q1: QuarterSummary;
  q2: QuarterSummary;
  q3: QuarterSummary;
  q4: QuarterSummary;
};

export type StatusTag = { label: string; variant: "green" | "blue" | "amber" | "red" };

export type ClientDetail = {
  piloteRH: string;
  csm: string;
  contrat: string;
  dernierPoint: string;
  contractStart: string;
  contractEnd: string;
  churnNotice: string;
  atelierTotal: number;
  atelierRemaining: number;
  formule: ContractFormule;
  rdvParCollab: number;
  nombreTokens?: number;
  produits: ProduitTeale[];
  statusTags: StatusTag[];
  lastModified: string;
  nextEvent: { label: string; title: string; meta: string; deckPct: number; deckLabel: string; sections: string };
  bigPicture: {
    contrat: { days: number; range: string; arr: string; progress: number; footer: string };
    avancement: { done: number; total: number; detail: string; progress: number; footer: string };
    sante: { nps: number; engagement: number; trend: string; progress: number };
    alertes: { count: number; detail: string; upsell: string };
  };
  actions: PrioAction[];
  planQ1: PlanItem[];
  planQ2Theme: string; planQ2Period: string; planQ2Sub: string;
  planQ2Done: PlanItem[]; planQ2Upcoming: PlanItem[];
  planQ3Theme: string; planQ3Period: string; planQ3Sub: string; planQ3: PlanItem[];
  planQ4Theme: string; planQ4Period: string; planQ4Sub: string; planQ4: PlanItem[];
  notes: Note[];
  history: HistoryEvent[];
  prevYear?: YearSummary;
};

export const CLIENT_DETAILS: Record<string, ClientDetail> = {};
