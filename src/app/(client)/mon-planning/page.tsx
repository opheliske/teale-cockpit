"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  getUrgencies,
  modalitiesToList,
  parseEventDate,
  urgencyTypeEmoji,
  urgencyTypeLabels,
  urgencyModeLabels,
  type Urgency,
} from "@/lib/urgencies";
import { workshops } from "@/app/(client)/catalogue-ateliers/data";
import { lancementKits, animationItems, emailTopicKits } from "@/app/(client)/kits-communication/data";

const TODAY_MONTH = "May";
const TODAY_YEAR = 2026;
const AVAILABLE_YEARS = [2025, 2026, 2027] as const;
type Year = (typeof AVAILABLE_YEARS)[number];

const allMonths = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const monthLabel: Record<string, string> = {
  January: "Janvier",
  February: "Février",
  March: "Mars",
  April: "Avril",
  May: "Mai",
  June: "Juin",
  July: "Juillet",
  August: "Août",
  September: "Septembre",
  October: "Octobre",
  November: "Novembre",
  December: "Décembre",
};

type MonthStatus = "past" | "current" | "upcoming";

function monthStatus(month: string, year: number): MonthStatus {
  if (year < TODAY_YEAR) return "past";
  if (year > TODAY_YEAR) return "upcoming";
  const idx = allMonths.indexOf(month);
  const today = allMonths.indexOf(TODAY_MONTH);
  if (idx < today) return "past";
  if (idx === today) return "current";
  return "upcoming";
}

type QuarterId = "Q1" | "Q2" | "Q3" | "Q4";
type QuarterStatus = "past" | "current" | "upcoming";

type Quarter = {
  id: QuarterId;
  label: string;
  theme: string;
  subtitle: string;
  months: string[];
  gradient: string;
  emoji: string;
};

const quarters: Quarter[] = [
  {
    id: "Q1",
    label: "Q1 2026",
    theme: "Lancement & onboarding",
    subtitle:
      "Activer la plateforme auprès de toutes les équipes et installer les bons réflexes.",
    months: ["January", "February", "March"],
    gradient: "from-[#4d6961] to-[#c2bbab]",
    emoji: "🚀",
  },
  {
    id: "Q2",
    label: "Q2 2026",
    theme: "Sensibilisation & engagement",
    subtitle:
      "Approfondir les usages avec les premiers ateliers et activations communautaires.",
    months: ["April", "May", "June"],
    gradient: "from-[#2d6b62] to-[#4cbfa6]",
    emoji: "🌱",
  },
  {
    id: "Q3",
    label: "Q3 2026",
    theme: "Animation & fidélisation",
    subtitle:
      "Maintenir l'élan après l'été et préparer les temps forts d'automne.",
    months: ["July", "August", "September"],
    gradient: "from-[#2a7d4a] to-[#a8e895]",
    emoji: "🌿",
  },
  {
    id: "Q4",
    label: "Q4 2026",
    theme: "Bilan & perspectives",
    subtitle: "Mesurer l'impact de l'année et co-construire le plan 2027.",
    months: ["October", "November", "December"],
    gradient: "from-[#8fb6c7] to-[#2d6b62]",
    emoji: "📊",
  },
];

function quarterStatus(q: Quarter, year: number): QuarterStatus {
  const statuses = q.months.map((m) => monthStatus(m, year));
  if (statuses.every((s) => s === "past")) return "past";
  if (statuses.includes("current")) return "current";
  return "upcoming";
}

type EventType =
  | "atelier"
  | "kit"
  | "point"
  | "qbr"
  | "onboarding"
  | "urgence";

const eventTypeConfig: Record<
  EventType,
  { label: string; emoji: string; pillClass: string }
> = {
  atelier: {
    label: "Atelier",
    emoji: "🎓",
    pillClass: "bg-[rgba(168,85,247,0.15)] text-[#c4b5fd]",
  },
  kit: {
    label: "Kit comm",
    emoji: "📢",
    pillClass: "bg-[rgba(94,234,212,0.15)] text-[#5eead4]",
  },
  point: {
    label: "Point CSM",
    emoji: "📞",
    pillClass: "bg-[rgba(250,204,21,0.15)] text-[#fde047]",
  },
  qbr: {
    label: "QBR",
    emoji: "📊",
    pillClass: "bg-[rgba(96,165,250,0.15)] text-[#93c5fd]",
  },
  onboarding: {
    label: "Onboarding",
    emoji: "🚀",
    pillClass: "bg-[rgba(251,146,60,0.15)] text-[#fdba74]",
  },
  urgence: {
    label: "Urgence",
    emoji: "🚨",
    pillClass: "bg-brand-salmon/20 text-brand-salmon",
  },
};

type Audience = "RH" | "Elus" | "Managers" | "Collaborateurs" | "Codir";

const audienceConfig: Record<
  Audience,
  { label: string; emoji: string; pillClass: string }
> = {
  RH: {
    label: "RH",
    emoji: "👔",
    pillClass: "bg-brand-accent/15 text-brand-accent",
  },
  Elus: {
    label: "Élus",
    emoji: "🎯",
    pillClass: "bg-brand-salmon/15 text-brand-salmon",
  },
  Managers: {
    label: "Managers",
    emoji: "👥",
    pillClass: "bg-brand-green-bright/15 text-brand-green-bright",
  },
  Collaborateurs: {
    label: "Collaborateurs",
    emoji: "🧑‍🤝‍🧑",
    pillClass: "bg-brand-cream/10 text-brand-cream",
  },
  Codir: {
    label: "Codir",
    emoji: "👑",
    pillClass: "bg-brand-upcoming/15 text-brand-upcoming",
  },
};

const countryFlag: Record<string, string> = {
  France: "🇫🇷",
  "Royaume-Uni": "🇬🇧",
  Espagne: "🇪🇸",
  Allemagne: "🇩🇪",
  Italie: "🇮🇹",
  "États-Unis": "🇺🇸",
  Belgique: "🇧🇪",
  Portugal: "🇵🇹",
};

type EventScope = {
  audiences?: Audience[];
  departments?: string[];
  countries?: string[];
  allCompany?: boolean;
};

type PlanEvent = {
  type: EventType;
  title: string;
  date?: string;
  done?: boolean;
  description?: string;
  details?: string[];
  scope?: EventScope;
};

