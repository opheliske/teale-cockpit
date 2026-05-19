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
  arr: number;
};

export const CLIENTS: Client[] = [
  {
    id: "bx",
    initials: "BX",
    color: "#0ea5e9",
    name: "Biocodex",
    collab: 2500,
    statut: "SAIN",
    consoAteliers: [6, 10],
    action: "Préparer le deck QBR H1",
    actionDate: "2 juin 2026",
    renouvDate: "1 sept. 2026",
    arr: 78000,
  },
];

export type RenewalItem = {
  initials: string;
  color: string;
  name: string;
  days: number;
  arr: number;
  status: string;
};

export const RENEWALS: RenewalItem[] = [
  { initials: "BX", color: "#0ea5e9", name: "Biocodex", days: 106, arr: 78000, status: "green" },
];

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

export const CHURN_NOTICES: ChurnNoticeItem[] = [
  { id: "bx",  initials: "BX", color: "#0ea5e9", name: "Biocodex",         churnNotice: "2026-06-01", contractEnd: "2026-09-01", arr: 78000,  statut: "SAIN" },
  { id: "mf",  initials: "MF", color: "#8b5cf6", name: "Maif",             churnNotice: "2026-06-10", contractEnd: "2026-09-10", arr: 54000,  statut: "VIGILANCE" },
  { id: "oc",  initials: "OC", color: "#f59e0b", name: "Orange CSEP",      churnNotice: "2026-06-25", contractEnd: "2026-09-25", arr: 92000,  statut: "SAIN" },
  { id: "cr",  initials: "CR", color: "#ef4444", name: "Crédit Agricole",  churnNotice: "2026-07-15", contractEnd: "2026-10-15", arr: 120000, statut: "À RISQUE" },
  { id: "sg",  initials: "SG", color: "#22c55e", name: "Société Générale", churnNotice: "2026-08-01", contractEnd: "2026-11-01", arr: 68000,  statut: "SAIN" },
  { id: "edf", initials: "EF", color: "#ec4899", name: "EDF",              churnNotice: "2026-08-20", contractEnd: "2026-11-20", arr: 85000,  statut: "VIGILANCE" },
];

export type HomeAction = {
  id: number;
  text: string;
  clients: { name: string; color: string }[];
  overdue?: boolean;
  echeance: string;
  done?: boolean;
};

export const HOME_ACTIONS: HomeAction[] = [
  {
    id: 1,
    text: "Préparer le deck QBR H1 Biocodex",
    clients: [{ name: "Biocodex", color: "#0ea5e9" }],
    echeance: "2 juin 2026",
    overdue: false,
  },
  {
    id: 2,
    text: "Valider le thème de l'atelier Q4 avec Claire Fontaine",
    clients: [{ name: "Biocodex", color: "#0ea5e9" }],
    echeance: "15 juin 2026",
  },
  {
    id: 3,
    text: "Relancer sur la conso des tokens Pulse",
    clients: [{ name: "Biocodex", color: "#0ea5e9" }],
    echeance: "20 juin 2026",
  },
];

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

// ─── Per-client detail data ───────────────────────────────────────────────────

