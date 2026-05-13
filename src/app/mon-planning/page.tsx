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
    pillClass: "bg-brand-accent/15 text-brand-accent",
  },
  kit: {
    label: "Kit comm",
    emoji: "📢",
    pillClass: "bg-brand-green-bright/15 text-brand-green-bright",
  },
  point: {
    label: "Point CSM",
    emoji: "📞",
    pillClass: "bg-brand-cream/10 text-brand-cream",
  },
  qbr: {
    label: "QBR",
    emoji: "📊",
    pillClass: "bg-brand-salmon/15 text-brand-salmon",
  },
  onboarding: {
    label: "Onboarding",
    emoji: "🚀",
    pillClass: "bg-brand-upcoming/15 text-brand-upcoming",
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

  return (
    <>
      <div className="relative flex h-screen flex-col px-10 py-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 right-0 h-[460px] w-[460px] translate-x-20 rounded-full bg-brand-teal-bright/10 blur-3xl"
        />
        <div className="relative z-10 mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col">
          <header className="mb-5 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-teal-bright">
                Pilotage
              </p>
              <h1 className="mt-2 text-3xl font-medium tracking-tight text-brand-cream">
                Suivi projet
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-brand-muted-on-dark">
                Le plan annuel co-construit avec votre Customer Success
                Manager. Naviguez de trimestre en trimestre.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2.5">
              <div className="flex gap-3">
                <StatPill
                  value={yearTotalEvents}
                  label={`Événements ${activeYear}`}
                  accent
                />
                <StatPill value={remainingEvents} label="À venir" />
              </div>
              <a
                href="https://docs.google.com/spreadsheets/d/teale-listing-employes-template/edit"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-brand-teal-bright/40 bg-brand-teal-bright/10 px-4 py-2 text-[12px] font-medium text-brand-teal-bright transition-colors hover:bg-brand-teal-bright/20"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                  <path d="M9 14l2 2 4-4" />
                </svg>
                Mettre à jour mon listing employés
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-70"
                  aria-hidden
                >
                  <path d="M15 3h6v6" />
                  <path d="M10 14 21 3" />
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                </svg>
              </a>
            </div>
          </header>

          <section className="flex min-h-0 flex-1 flex-col">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-medium text-brand-cream">
                <span aria-hidden>📅</span> Planning annuel
              </h2>
              <YearSwitcher year={activeYear} onChange={switchYear} />
            </div>

            <QuarterTabs
              active={activeQuarterId}
              year={activeYear}
              onSelect={setActiveQuarterId}
            />

            <QuarterBanner
              quarter={activeQuarter}
              year={activeYear}
              yearEvents={yearEvents}
            />

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-3">
              {activeQuarter.months.map((m) => (
                <MonthColumn
                  key={m}
                  month={m}
                  year={activeYear}
                  events={yearEvents[m] ?? []}
                  onOpen={(event) => setActiveEvent({ event, month: m })}
                />
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="relative border-t border-brand-border-dark px-10 pb-12 pt-10">
        <div className="mx-auto max-w-6xl">
          <header className="mb-5">
            <h2 className="flex items-center gap-3 text-2xl font-medium tracking-tight text-brand-cream">
              <span aria-hidden>📂</span>
              Documents partagés par votre CSM
            </h2>
            <p className="mt-1.5 ml-1 text-sm text-brand-muted-on-dark">
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
    <div className="inline-flex items-center gap-1 rounded-full border border-brand-border-dark bg-brand-surface p-1">
      {AVAILABLE_YEARS.map((y) => {
        const isActive = y === year;
        const isPast = y < TODAY_YEAR;
        const isFuture = y > TODAY_YEAR;
        return (
          <button
            key={y}
            type="button"
            onClick={() => onChange(y)}
            aria-pressed={isActive}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
              isActive
                ? "bg-brand-teal-bright/20 text-brand-teal-bright"
                : "text-brand-muted-on-dark hover:text-brand-cream"
            }`}
          >
            {y}
            {y === TODAY_YEAR && (
              <span
                className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-brand-teal-bright" : "bg-brand-green-bright"}`}
                aria-hidden
              />
            )}
            {!isActive && isPast && (
              <span className="text-[9px] uppercase tracking-wider opacity-60">
                Archive
              </span>
            )}
            {!isActive && isFuture && (
              <span className="text-[9px] uppercase tracking-wider opacity-60">
                À venir
              </span>
            )}
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
    <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
      {quarters.map((q) => {
        const isActive = q.id === active;
        const status = quarterStatus(q, year);
        const monthsAbbr = q.months
          .map((m) => monthLabel[m].slice(0, 3))
          .join(" · ");
        return (
          <button
            key={q.id}
            type="button"
            onClick={() => onSelect(q.id)}
            aria-pressed={isActive}
            className={`group relative overflow-hidden rounded-2xl border px-4 py-3 text-left transition-all ${
              isActive
                ? `border-transparent bg-gradient-to-br ${q.gradient} text-white shadow-lg ring-2 ring-brand-green-bright/30`
                : "border-brand-border-dark bg-brand-surface hover:border-brand-green-bright/40"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={`text-[10px] font-bold uppercase tracking-[0.14em] ${
                  isActive ? "text-white/90" : "text-brand-muted-on-dark"
                }`}
              >
                <span className="mr-1">{q.emoji}</span> {q.id}
              </span>
              {status === "current" && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-brand-green-bright/20 text-brand-green-bright"
                  }`}
                >
                  <span className="relative flex h-1 w-1">
                    <span
                      className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${
                        isActive ? "bg-white" : "bg-brand-green-bright"
                      }`}
                    />
                    <span
                      className={`relative inline-flex h-1 w-1 rounded-full ${
                        isActive ? "bg-white" : "bg-brand-green-bright"
                      }`}
                    />
                  </span>
                  Maintenant
                </span>
              )}
              {status === "past" && (
                <span
                  className={`text-[9px] font-semibold uppercase tracking-[0.12em] ${
                    isActive ? "text-white/70" : "text-brand-muted-on-dark"
                  }`}
                >
                  Passé
                </span>
              )}
              {status === "upcoming" && (
                <span
                  className={`text-[9px] font-semibold uppercase tracking-[0.12em] ${
                    isActive ? "text-white/70" : "text-brand-muted-on-dark"
                  }`}
                >
                  À venir
                </span>
              )}
            </div>
            <div
              className={`mt-1.5 text-[9px] font-bold uppercase tracking-[0.16em] ${
                isActive ? "text-white/70" : "text-brand-muted-on-dark"
              }`}
            >
              Objectif
            </div>
            <div
              className={`truncate text-sm font-medium ${
                isActive ? "text-white" : "text-brand-cream"
              }`}
            >
              {q.theme}
            </div>
            <div
              className={`mt-1 text-[11px] ${
                isActive ? "text-white/80" : "text-brand-muted-on-dark"
              }`}
            >
              {monthsAbbr}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function QuarterBanner({
  quarter,
  year,
  yearEvents,
}: {
  quarter: Quarter;
  year: Year;
  yearEvents: Record<string, PlanEvent[]>;
}) {
  const totalQ = quarter.months.reduce(
    (n, m) => n + (yearEvents[m]?.length ?? 0),
    0
  );
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-border-dark bg-brand-surface/50 px-4 py-3">
      <p className="max-w-3xl text-[13px] leading-relaxed text-brand-muted-on-dark">
        <span className="font-semibold uppercase tracking-[0.14em] text-brand-teal-bright">
          Objectif {quarter.id} {year} :
        </span>{" "}
        <span className="text-brand-cream">{quarter.subtitle}</span>
      </p>
      <span className="shrink-0 text-[11px] uppercase tracking-wider text-brand-muted-on-dark">
        {totalQ} événement{totalQ > 1 ? "s" : ""} ce trimestre
      </span>
    </div>
  );
}

function MonthColumn({
  month,
  year,
  events,
  onOpen,
}: {
  month: string;
  year: Year;
  events: PlanEvent[];
  onOpen: (event: PlanEvent) => void;
}) {
  const status = monthStatus(month, year);
  const monthEvents = events;

  let frameClass =
    "flex min-h-0 flex-col rounded-2xl border bg-brand-surface p-4 transition-colors";
  if (status === "current") {
    frameClass +=
      " border-brand-green-bright/50 shadow-[0_0_0_2px_rgba(168,232,149,0.15)]";
  } else if (status === "past") {
    frameClass += " border-brand-border-dark opacity-70";
  } else {
    frameClass += " border-brand-border-dark";
  }

  return (
    <div className={frameClass}>
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <h4
          className={`text-sm font-semibold uppercase tracking-[0.12em] ${
            status === "current"
              ? "text-brand-green-bright"
              : "text-brand-cream"
          }`}
        >
          {monthLabel[month]}
          {status === "current" && (
            <span className="ml-2 inline-flex items-center gap-1 text-[9px] font-bold normal-case tracking-normal text-brand-green-bright">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-green-bright" />
              En cours
            </span>
          )}
        </h4>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            monthEvents.length === 0
              ? "bg-white/[0.04] text-brand-muted-on-dark"
              : status === "current"
                ? "bg-brand-green-bright/20 text-brand-green-bright"
                : "bg-white/[0.06] text-brand-cream"
          }`}
        >
          {monthEvents.length === 0
            ? "—"
            : `${monthEvents.length} évén.`}
        </span>
      </header>
      {monthEvents.length === 0 ? (
        <p className="text-[12px] italic text-brand-muted-on-dark/70">
          Pas d&apos;événement programmé.
        </p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
          {monthEvents.map((e, i) => (
            <EventRow key={i} event={e} onOpen={() => onOpen(e)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function EventRow({
  event,
  onOpen,
}: {
  event: PlanEvent;
  onOpen: () => void;
}) {
  const cfg = eventTypeConfig[event.type];
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full items-start gap-2.5 rounded-lg p-1.5 text-left -mx-1.5 transition-colors hover:bg-white/[0.04]"
      >
        <span
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-base ${cfg.pillClass}`}
          aria-hidden
        >
          {cfg.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${cfg.pillClass}`}
            >
              {cfg.label}
            </span>
            {event.date && (
              <span className="text-[10px] uppercase tracking-wider text-brand-muted-on-dark">
                {event.date}
              </span>
            )}
          </div>
          <div
            className={`mt-1 text-[13px] leading-snug ${
              event.done
                ? "text-brand-muted-on-dark line-through decoration-brand-muted-on-dark/40"
                : "text-brand-cream"
            }`}
          >
            {event.title}
          </div>
          {event.scope && (
            <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-brand-muted-on-dark">
              <ScopeInlineSummary scope={event.scope} />
            </div>
          )}
        </div>
        {event.done ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-1 shrink-0 text-brand-green-bright"
            aria-hidden
          >
            <path d="M5 12 10 17 19 7" />
          </svg>
        ) : (
          <span
            className="mt-1 shrink-0 text-brand-muted-on-dark opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden
          >
            →
          </span>
        )}
      </button>
    </li>
  );
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