function defaultDescription(type: EventType): string {
  switch (type) {
    case "atelier":
      return "Atelier collectif animé par un·e psychologue teale formé·e aux enjeux du monde du travail. Format live d'1 heure, ouvert à tous vos collaborateurs sur inscription.";
    case "kit":
      return "Kit de communication clé-en-main fourni par teale : emails prêts à diffuser, visuels (bannières Slack / Teams, fonds de mail), affiches et conseils de relais.";
    case "point":
      return "Point mensuel avec votre Customer Success Manager pour faire le bilan des actions menées, ajuster le plan et anticiper les prochaines échéances.";
    case "qbr":
      return "Quarterly Business Review — moment partagé avec votre direction pour mesurer l'impact du programme teale et planifier la suite.";
    case "onboarding":
      return "Session d'activation teale pour une équipe ou un département spécifique : présentation de la plateforme, parcours d'inscription et premiers usages.";
    case "urgence":
      return "Situation d'urgence déclarée depuis le catalogue d'intervention. Une intervention teale est en cours d'organisation avec votre CSM.";
  }
}

function urgencyToPlanEvent(u: Urgency, displayDate: string): PlanEvent {
  const details: string[] = [];
  const mods = modalitiesToList(u.modalities);
  if (mods.length > 0) details.push(`Modalités demandées : ${mods.join(", ")}`);
  if (u.affectedHeadcount) details.push(`Effectifs : ${u.affectedHeadcount}`);
  const modeLine = u.location
    ? `${urgencyModeLabels[u.mode]} — ${u.location}`
    : urgencyModeLabels[u.mode];
  details.push(`Format : ${modeLine}`);
  if (u.rhContact) details.push(`Contact RH : ${u.rhContact}`);
  return {
    type: "urgence",
    title: `${urgencyTypeEmoji[u.type]} ${urgencyTypeLabels[u.type]}`,
    date: displayDate,
    description: u.description,
    details,
  };
}

const events2026: Record<string, PlanEvent[]> = {
  January: [
    {
      type: "onboarding",
      title: "Onboarding équipes Codir & RH",
      date: "12 janv.",
      done: true,
      details: ["20 participants", "Format : visio 1h + Q&A"],
      scope: {
        audiences: ["Codir", "RH"],
        countries: ["France"],
      },
    },
    {
      type: "kit",
      title: "Kit de lancement teale — diffusion",
      date: "20 janv.",
      done: true,
      details: [
        "Email d'annonce collaborateurs",
        "Bannières Slack / Teams",
        "FAQ rapide à distribuer",
      ],
      scope: { allCompany: true, countries: ["France", "Royaume-Uni"] },
    },
  ],
  February: [
    {
      type: "atelier",
      title: "Atelier « Communication non violente »",
      date: "14 fév.",
      done: true,
      details: [
        "Animé par Bérénice Lefevre",
        "25 inscrits, 22 présents",
        "Note moyenne 4,7 / 5",
      ],
      scope: {
        audiences: ["Managers", "Collaborateurs"],
        departments: ["Tech", "Produit"],
        countries: ["France"],
      },
    },
    {
      type: "point",
      title: "Point CSM mensuel",
      date: "26 fév.",
      done: true,
      details: ["Bilan adoption mois 1", "Validation kit Q2"],
      scope: { audiences: ["RH"], countries: ["France"] },
    },
  ],
  March: [
    {
      type: "qbr",
      title: "Bilan trimestriel Q1",
      date: "12 mars",
      done: true,
      details: [
        "Présenté au Codir + DRH",
        "KPI engagement, indice santé mentale, top thématiques",
      ],
      scope: {
        audiences: ["Codir", "RH"],
        countries: ["France", "Royaume-Uni"],
      },
    },
    {
      type: "kit",
      title: "Kit de communication Q2 — préparation",
      date: "25 mars",
      done: true,
      scope: { allCompany: true, countries: ["France", "Royaume-Uni"] },
    },
  ],
  April: [
    {
      type: "atelier",
      title: "Atelier « Charge mentale »",
      date: "28 avr.",
      done: true,
      details: ["Animé par Larissa Kalisch", "30 inscrits"],
      scope: {
        audiences: ["Collaborateurs", "Managers", "RH"],
        departments: ["Customer Care", "Sales"],
        countries: ["France"],
      },
    },
    {
      type: "point",
      title: "Point CSM mensuel",
      date: "10 avr.",
      done: true,
      scope: { audiences: ["RH"], countries: ["France"] },
    },
  ],
  May: [
    {
      type: "point",
      title: "Point CSM mensuel",
      date: "15 mai",
      details: [
        "Préparation atelier Gestion du stress",
        "Validation kit ressources",
      ],
      scope: { audiences: ["RH"], countries: ["France"] },
    },
    {
      type: "atelier",
      title: "Atelier « Gestion du stress »",
      date: "22 mai",
      details: [
        "Animé par Marc Dupont",
        "25 inscrits à ce jour",
        "Lien Livestorm à diffuser à J-7",
      ],
      scope: {
        audiences: ["Collaborateurs"],
        departments: ["Tech", "Produit", "Customer Care"],
        countries: ["France"],
      },
    },
    {
      type: "kit",
      title: "Kit ressources santé mentale",
      date: "29 mai",
      details: [
        "Email manager + email collaborateur",
        "3 visuels Slack / Teams",
      ],
      scope: { allCompany: true, countries: ["France", "Royaume-Uni"] },
    },
  ],
  June: [
    {
      type: "atelier",
      title: "Atelier « Manager bienveillant »",
      date: "10 juin",
      details: ["Animé par Carola Gawehn"],
      scope: {
        audiences: ["Managers"],
        countries: ["France", "Royaume-Uni"],
      },
    },
    {
      type: "qbr",
      title: "QBR Q2",
      date: "30 juin",
      details: ["Présentation au Codir", "Slides préparées en amont"],
      scope: { audiences: ["Codir", "RH"], countries: ["France", "Royaume-Uni"] },
    },
  ],
  July: [
    {
      type: "kit",
      title: "Kit de communication estival",
      date: "8 juil.",
      details: ["Conseils déconnexion vacances", "Affiches bureaux"],
      scope: {
        allCompany: true,
        countries: ["France", "Royaume-Uni", "Espagne"],
      },
    },
  ],
  August: [],
  September: [
    {
      type: "atelier",
      title: "Atelier de rentrée — gestion du stress",
      date: "18 sept.",
      scope: { audiences: ["Collaborateurs"], countries: ["France"] },
    },
    {
      type: "kit",
      title: "Kit de communication rentrée",
      date: "5 sept.",
      scope: { allCompany: true, countries: ["France", "Royaume-Uni"] },
    },
    {
      type: "point",
      title: "Point CSM trimestriel",
      date: "24 sept.",
      scope: { audiences: ["RH"], countries: ["France"] },
    },
  ],
  October: [
    {
      type: "atelier",
      title: "Atelier « Octobre rose »",
      date: "16 oct.",
      scope: {
        allCompany: true,
        countries: ["France", "Royaume-Uni"],
      },
    },
    {
      type: "kit",
      title: "Kit communication Octobre rose",
      date: "1 oct.",
      scope: {
        allCompany: true,
        countries: ["France", "Royaume-Uni", "Espagne"],
      },
    },
  ],
  November: [
    {
      type: "atelier",
      title: "Atelier QVCT",
      date: "20 nov.",
      details: ["Semaine de la qualité de vie au travail"],
      scope: {
        allCompany: true,
        countries: ["France"],
      },
    },
    {
      type: "kit",
      title: "Kit communication QVCT",
      date: "10 nov.",
      scope: {
        allCompany: true,
        countries: ["France"],
      },
    },
  ],
  December: [
    {
      type: "qbr",
      title: "QBR annuel — bilan & roadmap 2027",
      date: "15 déc.",
      details: ["Bilan complet de l'année", "Co-construction du plan 2027"],
      scope: { audiences: ["Codir", "RH"], countries: ["France", "Royaume-Uni"] },
    },
    {
      type: "point",
      title: "Bilan annuel partagé",
      date: "20 déc.",
      scope: { audiences: ["RH"], countries: ["France"] },
    },
  ],
};