export const CLIENT_DETAILS: Record<string, ClientDetail> = {
  bx: {
    piloteRH: "Claire Fontaine",
    csm: "Lucie Martin",
    contrat: "TL-2025-0238",
    dernierPoint: "6 mai 2026",
    contractStart: "2025-09-01",
    contractEnd: "2026-09-01",
    churnNotice: "2026-06-01",
    atelierTotal: 10,
    atelierRemaining: 4,
    formule: "holistique",
    rdvParCollab: 1.2,
    produits: ["Joy", "Dashboard RH", "Pulse"],
    statusTags: [
      { label: "Sain", variant: "green" },
      { label: "NPS 7.8", variant: "green" },
      { label: "Churn notice 1 juin", variant: "amber" },
    ],
    lastModified: "18 mai 2026",
    nextEvent: {
      label: "QBR",
      title: "QBR H1 Biocodex",
      meta: "Claire Fontaine + 2 DG · visio",
      deckPct: 25,
      deckLabel: "1/4 sections complètes",
      sections: "4",
    },
    bigPicture: {
      contrat: {
        days: 106,
        range: "1 sept. 2025 → 1 sept. 2026",
        arr: "78 000 €",
        progress: 80,
        footer: "Renouvellement dans 106 jours",
      },
      avancement: {
        done: 18,
        total: 24,
        detail: "6 ateliers · 8 kits · 4 points CSM",
        progress: 75,
        footer: "6 jalons restants ce trimestre",
      },
      sante: {
        nps: 78,
        engagement: 68,
        trend: "+4 pts vs T1",
        progress: 78,
      },
      alertes: {
        count: 1,
        detail: "Sous-conso tokens Pulse en Q3",
        upsell: "Extension 2 ateliers proposée",
      },
    },
    actions: [
      { id: 1, title: "Préparer le deck QBR H1", dueLabel: "Échéance 2 juin 2026", status: "warn" },
      { id: 2, title: "Confirmer l'atelier Q4 avec Claire Fontaine", dueLabel: "Échéance 15 juin 2026", status: "normal" },
      { id: 3, title: "Relancer sur la conso des tokens Pulse", dueLabel: "Échéance 20 juin 2026", status: "normal" },
    ],
    planQ1: [
      { id: 1, type: "kit",     icon: "📢", title: "Kit lancement plateforme Joy",          meta: "Adrian · 8 sept. 2025",           done: true },
      { id: 2, type: "csm",    icon: "📞", title: "Kick-off projet",                        meta: "CSM · 15 sept. 2025",             done: true },
      { id: 3, type: "atelier",icon: "🎓", title: "Atelier « Comprendre Teale »",           meta: "Pia · 14 oct. 2025 · 38 inscrits",done: true },
      { id: 4, type: "kit",    icon: "📢", title: "Kit bien-être au travail",               meta: "Adrian · 4 nov. 2025",            done: true },
      { id: 5, type: "atelier",icon: "🎓", title: "Atelier « Gestion du stress »",          meta: "Pia · 20 nov. 2025 · 34 inscrits",done: true },
      { id: 6, type: "csm",    icon: "📞", title: "Points CSM mensuels × 3",               meta: "CSM · sept—nov 2025",             done: true },
    ],
    planQ2Theme: "🌱 Sensibilisation & engagement",
    planQ2Period: "Déc 2025 — Fév 2026",
    planQ2Sub: "Ancrer les usages avec les managers et monter en NPS.",
    planQ2Done: [
      { id: 7,  type: "kit",     icon: "📢", title: "Kit retour vacances & résilience",      meta: "Adrian · 3 déc. 2025",            done: true },
      { id: 8,  type: "atelier", icon: "🎓", title: "Atelier « Charge mentale »",            meta: "Pia · 22 janv. 2026 · 41 inscrits",done: true },
      { id: 9,  type: "csm",    icon: "📞", title: "Points CSM mensuels × 2",               meta: "CSM · déc 2025 — janv 2026",      done: true },
      { id: 10, type: "custom", icon: "⚡", title: "Webinaire managers & santé mentale",    meta: "Lucie · 18 fév. 2026 · 52 inscrits",done: true },
    ],
    planQ2Upcoming: [
      { id: 11, type: "atelier", icon: "🎓", title: "Atelier « Communication CNV »",         meta: "Pia · 12 mars 2026 · 29 inscrits",done: true },
      { id: 12, type: "qbr",    icon: "📊", title: "QBR T2 (revue 6 mois)",                meta: "CSM · 25 mars 2026",              done: true },
    ],
    planQ3Theme: "📈 Animation & développement",
    planQ3Period: "Avr — Juin 2026",
    planQ3Sub: "Approfondir l'engagement et préparer le renouvellement.",
    planQ3: [
      { id: 13, type: "kit",     icon: "📢", title: "Kit prévention burnout",                meta: "Adrian · 7 avr. 2026",           done: true },
      { id: 14, type: "atelier", icon: "🎓", title: "Atelier « Leadership bienveillant »",   meta: "Pia · 28 avr. 2026 · 33 inscrits",done: true },
      { id: 15, type: "csm",    icon: "📞", title: "Points CSM × 2",                        meta: "CSM · avr — mai 2026",           done: true },
      { id: 16, type: "atelier", icon: "🎓", title: "Atelier « Manager coach »",             meta: "Pia · 19 mai 2026 · 27 inscrits", done: false },
      { id: 17, type: "qbr",    icon: "📊", title: "QBR H1",                               meta: "CSM · 2 juin 2026",              done: false },
    ],
    planQ4Theme: "📊 Bilan & renouvellement",
    planQ4Period: "Juil — Août 2026",
    planQ4Sub: "Finaliser les ateliers restants et cadrer le contrat N+1.",
    planQ4: [
      { id: 18, type: "atelier", icon: "🎓", title: "Atelier « Gestion des émotions »",     meta: "Pia · juil. 2026",               done: false },
      { id: 19, type: "atelier", icon: "🎓", title: "Dernier atelier au choix",             meta: "Pia · août 2026",                done: false },
      { id: 20, type: "kit",    icon: "📢", title: "Kit bilan annuel collaborateurs",       meta: "Adrian · juil. 2026",            done: false },
      { id: 21, type: "csm",    icon: "📞", title: "Point renouvellement",                  meta: "CSM · août 2026",                done: false },
      { id: 22, type: "qbr",    icon: "📊", title: "QBR annuel & cadrage N+1",             meta: "CSM · fin août 2026",            done: false },
    ],
    notes: [
      {
        id: 1,
        type: "csm",
        date: "6 mai 2026",
        text: "Point CSM mensuel — Claire très engagée, la plateforme Joy tourne bien. Elle souhaite intégrer Pulse davantage auprès des managers de proximité. À creuser en Q4.",
        ctaLabel: "Voir le plan",
        ctaVariant: "default",
      },
      {
        id: 2,
        type: "alert",
        date: "12 avr. 2026",
        text: "Sous-consommation des tokens Pulse détectée : 38 % utilisés sur les 3 premiers mois. Risque de ne pas atteindre les 80 % contractuels. Relance nécessaire avant fin mai.",
        ctaLabel: "Créer une action",
        ctaVariant: "danger",
        alert: true,
      },
      {
        id: 3,
        type: "qbr",
        date: "25 mars 2026",
        text: "QBR T2 — NPS passé de 7.4 à 7.8, engagement en hausse de 4 pts. Claire a validé le thème Q3 « Leadership bienveillant ». Deck transmis et signé.",
        ctaLabel: "Voir le deck",
        ctaVariant: "primary",
      },
      {
        id: 4,
        type: "decision",
        date: "18 fév. 2026",
        text: "Décision d'ajouter un webinaire managers hors catalogue pour renforcer l'adhésion de la ligne managériale. Budget pris sur les tokens custom.",
        ctaLabel: "Voir le compte-rendu",
        ctaVariant: "default",
      },
      {
        id: 5,
        type: "atelier",
        date: "22 janv. 2026",
        text: "Atelier « Charge mentale » — 41 inscrits sur 45 invités. Taux de satisfaction post-atelier : 9.1/10. 3 collaborateurs ont ouvert un suivi avec un psy dans les 48h.",
        ctaLabel: "Voir le rapport",
        ctaVariant: "default",
      },
    ],
    history: [
      { id: 1,  type: "onboarding",    date: "1 sept. 2025",  title: "Signature & onboarding",              meta: "Contrat TL-2025-0238 · 78 000 €/an" },
      { id: 2,  type: "kit",           date: "8 sept. 2025",  title: "Kit lancement plateforme Joy",        meta: "Envoyé à 2 500 collaborateurs" },
      { id: 3,  type: "csm",           date: "15 sept. 2025", title: "Kick-off projet",                     meta: "Avec Claire Fontaine · 45 min" },
      { id: 4,  type: "atelier",       date: "14 oct. 2025",  title: "Atelier « Comprendre Teale »",        meta: "38 inscrits · satisfaction 8.7/10" },
      { id: 5,  type: "csm",           date: "28 oct. 2025",  title: "Point CSM mensuel",                  meta: "Avec Claire Fontaine" },
      { id: 6,  type: "kit",           date: "4 nov. 2025",   title: "Kit bien-être au travail",            meta: "Campagne Q4" },
      { id: 7,  type: "atelier",       date: "20 nov. 2025",  title: "Atelier « Gestion du stress »",       meta: "34 inscrits · satisfaction 9.0/10" },
      { id: 8,  type: "csm",           date: "26 nov. 2025",  title: "Point CSM mensuel",                  meta: "Avec Claire Fontaine" },
      { id: 9,  type: "kit",           date: "3 déc. 2025",   title: "Kit retour vacances & résilience",    meta: "Campagne Noël" },
      { id: 10, type: "csm",           date: "15 janv. 2026", title: "Point CSM mensuel",                  meta: "Avec Claire Fontaine" },
      { id: 11, type: "atelier",       date: "22 janv. 2026", title: "Atelier « Charge mentale »",          meta: "41 inscrits · satisfaction 9.1/10" },
      { id: 12, type: "decision",      date: "18 fév. 2026",  title: "Webinaire managers ajouté",           meta: "Hors catalogue · budget tokens" },
      { id: 13, type: "atelier",       date: "18 fév. 2026",  title: "Webinaire managers & santé mentale",  meta: "52 participants · satisfaction 8.8/10" },
      { id: 14, type: "atelier",       date: "12 mars 2026",  title: "Atelier « Communication CNV »",       meta: "29 inscrits · satisfaction 8.5/10" },
      { id: 15, type: "qbr",           date: "25 mars 2026",  title: "QBR T2 — NPS 7.8",                   meta: "NPS +4 pts · engagement +6 pts" },
      { id: 16, type: "kit",           date: "7 avr. 2026",   title: "Kit prévention burnout",              meta: "Campagne Q3" },
      { id: 17, type: "atelier",       date: "28 avr. 2026",  title: "Atelier « Leadership bienveillant »", meta: "33 inscrits · satisfaction 8.9/10" },
      { id: 18, type: "alerte",        date: "12 avr. 2026",  title: "Alerte sous-conso Pulse",             meta: "38 % utilisés · relance nécessaire" },
      { id: 19, type: "csm",           date: "6 mai 2026",    title: "Point CSM mensuel",                  meta: "Avec Claire Fontaine" },
    ],
  },
};