const events2025: Record<string, PlanEvent[]> = {
  January: [
    {
      type: "kit",
      title: "Kit de communication Q1 — diffusion",
      date: "15 janv.",
      done: true,
      scope: { allCompany: true, countries: ["France"] },
    },
  ],
  February: [
    {
      type: "atelier",
      title: "Atelier « Prévenir les RPS »",
      date: "11 fév.",
      done: true,
      details: ["Animé par Adrien Bournas", "18 inscrits"],
      scope: {
        audiences: ["Managers", "RH"],
        countries: ["France"],
      },
    },
    {
      type: "point",
      title: "Point CSM mensuel",
      date: "25 fév.",
      done: true,
      scope: { audiences: ["RH"], countries: ["France"] },
    },
  ],
  March: [
    {
      type: "qbr",
      title: "QBR Q1 2025",
      date: "20 mars",
      done: true,
      scope: { audiences: ["Codir", "RH"], countries: ["France"] },
    },
  ],
  April: [],
  May: [
    {
      type: "atelier",
      title: "Atelier « Cohésion d'équipe »",
      date: "14 mai",
      done: true,
      details: ["Format présentiel à Paris"],
      scope: { audiences: ["Managers"], countries: ["France"] },
    },
  ],
  June: [
    {
      type: "qbr",
      title: "QBR Q2 2025",
      date: "26 juin",
      done: true,
      scope: { audiences: ["Codir"], countries: ["France"] },
    },
  ],
  July: [],
  August: [],
  September: [
    {
      type: "atelier",
      title: "Atelier de rentrée — sommeil",
      date: "18 sept.",
      done: true,
      scope: { allCompany: true, countries: ["France"] },
    },
    {
      type: "kit",
      title: "Kit communication rentrée 2025",
      date: "1 sept.",
      done: true,
      scope: { allCompany: true, countries: ["France"] },
    },
  ],
  October: [
    {
      type: "atelier",
      title: "Atelier « Octobre rose »",
      date: "14 oct.",
      done: true,
      scope: { allCompany: true, countries: ["France"] },
    },
  ],
  November: [
    {
      type: "kit",
      title: "Kit QVCT 2025",
      date: "12 nov.",
      done: true,
      scope: { allCompany: true, countries: ["France"] },
    },
  ],
  December: [
    {
      type: "qbr",
      title: "QBR annuel 2025 — bilan",
      date: "16 déc.",
      done: true,
      details: ["Bilan année 1 de partenariat teale"],
      scope: { audiences: ["Codir", "RH"], countries: ["France"] },
    },
  ],
};

const events2027: Record<string, PlanEvent[]> = {
  January: [
    {
      type: "kit",
      title: "Kit de communication Q1 2027 — à co-construire",
      date: "à définir",
      scope: { allCompany: true, countries: ["France", "Royaume-Uni"] },
    },
    {
      type: "point",
      title: "Kick-off année 3 de partenariat",
      date: "Mi-janvier",
      scope: { audiences: ["Codir", "RH"], countries: ["France"] },
    },
  ],
  February: [
    {
      type: "atelier",
      title: "Atelier — thématique à choisir",
      date: "à définir",
      scope: { audiences: ["Collaborateurs"], countries: ["France"] },
    },
  ],
  March: [
    {
      type: "qbr",
      title: "QBR Q1 2027",
      date: "à définir",
      scope: { audiences: ["Codir", "RH"], countries: ["France"] },
    },
  ],
  April: [],
  May: [],
  June: [],
  July: [],
  August: [],
  September: [],
  October: [],
  November: [],
  December: [],
};

const eventsByYear: Record<Year, Record<string, PlanEvent[]>> = {
  2025: events2025,
  2026: events2026,
  2027: events2027,
};

const workshopMap: Record<string, string> = {
  "Atelier « Communication non violente »": "cerveau-emotions-reactions",
  "Atelier « Charge mentale »": "charge-mentale",
  "Atelier « Gestion du stress »": "gerer-son-stress",
  "Atelier de rentrée — gestion du stress": "gerer-son-stress",
  "Atelier « Manager bienveillant »": "assertivite",
  "Atelier de rentrée — sommeil": "insomnies-sommeil",
  "Atelier « Octobre rose »": "maladie-chronique",
  "Atelier QVCT": "premiers-pas-sante-mentale",
  "Atelier « Cohésion d'équipe »": "cohesion-equipe",
  "Atelier « Prévenir les RPS »": "prevenir-rps",
};

type KitRef = {
  category: "lancement" | "animation" | "topics";
  months?: string[];
  topics?: string[];
};

const kitMap: Record<string, KitRef> = {
  "Kit de lancement teale — diffusion": { category: "lancement" },
  "Kit de communication Q2 — préparation": { category: "animation", months: ["April", "May", "June"] },
  "Kit ressources santé mentale": { category: "topics", topics: ["STRESS MANAGEMENT", "PHYSICAL WELL-BEING AND STRESS"] },
  "Kit de communication estival": { category: "topics", topics: ["WORK-LIFE BALANCE"] },
  "Kit de communication rentrée": { category: "animation", months: ["September"] },
  "Kit communication Octobre rose": { category: "animation", months: ["October"] },
  "Kit communication QVCT": { category: "animation", months: ["June"] },
  "Kit de communication Q1 — diffusion": { category: "lancement" },
  "Kit communication rentrée 2025": { category: "animation", months: ["September"] },
  "Kit QVCT 2025": { category: "animation", months: ["June"] },
  "Kit de communication Q1 2027 — à co-construire": { category: "lancement" },
};

type CsmDocument = {
  id: string;
  title: string;
  type: string;
  size: string;
  date: string;
  author: string;
};

const documents: CsmDocument[] = [
  {
    id: "plan-annuel-2026",
    title: "Plan d'animation annuel 2026",
    type: "Stratégie",
    size: "2,4 Mo",
    date: "15 janvier 2026",
    author: "Lucie Martin, CSM",
  },
  {
    id: "qbr-q1-2026",
    title: "Compte-rendu QBR Q1 2026",
    type: "QBR",
    size: "1,8 Mo",
    date: "14 mars 2026",
    author: "Lucie Martin, CSM",
  },
  {
    id: "strategie-managers",
    title: "Stratégie de déploiement managers",
    type: "Stratégie",
    size: "3,1 Mo",
    date: "5 février 2026",
    author: "Lucie Martin, CSM",
  },
  {
    id: "bilan-q1",
    title: "Bilan trimestriel Q1 — KPI & insights",
    type: "Bilan",
    size: "1,2 Mo",
    date: "28 mars 2026",
    author: "Lucie Martin, CSM",
  },
  {
    id: "guide-ambassadeurs",
    title: "Guide d'accompagnement des ambassadeurs",
    type: "Guide",
    size: "0,9 Mo",
    date: "22 avril 2026",
    author: "Lucie Martin, CSM",
  },
];

const frMonthAbbr: Record<string, string> = {
  janv: "JAN", fév: "FÉV", mars: "MAR", avr: "AVR",
  mai: "MAI", juin: "JUI", juil: "JUL", août: "AOÛ",
  sept: "SEP", oct: "OCT", nov: "NOV", déc: "DÉC",
};

function parseDateLabel(dateStr: string): { day: string; mo: string } | null {
  const match = dateStr.match(/^(\d+)/);
  if (!match) return null;
  const day = match[1].padStart(2, "0");
  const rest = dateStr.slice(match[0].length).trim().replace(".", "").toLowerCase().split(" ")[0] ?? "";
  const mo = frMonthAbbr[rest] ?? rest.slice(0, 3).toUpperCase();
  return { day, mo };
}

function quarterProgress(q: Quarter, year: number): number {
  const status = quarterStatus(q, year);
  if (status === "past") return 100;
  if (status === "upcoming") return 0;
  const monthIdx = allMonths.indexOf(TODAY_MONTH);
  const qStart = allMonths.indexOf(q.months[0]);
  const qLen = q.months.length;
  const elapsed = monthIdx - qStart;
  return Math.round(((elapsed + 0.5) / qLen) * 100);
}

function defaultQuarter(year: Year): QuarterId {
  if (year === TODAY_YEAR) {
    const cur = quarters.find((q) => quarterStatus(q, year) === "current");
    if (cur) return cur.id;
  }
  if (year > TODAY_YEAR) return "Q1";
  return "Q4";
}

export default function MonPlanningPage() {
  const [activeYear, setActiveYear] = useState<Year>(TODAY_YEAR);
  const [activeQuarterId, setActiveQuarterId] = useState<QuarterId>(
    defaultQuarter(TODAY_YEAR)
  );
  const [activeEvent, setActiveEvent] = useState<{
    event: PlanEvent;
    month: string;
  } | null>(null);
  const [urgencies, setUrgencies] = useState<Urgency[]>([]);

  useEffect(() => {
    setUrgencies(getUrgencies());
  }, []);

  const activeQuarter =
    quarters.find((q) => q.id === activeQuarterId) ?? quarters[0];

  const yearEvents = useMemo(() => {
    const base = eventsByYear[activeYear];
    const merged: Record<string, PlanEvent[]> = {};
    for (const month of allMonths) {
      merged[month] = base[month] ? [...base[month]] : [];
    }
    for (const u of urgencies) {
      const { year, monthName, displayDate } = parseEventDate(u.eventDate);
      if (year !== activeYear) continue;
      if (!merged[monthName]) merged[monthName] = [];
      merged[monthName].unshift(urgencyToPlanEvent(u, displayDate));
    }
    return merged;
  }, [activeYear, urgencies]);

  const remainingEvents = Object.values(yearEvents)
    .flat()
    .filter((e) => !e.done).length;
  const yearTotalEvents = Object.values(yearEvents).reduce(
    (n, arr) => n + arr.length,
    0
  );

  const switchYear = (y: Year) => {
    setActiveYear(y);
    setActiveQuarterId(defaultQuarter(y));
  };

  // First upcoming event across the active quarter
  const nextEvent = useMemo<PlanEvent | null>(() => {
    for (const m of activeQuarter.months) {
      const found = (yearEvents[m] ?? []).find((e) => !e.done);
      if (found) return found;
    }
    return null;
  }, [activeQuarter, yearEvents]);

  const qEvents = activeQuarter.months.flatMap((m) => yearEvents[m] ?? []);
  const qTotal = qEvents.length;
  const qUpcoming = qEvents.filter((e) => !e.done).length;
  const qDone = qTotal - qUpcoming;

  return (
    <>
      <div className="px-9 py-8">
        <div className="mx-auto max-w-[1280px]">

          {/* Header */}
          <header className="mb-7 flex items-start justify-between gap-6">
            <div>
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[2.5px] text-[#5eead4]">
                Pilotage
              </p>
              <h1 className="mb-1.5 text-[34px] font-semibold tracking-[-0.5px] text-[#e8f5ef]">
                Suivi projet
              </h1>
              <p className="max-w-[480px] text-[13px] leading-relaxed text-[#94a8a0]">
                Plan annuel co-construit avec votre Customer Success Manager.
              </p>
            </div>
            <a
              href="https://docs.google.com/spreadsheets/d/teale-listing-employes-template/edit"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex shrink-0 items-center gap-2 rounded-[10px] border border-[rgba(94,234,212,0.25)] bg-[rgba(94,234,212,0.08)] px-4 py-2.5 text-[12px] font-medium text-[#5eead4] transition-all hover:-translate-y-px hover:bg-[rgba(94,234,212,0.15)]"
            >
              📋 Mettre à jour mon listing
            </a>
          </header>

          {/* Focus bar */}
          <FocusBar
            quarter={activeQuarter}
            year={activeYear}
            qUpcoming={qUpcoming}
            qDone={qDone}
          />

          {/* Year switcher + quarter tabs */}
          <div className="mb-7 grid items-center gap-6" style={{ gridTemplateColumns: "auto 1fr" }}>
            <YearSwitcher year={activeYear} onChange={switchYear} />
            <QuarterTabs active={activeQuarterId} year={activeYear} onSelect={setActiveQuarterId} />
          </div>

          {/* Section header */}
          <div className="mb-5 flex items-baseline justify-between">
            <div className="text-[14px] font-semibold tracking-[0.3px] text-[#e8f5ef]">
              Événements du trimestre{" "}
              <span className="text-[#5eead4]">·</span>{" "}
              <span className="font-medium text-[#94a8a0]">
                {activeQuarter.id} {activeYear}
              </span>
            </div>
            <div className="text-[11px] uppercase tracking-[0.5px] text-[#6b7c75]">
              {qTotal} événement{qTotal !== 1 ? "s" : ""} · {qUpcoming} à venir
            </div>
          </div>

          {/* Month columns */}
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
            {activeQuarter.months.map((m) => {
              const firstUpcomingInMonth = (yearEvents[m] ?? []).find((e) => !e.done) ?? null;
              const isNextMonth =
                nextEvent !== null && firstUpcomingInMonth === nextEvent;
              return (
                <MonthColumn
                  key={m}
                  month={m}
                  year={activeYear}
                  events={yearEvents[m] ?? []}
                  nextEvent={isNextMonth ? nextEvent : null}
                  onOpen={(event) => setActiveEvent({ event, month: m })}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className="border-t border-white/[0.04] px-9 pb-12 pt-10">
        <div className="mx-auto max-w-[1280px]">
          <header className="mb-5">
            <h2 className="flex items-center gap-3 text-2xl font-medium tracking-tight text-[#e8f5ef]">
              <span aria-hidden>📂</span>
              Documents partagés par votre CSM
            </h2>
            <p className="mt-1.5 ml-1 text-sm text-[#94a8a0]">
              Plans, bilans et guides pour suivre votre partenariat teale.
            </p>
          </header>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {documents.map((d) => (
              <DocumentCard key={d.id} doc={d} />
            ))}
          </div>
        </div>
      </div>

      {activeEvent && (
        <EventModal
          event={activeEvent.event}
          month={activeEvent.month}
          year={activeYear}
          onClose={() => setActiveEvent(null)}
        />
      )}
    </>
  );
}

function YearSwitcher({
  year,
  onChange,
}: {
  year: Year;
  onChange: (y: Year) => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-[11px] border border-white/5 bg-white/[0.025] p-[3px]">
      {AVAILABLE_YEARS.map((y) => {
        const isActive = y === year;
        return (
          <button
            key={y}
            type="button"
            onClick={() => onChange(y)}
            aria-pressed={isActive}
            className={`rounded-[8px] px-3 py-[7px] text-[11px] font-semibold tracking-[0.5px] transition-all ${
              isActive
                ? "bg-[rgba(94,234,212,0.14)] text-[#5eead4]"
                : "text-[#94a8a0] hover:text-[#e8f5ef]"
            }`}
          >
            {y}
          </button>
        );
      })}
    </div>
  );
}

function QuarterTabs({
  active,
  year,
  onSelect,
}: {
  active: QuarterId;
  year: Year;
  onSelect: (id: QuarterId) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
      {quarters.map((q) => {
        const isActive = q.id === active;
        const status = quarterStatus(q, year);
        const progress = quarterProgress(q, year);
        const monthsAbbr = q.months
          .map((m) => monthLabel[m].slice(0, 3))
          .join(" · ");
        return (
          <button
            key={q.id}
            type="button"
            onClick={() => onSelect(q.id)}
            aria-pressed={isActive}
            className={`rounded-[11px] border px-4 py-3.5 text-left transition-all ${
              isActive
                ? "border-[rgba(94,234,212,0.3)] bg-[rgba(94,234,212,0.07)] shadow-[0_0_0_1px_rgba(94,234,212,0.15),0_8px_28px_-10px_rgba(94,234,212,0.5)]"
                : status === "past"
                  ? "border-transparent opacity-50 hover:opacity-80"
                  : "border-transparent hover:bg-white/[0.03]"
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className={`flex items-center gap-1.5 text-[11px] font-bold tracking-[1px] ${isActive ? "text-[#5eead4]" : "text-[#94a8a0]"}`}>
                {q.emoji} {q.id}
              </span>
              {status === "current" ? (
                <span className="rounded-[4px] bg-[#5eead4] px-[7px] py-[3px] text-[9px] font-bold tracking-[0.5px] text-[#042f2a]">
                  Maintenant
                </span>
              ) : (
                <span className="text-[9px] uppercase tracking-[0.5px] text-[#6b7c75]">
                  {status === "past" ? "Passé" : "À venir"}
                </span>
              )}
            </div>
            <div className="mb-0.5 text-[13px] font-semibold text-[#e8f5ef]">{q.theme}</div>
            <div className="mb-2.5 text-[10px] tracking-[0.3px] text-[#6b7c75]">{monthsAbbr}</div>
            <div className="h-[3px] overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  background: status === "past"
                    ? "rgba(148,168,160,0.4)"
                    : "linear-gradient(90deg, #5eead4 0%, #2dd4bf 100%)",
                }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function FocusBar({
  quarter,
  year,
  qUpcoming,
  qDone,
}: {
  quarter: Quarter;
  year: Year;
  qUpcoming: number;
  qDone: number;
}) {
  const status = quarterStatus(quarter, year);
  const progress = quarterProgress(quarter, year);
  return (
    <div className="relative mb-7 overflow-hidden rounded-2xl border border-[rgba(94,234,212,0.22)] px-7 py-5"
      style={{ background: "linear-gradient(135deg, rgba(94,234,212,0.12) 0%, rgba(94,234,212,0.03) 100%)" }}
    >
      {/* Left accent bar */}
      <div className="absolute inset-y-0 left-0 w-1 rounded-l-2xl" style={{ background: "linear-gradient(180deg, #5eead4 0%, #2dd4bf 100%)" }} />

      <div className="flex flex-wrap items-center gap-8">
        <div className="flex-1">
          <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-[5px] bg-[#5eead4] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[1.2px] text-[#042f2a]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#042f2a]" aria-hidden />
            {status === "current" ? "En cours" : status === "past" ? "Terminé" : "À venir"} · {quarter.id} {year}
          </div>
          <div className="mb-1.5 text-[20px] font-semibold text-[#e8f5ef]">{quarter.theme}</div>
          <div className="text-[13px] leading-relaxed text-[#c1d4cc]">{quarter.subtitle}</div>
        </div>

        <div className="flex gap-7 border-l border-[rgba(94,234,212,0.18)] pl-8">
          <div className="text-center">
            <div className="text-[30px] font-bold leading-none tabular-nums text-[#5eead4]">{qUpcoming}</div>
            <div className="mt-1.5 text-[10px] uppercase tracking-[1px] text-[#94a8a0]">À venir</div>
          </div>
          <div className="text-center">
            <div className="text-[30px] font-bold leading-none tabular-nums text-[#5eead4]">{qDone}</div>
            <div className="mt-1.5 text-[10px] uppercase tracking-[1px] text-[#94a8a0]">Faits</div>
          </div>
          <div className="text-center">
            <div className="text-[30px] font-bold leading-none tabular-nums text-[#5eead4]">
              {progress}<span className="text-[15px] text-[#94a8a0]">%</span>
            </div>
            <div className="mt-1.5 text-[10px] uppercase tracking-[1px] text-[#94a8a0]">Trimestre</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MonthColumn({
  month,
  year,
  events,
  nextEvent,
  onOpen,
}: {
  month: string;
  year: Year;
  events: PlanEvent[];
  nextEvent: PlanEvent | null;
  onOpen: (event: PlanEvent) => void;
}) {
  const status = monthStatus(month, year);
  const doneCount = events.filter((e) => e.done).length;
  const upcomingCount = events.filter((e) => !e.done).length;

  return (
    <div
      className={`rounded-[13px] border p-[18px] transition-colors ${
        status === "current"
          ? "border-[rgba(94,234,212,0.15)] bg-[rgba(94,234,212,0.035)]"
          : "border-white/[0.04] bg-white/[0.012]"
      }`}
    >
      <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2.5">
          <h4
            className={`text-[12px] font-bold tracking-[1.8px] uppercase ${
              status === "past" ? "text-[#6b7c75]" : "text-[#e8f5ef]"
            }`}
          >
            {monthLabel[month]}
          </h4>
          {status === "current" && (
            <span className="rounded-[4px] bg-[#5eead4] px-[7px] py-[3px] text-[9px] font-bold tracking-[0.5px] text-[#042f2a]">
              En cours
            </span>
          )}
        </div>
        <span className="text-[10px] tracking-[0.5px] text-[#6b7c75]">
          {events.length === 0
            ? "—"
            : doneCount > 0 && upcomingCount === 0
              ? `${doneCount} fait${doneCount > 1 ? "s" : ""}`
              : upcomingCount > 0
                ? `${upcomingCount} à venir`
                : "—"}
        </span>
      </div>

      {events.length === 0 ? (
        <p className="py-5 text-center text-[11px] italic text-[#6b7c75]">
          Pas d&apos;événement programmé.
        </p>
      ) : (
        <ul className="space-y-0">
          {events.map((e, i) => (
            <EventRow
              key={i}
              event={e}
              isNext={e === nextEvent}
              onOpen={() => onOpen(e)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function EventRow({
  event,
  isNext,
  onOpen,
}: {
  event: PlanEvent;
  isNext: boolean;
  onOpen: () => void;
}) {
  const cfg = eventTypeConfig[event.type];
  const parsed = event.date ? parseDateLabel(event.date) : null;

  return (
    <li className="relative">
      {isNext && (
        <span className="absolute -top-2 right-2.5 z-10 rounded-[4px] bg-[#5eead4] px-[7px] py-[3px] text-[8px] font-bold tracking-[0.5px] text-[#042f2a]">
          Prochain
        </span>
      )}
      <button
        type="button"
        onClick={onOpen}
        className={`group flex w-full gap-2.5 rounded-[10px] border p-3 text-left transition-all ${
          event.done
            ? "border-transparent opacity-[0.38] hover:opacity-70"
            : isNext
              ? "border-[rgba(94,234,212,0.18)] bg-[rgba(94,234,212,0.05)]"
              : "border-transparent hover:border-white/5 hover:bg-white/[0.025]"
        } mb-2.5`}
      >
        {/* Date block */}
        <div className="w-10 shrink-0 pt-0.5 text-center">
          {parsed ? (
            <>
              <div className={`text-[19px] font-bold leading-none tabular-nums ${event.done ? "text-[#6b7c75] line-through" : "text-[#e8f5ef]"}`}>
                {parsed.day}
              </div>
              <div className="mt-[3px] text-[9px] uppercase tracking-[0.8px] text-[#6b7c75]">
                {parsed.mo}
              </div>
            </>
          ) : (
            <div className="text-[13px] text-[#6b7c75]">—</div>
          )}
        </div>

        {/* Body */}
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className={`rounded-[4px] px-[7px] py-[3px] text-[9px] font-bold tracking-[0.5px] ${cfg.pillClass}`}>
              {cfg.label.toUpperCase()}
            </span>
            {event.done && (
              <span
                className="ml-auto flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full bg-[rgba(94,234,212,0.2)] text-[9px] text-[#5eead4]"
                aria-hidden
              >
                ✓
              </span>
            )}
          </div>
          <div className={`mb-1.5 text-[12.5px] font-medium leading-snug ${event.done ? "text-[#6b7c75] line-through" : "text-[#e8f5ef]"}`}>
            {event.title}
          </div>
          {event.scope && (
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#6b7c75]">
              <ScopeInlineSummary scope={event.scope} />
            </div>
          )}
        </div>
      </button>
    </li>
  );
}

type KitStep = "before" | "dday" | "after";

const atelierKitTiles: { id: KitStep; emoji: string; label: string; sub: string }[] = [
  { id: "before", emoji: "📩", label: "Invitation J-7", sub: "Emails à envoyer avant l'atelier" },
  { id: "dday",   emoji: "🔔", label: "Relance J-1",    sub: "Emails de rappel aux participants" },
  { id: "after",  emoji: "✅", label: "Post-atelier",   sub: "Emails de suivi et ressources" },
];

function WorkshopDetail({ workshopId }: { workshopId: string }) {
  const [openKit, setOpenKit] = useState<KitStep | null>(null);
  const workshop = workshops.find((w) => w.id === workshopId);
  if (!workshop) return null;

  const kitItems = openKit
    ? lancementKits.filter((k) => k.step === openKit && k.language === "FR").slice(0, 6)
    : [];

  return (
    <>
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal-bright">
          Objectifs
        </h3>
        <ul className="space-y-1.5">
          {workshop.objectives.map((obj, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-brand-cream">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-accent" aria-hidden />
              {obj}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal-bright">
          Programme
        </h3>
        <ol className="space-y-2">
          {workshop.programme.map((step, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-dark text-[10px] font-bold text-brand-accent ring-1 ring-brand-accent/30">
                {i + 1}
              </span>
              <span className="text-sm leading-snug text-brand-cream">{step.title}</span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
          Kit de communication
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {atelierKitTiles.map((tile) => {
            const isOpen = openKit === tile.id;
            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => setOpenKit(isOpen ? null : tile.id)}
                aria-expanded={isOpen}
                className={`flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-all hover:-translate-y-px ${
                  isOpen
                    ? "border-brand-teal-bright/40 bg-brand-teal-bright/[0.08] shadow-[0_0_0_1px_rgba(94,234,212,0.15)]"
                    : "border-brand-border-dark bg-brand-dark/40 hover:border-brand-teal-bright/25 hover:bg-brand-dark/60"
                }`}
              >
                <span className="text-base" aria-hidden>{tile.emoji}</span>
                <span className={`text-[11px] font-medium ${isOpen ? "text-brand-teal-bright" : "text-brand-cream"}`}>
                  {tile.label}
                </span>
                <span className="text-[10px] leading-snug text-brand-muted-on-dark">
                  {tile.sub}
                </span>
                <span className={`mt-0.5 text-[10px] font-medium transition-colors ${isOpen ? "text-brand-teal-bright" : "text-brand-muted-on-dark"}`}>
                  {isOpen ? "Fermer ↑" : "Voir →"}
                </span>
              </button>
            );
          })}
        </div>

        {openKit && kitItems.length > 0 && (
          <div className="mt-3 rounded-xl border border-brand-border-dark bg-brand-dark/20 p-3">
            <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-muted-on-dark">
              {atelierKitTiles.find((t) => t.id === openKit)?.label} — modèles disponibles
            </p>
            <ul className="space-y-1.5">
              {kitItems.map((k) => (
                <li
                  key={k.id}
                  className="flex items-center gap-2.5 rounded-lg border border-brand-border-dark bg-brand-surface/60 px-3 py-2"
                >
                  <span className="shrink-0 text-sm" aria-hidden>📧</span>
                  <span className="text-[12px] text-brand-cream">{k.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </>
  );
}

function KitCatalogueSection({ kitRef }: { kitRef: KitRef }) {
  const { category, months, topics } = kitRef;

  if (category === "lancement") {
    const stepLabels: Record<string, string> = {
      before: "Avant l'événement",
      dday: "Jour J",
      after: "Après l'événement",
    };
    const frKits = lancementKits.filter((k) => k.language === "FR");
    return (
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
          Contenu du kit
        </h3>
        <div className="space-y-3">
          {(["before", "dday", "after"] as const).map((step) => {
            const stepKits = frKits.filter((k) => k.step === step).slice(0, 3);
            if (stepKits.length === 0) return null;
            return (
              <div key={step}>
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-muted-on-dark">
                  {stepLabels[step]}
                </div>
                <ul className="space-y-1">
                  {stepKits.map((k) => (
                    <li
                      key={k.id}
                      className="flex items-center gap-2 rounded-lg bg-brand-dark/30 px-2.5 py-2 text-[12px] text-brand-cream"
                    >
                      <span aria-hidden className="shrink-0">📧</span>
                      {k.title}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  if (category === "animation" && months && months.length > 0) {
    const items = animationItems.filter((a) => months.includes(a.month));
    if (items.length === 0) return null;
    return (
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
          Contenus d&apos;animation
        </h3>
        <ul className="space-y-2">
          {items.slice(0, 6).map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-2.5 rounded-xl border border-brand-border-dark bg-brand-dark/30 px-3 py-2.5"
            >
              <span className="mt-0.5 shrink-0 rounded-md bg-brand-surface px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-muted-on-dark">
                {item.type}
              </span>
              <span className="text-[12px] leading-snug text-brand-cream">{item.title}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (category === "topics" && topics && topics.length > 0) {
    const kits = emailTopicKits
      .filter((k) => k.language === "FR" && topics.includes(k.topic))
      .slice(0, 6);
    if (kits.length === 0) return null;
    return (
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
          Emails thématiques
        </h3>
        <ul className="space-y-1.5">
          {kits.map((k) => (
            <li
              key={k.id}
              className="flex items-center gap-2 rounded-lg bg-brand-dark/30 px-2.5 py-2 text-[12px] text-brand-cream"
            >
              <span aria-hidden className="shrink-0">📧</span>
              {k.title}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return null;
}

function ScopeDetail({ scope }: { scope: EventScope }) {
  const hasAudience =
    scope.allCompany || (scope.audiences && scope.audiences.length > 0);
  const hasDepartments = scope.departments && scope.departments.length > 0;
  const hasCountries = scope.countries && scope.countries.length > 0;
  if (!hasAudience && !hasDepartments && !hasCountries) return null;
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
        Cible de l&apos;action
      </h3>
      <div className="space-y-2.5 rounded-xl border border-brand-border-dark bg-brand-dark/30 p-3.5">
        {hasAudience && (
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-muted-on-dark">
              🎯 Cible
            </span>
            <div className="flex flex-wrap gap-1.5">
              {scope.allCompany ? (
                <span className="rounded-full bg-brand-cream/10 px-2.5 py-0.5 text-[11px] font-medium text-brand-cream">
                  🧑‍🤝‍🧑 Toute l&apos;entreprise
                </span>
              ) : (
                scope.audiences?.map((a) => {
                  const c = audienceConfig[a];
                  return (
                    <span
                      key={a}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${c.pillClass}`}
                    >
                      {c.emoji} {c.label}
                    </span>
                  );
                })
              )}
            </div>
          </div>
        )}
        {hasDepartments && (
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-muted-on-dark">
              🏢 Département(s)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {scope.departments?.map((d) => (
                <span
                  key={d}
                  className="rounded-full bg-brand-cream/10 px-2.5 py-0.5 text-[11px] font-medium text-brand-cream"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}
        {hasCountries && (
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-muted-on-dark">
              🌍 Pays
            </span>
            <div className="flex flex-wrap gap-1.5">
              {scope.countries?.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-cream/10 px-2.5 py-0.5 text-[11px] font-medium text-brand-cream"
                >
                  <span aria-hidden>{countryFlag[c] ?? "🌐"}</span> {c}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ScopeInlineSummary({ scope }: { scope: EventScope }) {
  const audienceLabel = scope.allCompany
    ? "Toute l'entreprise"
    : scope.audiences && scope.audiences.length > 0
      ? scope.audiences.length === 1
        ? audienceConfig[scope.audiences[0]].label
        : `${scope.audiences.length} cibles`
      : null;
  const countryFlags = (scope.countries ?? [])
    .map((c) => countryFlag[c] ?? c)
    .slice(0, 3)
    .join(" ");
  return (
    <>
      {audienceLabel && <span>🎯 {audienceLabel}</span>}
      {scope.departments && scope.departments.length > 0 && (
        <>
          <span aria-hidden>·</span>
          <span>🏢 {scope.departments.join(", ")}</span>
        </>
      )}
      {countryFlags && (
        <>
          {(audienceLabel || (scope.departments && scope.departments.length > 0)) && (
            <span aria-hidden>·</span>
          )}
          <span>{countryFlags}</span>
        </>
      )}
    </>
  );
}

function EventModal({
  event,
  month,
  year,
  onClose,
}: {
  event: PlanEvent;
  month: string;
  year: Year;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const cfg = eventTypeConfig[event.type];
  const description = event.description ?? defaultDescription(event.type);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-6 backdrop-blur-sm sm:p-10"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-modal-title"
    >
      <div
        className="relative w-full max-w-xl rounded-2xl border border-brand-border-dark bg-brand-surface p-6 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-brand-muted-on-dark transition-colors hover:bg-brand-border-dark hover:text-brand-cream"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M6 6l12 12M6 18 18 6" />
          </svg>
        </button>

        <div className="flex items-start gap-3 pr-10">
          <span
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl ${cfg.pillClass}`}
            aria-hidden
          >
            {cfg.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${cfg.pillClass}`}
              >
                {cfg.label}
              </span>
              {event.type === "urgence" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-salmon/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-salmon">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-salmon opacity-70" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-salmon" />
                  </span>
                  En cours
                </span>
              ) : event.done ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-green-bright/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-green-bright">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M5 12 10 17 19 7" />
                  </svg>
                  Fait
                </span>
              ) : (
                <span className="rounded-full bg-brand-upcoming/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-upcoming">
                  À venir
                </span>
              )}
              <span className="text-[11px] uppercase tracking-wider text-brand-muted-on-dark">
                {event.date ?? monthLabel[month]}
                {event.date && ` · ${monthLabel[month]} ${year}`}
              </span>
            </div>
            <h2
              id="event-modal-title"
              className="mt-3 text-xl font-medium leading-snug tracking-tight text-brand-cream"
            >
              {event.title}
            </h2>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal-bright">
              À propos
            </h3>
            <p className="text-sm leading-relaxed text-brand-muted-on-dark">
              {description}
            </p>
          </section>

          {event.type === "atelier" && workshopMap[event.title] && (
            <WorkshopDetail workshopId={workshopMap[event.title]} />
          )}
          {event.type === "kit" && kitMap[event.title] && (
            <KitCatalogueSection kitRef={kitMap[event.title]} />
          )}

          {event.scope && <ScopeDetail scope={event.scope} />}

          {event.details && event.details.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal-bright">
                Détails
              </h3>
              <ul className="space-y-1.5 text-sm text-brand-cream">
                {event.details.map((d, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span
                      className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green-bright"
                      aria-hidden
                    />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <p className="mt-6 border-t border-brand-border-dark pt-4 text-[11px] text-brand-muted-on-dark">
          Vue lecture seule — votre planning est piloté par votre CSM. Pour
          ajuster ou ajouter une action, contactez votre Customer Success
          Manager.
        </p>
      </div>
    </div>
  );
}

const docTypeStyle: Record<string, string> = {
  Stratégie: "bg-brand-accent/15 text-brand-accent",
  QBR: "bg-brand-salmon/15 text-brand-salmon",
  Bilan: "bg-brand-green-bright/15 text-brand-green-bright",
  Guide: "bg-brand-cream/10 text-brand-cream",
};

function DocumentCard({ doc }: { doc: CsmDocument }) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-brand-border-dark bg-brand-surface p-5 transition-colors hover:border-brand-green-bright/40">
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#2d6b62] to-[#163834] text-2xl">
          📄
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] ${
                docTypeStyle[doc.type] ?? "bg-brand-cream/10 text-brand-cream"
              }`}
            >
              {doc.type}
            </span>
            <span className="text-[10px] text-brand-muted-on-dark">
              · {doc.size}
            </span>
          </div>
          <h3 className="text-sm font-medium leading-snug text-brand-cream">
            {doc.title}
          </h3>
          <p className="mt-1 text-[11px] text-brand-muted-on-dark">
            {doc.author} · {doc.date}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          title="Bientôt disponible"
          className="inline-flex flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-full border border-brand-border-dark px-3 py-2 text-[12px] font-medium text-brand-cream opacity-70"
        >
          <EyeIcon /> Voir
        </button>
        <button
          type="button"
          title="Bientôt disponible"
          className="inline-flex flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-full bg-brand-green-bright px-3 py-2 text-[12px] font-semibold text-brand-dark opacity-80"
        >
          <DownloadIcon /> Télécharger
        </button>
      </div>
    </article>
  );
}

function StatPill({
  value,
  label,
  accent,
}: {
  value: number | string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-[110px] rounded-2xl border border-brand-border-dark bg-brand-surface px-4 py-3">
      <div
        className={`text-2xl font-medium leading-none ${accent ? "text-brand-green-bright" : "text-brand-cream"}`}
      >
        {value}
      </div>
      <div className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-brand-muted-on-dark">
        {label}
      </div>
    </div>
  );
}

function EyeIcon(): ReactNode {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function DownloadIcon(): ReactNode {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}
