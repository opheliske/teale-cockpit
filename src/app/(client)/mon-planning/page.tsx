"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { planStore, type StoredPlanState, type StoredPlanItemType } from "@/lib/plan-store";
import { commentsStore, type PlanComment } from "@/lib/comments-store";
import { targetsStore, type TargetLabel } from "@/lib/targets-store";
import { docsStore, type StoredDocument } from "@/lib/docs-store";
import { openClientFile } from "@/lib/storage";
import type { PlanItemFile } from "@/lib/clients-data";
import {
  getUrgencies,
  watchUrgencies,
  modalitiesToList,
  parseEventDate,
  urgencyTypeEmoji,
  urgencyTypeLabels,
  urgencyModeLabels,
  type Urgency,
} from "@/lib/urgencies";
import { workshops } from "@/app/(client)/catalogue-ateliers/data";
import { lancementKits, animationItems, emailTopicKits } from "@/app/(client)/kits-communication/data";
import { useActiveClient } from "@/lib/client-context";
import { buildPlanQuarters } from "@/lib/plan-quarters";
import { csmClientsStore } from "@/lib/csm-clients-store";

// Today, computed once at module load — derives the month status (past /
// current / upcoming) and the default active year of the planning view.
const TODAY_DATE = new Date();
const TODAY_YEAR = TODAY_DATE.getFullYear();
const TODAY_MONTH = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
][TODAY_DATE.getMonth()];
const AVAILABLE_YEARS = [TODAY_YEAR - 1, TODAY_YEAR, TODAY_YEAR + 1] as const;
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
  theme: string;
  subtitle: string;
  months: string[]; // English names, for yearEvents lookup
  gradient: string;
  emoji: string;
};

const QUARTER_GRADIENTS: Record<QuarterId, { gradient: string; emoji: string }> = {
  Q1: { gradient: "from-[#4d6961] to-[#c2bbab]", emoji: "🌱" },
  Q2: { gradient: "from-[#2d6b62] to-[#4cbfa6]", emoji: "📈" },
  Q3: { gradient: "from-[#2a7d4a] to-[#a8e895]", emoji: "📊" },
  Q4: { gradient: "from-[#8fb6c7] to-[#2d6b62]", emoji: "🔄" },
};

function quarterStatus(q: Quarter): QuarterStatus {
  // Uses the pre-computed status on each PlanQuarterMonth — resolved at render time
  // from planQuarters which is derived from contractStart
  const statuses = q.months.map((m) => monthStatus(m, new Date().getFullYear()));
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
  time?: string;
  done?: boolean;
  description?: string;
  details?: string[];
  scope?: EventScope;
  targets?: string[];
  impact?: string;
  itemId?: number;
  threadId?: string;
  // Mirror what the CSM sees in their plan item modal so the client has
  // the same context when opening an action.
  responsable?: string;
  detail?: string;
  files?: PlanItemFile[];
  objectives?: string[];
  themeId?: string;
  cancelled?: boolean;
  // Deck preparation flag — QBR / atelier. Set by the CSM in the QBR &
  // Ateliers page; surfaced to the client as a small "Deck préparé"
  // indicator so they know the CSM is ready.
  deckCreated?: boolean;
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
  January: [],
  February: [],
  March: [],
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

const events2025: Record<string, PlanEvent[]> = {
  January: [],
  February: [],
  March: [],
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

const events2027: Record<string, PlanEvent[]> = {
  January: [],
  February: [],
  March: [],
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
  "Atelier « Comprendre Teale »":          "premiers-pas-sante-mentale",
  "Atelier « Gestion du stress »":          "gerer-son-stress",
  "Atelier « Charge mentale »":             "charge-mentale",
  "Webinaire managers & santé mentale":     "epuisement-professionnel",
  "Atelier « Communication CNV »":          "cerveau-emotions-reactions",
  "Atelier « Leadership bienveillant »":    "assertivite",
  "Atelier « Manager coach »":              "feedback",
  "Atelier « Gestion des émotions »":       "cerveau-emotions-reactions",
  "Atelier au choix — Résilience":          "comprendre-resilience",
};

type KitRef = {
  category: "lancement" | "animation" | "topics";
  months?: string[];
  topics?: string[];
};

const kitMap: Record<string, KitRef> = {
  "Kit lancement plateforme Joy":            { category: "lancement" },
  "Kit bien-être au travail":                { category: "topics", topics: ["PHYSICAL WELL-BEING AND STRESS"] },
  "Kit retour vacances & résilience":        { category: "animation", months: ["December"] },
  "Kit prévention burnout":                  { category: "topics", topics: ["STRESS MANAGEMENT"] },
  "Kit bilan annuel collaborateurs":         { category: "lancement" },
};

type CsmDocument = StoredDocument;

const frMonthAbbr: Record<string, string> = {
  janv: "JAN", fév: "FÉV", mars: "MAR", avr: "AVR",
  mai: "MAI", juin: "JUI", juil: "JUL", août: "AOÛ",
  sept: "SEP", oct: "OCT", nov: "NOV", déc: "DÉC",
};

// ── Plan store helpers ──────────────────────────────────────────────────────


const PLAN_EVENT_TYPE_MAP: Record<StoredPlanItemType, EventType> = {
  atelier: "atelier", kit: "kit", csm: "point", qbr: "qbr", custom: "atelier",
};

const FR_MONTH_EN: Record<string, string> = {
  janv: "January", jan: "January", janvier: "January",
  fév: "February", fev: "February", février: "February",
  mars: "March",
  avr: "April", avril: "April",
  mai: "May",
  juin: "June",
  juil: "July", juillet: "July",
  août: "August", aout: "August",
  sept: "September", septembre: "September",
  oct: "October", octobre: "October",
  nov: "November", novembre: "November",
  déc: "December", dec: "December", décembre: "December",
};

function metaToMonthYear(meta: string): { month: string; year: number } | null {
  const m = meta.match(/(\d+)\s+([a-záàéèêëïîôùûüç]+)\.?\s+(\d{4})/i);
  if (!m) return null;
  const en = FR_MONTH_EN[m[2].toLowerCase()];
  if (!en) return null;
  return { month: en, year: parseInt(m[3]) };
}

function metaToDateStr(meta: string): string | undefined {
  const m = meta.match(/(\d+)\s+([a-záàéèêëïîôùûüç]+\.?)/i);
  return m ? `${m[1]} ${m[2].endsWith(".") ? m[2] : m[2] + "."}` : undefined;
}

function metaToTimeStr(meta: string): string | undefined {
  const m = meta.match(/\b(\d{1,2}:\d{2})\b/);
  return m ? m[1] : undefined;
}

// ────────────────────────────────────────────────────────────────────────────

function parseDateLabel(dateStr: string): { day: string; mo: string } | null {
  const match = dateStr.match(/^(\d+)/);
  if (!match) return null;
  const day = match[1].padStart(2, "0");
  const rest = dateStr.slice(match[0].length).trim().replace(".", "").toLowerCase().split(" ")[0] ?? "";
  const mo = frMonthAbbr[rest] ?? rest.slice(0, 3).toUpperCase();
  return { day, mo };
}

function quarterProgress(q: Quarter): number {
  const statuses = q.months.map((m) => monthStatus(m, new Date().getFullYear()));
  if (statuses.every((s) => s === "past")) return 100;
  if (statuses.every((s) => s === "upcoming")) return 0;
  const past = statuses.filter((s) => s === "past").length;
  return Math.round(((past + 0.5) / q.months.length) * 100);
}

function defaultQuarter(qs: Quarter[]): QuarterId {
  const cur = qs.find((q) => quarterStatus(q) === "current");
  if (cur) return cur.id;
  const upcoming = qs.find((q) => quarterStatus(q) === "upcoming");
  if (upcoming) return upcoming.id;
  return "Q4";
}

export default function MonPlanningPage() {
  // Active client resolved by ClientGuard (no module-load race).
  const { clientId: CLIENT_ID } = useActiveClient();
  const [contractStart, setContractStart] = useState<string>(
    () => csmClientsStore.get(CLIENT_ID)?.contractStart ?? ""
  );

  useEffect(() => {
    return csmClientsStore.subscribe(() => {
      setContractStart(csmClientsStore.get(CLIENT_ID)?.contractStart ?? "");
    });
  }, [CLIENT_ID]);

  const planQuarters = useMemo(() => buildPlanQuarters(contractStart), [contractStart]);

  const quarters: Quarter[] = useMemo(
    () =>
      planQuarters.map((pq) => ({
        id: pq.id,
        theme: "",
        subtitle: "",
        months: pq.months.map((m) => m.en),
        ...QUARTER_GRADIENTS[pq.id],
      })),
    [planQuarters],
  );

  const quarterFirstMonth = useMemo(
    () =>
      Object.fromEntries(planQuarters.map((pq) => [pq.id, pq.months[0].en])) as Record<string, string>,
    [planQuarters],
  );

  const [activeYear, setActiveYear] = useState<Year>(TODAY_YEAR);
  const [activeQuarterId, setActiveQuarterId] = useState<QuarterId>(
    () => defaultQuarter(planQuarters.map((pq) => ({
      id: pq.id, theme: "", subtitle: "", months: pq.months.map((m) => m.en), ...QUARTER_GRADIENTS[pq.id],
    })))
  );
  const [activeEvent, setActiveEvent] = useState<{
    event: PlanEvent;
    month: string;
  } | null>(null);
  const [urgencies, setUrgencies] = useState<Urgency[]>([]);
  const [storeState, setStoreState] = useState<StoredPlanState | null>(() => planStore.getState());
  const [storeDocs, setStoreDocs] = useState<CsmDocument[]>(() => docsStore.getDocs());
  const [clientLabels, setClientLabels] = useState<TargetLabel[]>(() => targetsStore.getLabels(CLIENT_ID));
  const [targetFilter, setTargetFilter] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      void getUrgencies().then((u) => {
        if (active) setUrgencies(u);
      });
    };
    refresh();
    const unwatch = watchUrgencies(refresh);
    return () => {
      active = false;
      unwatch();
    };
  }, []);

  useEffect(() => {
    planStore.load(CLIENT_ID);
    return planStore.subscribe(() => setStoreState(planStore.getState()));
  }, [CLIENT_ID]);

  useEffect(() => {
    docsStore.load(CLIENT_ID);
    return docsStore.subscribe(() => setStoreDocs(docsStore.getDocs()));
  }, [CLIENT_ID]);

  useEffect(() => {
    targetsStore.load(CLIENT_ID);
    return targetsStore.subscribe(() => setClientLabels(targetsStore.getLabels(CLIENT_ID)));
  }, [CLIENT_ID]);

  // Override quarter themes from CSM plan store when available
  const displayQuarters = useMemo<Quarter[]>(() => {
    if (!storeState) return quarters;
    return quarters.map((q) => ({
      ...q,
      theme: storeState.themes[q.id] || q.theme,
      subtitle: storeState.themes[q.id] ? "" : q.subtitle,
    }));
  }, [storeState, quarters]);

  const activeQuarter =
    displayQuarters.find((q) => q.id === activeQuarterId) ?? displayQuarters[0];

  const yearEvents = useMemo(() => {
    const merged: Record<string, PlanEvent[]> = {};

    // When the CSM has set up a plan, use it as the source of truth for 2026
    if (storeState && activeYear === TODAY_YEAR) {
      for (const month of allMonths) merged[month] = [];
      for (const item of storeState.items) {
        // Explicit month wins (set by the CSM plan editor). Otherwise fall
        // back to parsing the meta date, then to the quarter's first month.
        const parsed = metaToMonthYear(item.meta);
        const month =
          typeof item.month === "number" && allMonths[item.month]
            ? allMonths[item.month]
            : parsed && parsed.year === activeYear
              ? parsed.month
              : quarterFirstMonth[item.quarter];
        if (!allMonths.includes(month)) continue;
        merged[month].push({
          type: PLAN_EVENT_TYPE_MAP[item.type] ?? "atelier",
          title: item.title,
          date: metaToDateStr(item.meta),
          time: metaToTimeStr(item.meta),
          done: item.done,
          targets: item.targets,
          impact: item.impact,
          responsable: item.responsable,
          detail: item.detail,
          files: item.files,
          objectives: item.objectives,
          themeId: item.themeId,
          cancelled: item.cancelled,
          deckCreated: item.deckCreated,
          itemId: item.id,
          threadId: String(item.id),
        });
      }
    } else {
      const base = eventsByYear[activeYear];
      for (const month of allMonths) {
        merged[month] = base[month] ? [...base[month]] : [];
      }
    }

    for (const u of urgencies) {
      const { year, monthName, displayDate } = parseEventDate(u.eventDate);
      if (year !== activeYear) continue;
      if (!merged[monthName]) merged[monthName] = [];
      merged[monthName].unshift(urgencyToPlanEvent(u, displayDate));
    }
    return merged;
  }, [activeYear, urgencies, storeState, quarterFirstMonth]);

  const switchYear = (y: Year) => {
    setActiveYear(y);
    setActiveQuarterId(defaultQuarter(quarters));
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
                Plan annuel co-construit avec votre chargé de partenariat.
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
            <QuarterTabs active={activeQuarterId} onSelect={setActiveQuarterId} quarterList={displayQuarters} />
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

          {/* Target filter bar */}
          {clientLabels.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setTargetFilter(null)}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${targetFilter === null ? "bg-[rgba(94,234,212,0.15)] text-[#5eead4]" : "border border-[rgba(255,255,255,0.1)] text-[#94a8a0] hover:text-[#e8f5ef]"}`}
              >Toutes les cibles</button>
              {clientLabels.map((l) => (
                <button key={l.id}
                  onClick={() => setTargetFilter(targetFilter === l.id ? null : l.id)}
                  className="rounded-full px-3 py-1 text-[11px] font-semibold transition"
                  style={targetFilter === l.id
                    ? { background: l.color + "33", color: l.color, border: `1px solid ${l.color}66` }
                    : { border: "1px solid rgba(255,255,255,0.1)", color: "#94a8a0" }}
                >{l.name}</button>
              ))}
            </div>
          )}

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
                  events={(yearEvents[m] ?? []).filter((e) => !targetFilter || (e.targets ?? []).includes(targetFilter))}
                  nextEvent={isNextMonth ? nextEvent : null}
                  onOpen={(event) => setActiveEvent({ event, month: m })}
                  labels={clientLabels}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Documents */}
      <div id="documents" className="border-t border-white/[0.04] px-9 pb-12 pt-10 scroll-mt-20">
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
            {storeDocs.map((d) => (
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
          clientLabels={clientLabels}
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
  onSelect,
  quarterList,
}: {
  active: QuarterId;
  onSelect: (id: QuarterId) => void;
  quarterList: Quarter[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
      {quarterList.map((q) => {
        const isActive = q.id === active;
        const status = quarterStatus(q);
        const progress = quarterProgress(q);
        const monthsAbbr = q.months
          .map((m) => monthLabel[m]?.slice(0, 3) ?? m.slice(0, 3))
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
                {q.emoji}
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
  const status = quarterStatus(quarter);
  const progress = quarterProgress(quarter);
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
  labels = [],
}: {
  month: string;
  year: Year;
  events: PlanEvent[];
  nextEvent: PlanEvent | null;
  onOpen: (event: PlanEvent) => void;
  labels?: TargetLabel[];
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
              labels={labels}
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
  labels = [],
}: {
  event: PlanEvent;
  isNext: boolean;
  onOpen: () => void;
  labels?: TargetLabel[];
}) {
  const cfg = eventTypeConfig[event.type];
  const parsed = event.date ? parseDateLabel(event.date) : null;

  return (
    <li className="relative">
      {isNext && (
        <span className="absolute -top-2 right-2.5 z-10 rounded-[4px] bg-[#5eead4] px-[7px] py-[3px] text-[9px] font-bold tracking-[0.5px] text-[#042f2a]">
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
              {event.time && (
                <div className="mt-[4px] text-[9px] tabular-nums text-[#5eead4]">
                  {event.time}
                </div>
              )}
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
          <div className={`mb-1.5 text-[13px] font-medium leading-snug ${event.done ? "text-[#6b7c75] line-through" : "text-[#e8f5ef]"}`}>
            {event.title}
          </div>
          {event.targets && event.targets.length > 0 && labels.length > 0 && (
            <div className="mb-1.5 flex flex-wrap gap-1">
              {labels.filter((l) => event.targets!.includes(l.id)).map((l) => (
                <span key={l.id} className="rounded-[4px] px-[5px] py-[2px] text-[9px] font-semibold"
                  style={{ background: l.color + "22", color: l.color, border: `1px solid ${l.color}44` }}>
                  {l.name}
                </span>
              ))}
            </div>
          )}
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
  clientLabels,
  onClose,
}: {
  event: PlanEvent;
  month: string;
  year: Year;
  clientLabels: TargetLabel[];
  onClose: () => void;
}) {
  const assignedLabels = clientLabels.filter((l) => event.targets?.includes(l.id));
  const showDeckBadge = !!event.deckCreated && (event.type === "qbr" || event.type === "atelier");
  const { clientId: CLIENT_ID } = useActiveClient();
  const threadId = event.threadId ?? `${event.type}:${event.title}`;
  const [comments, setComments] = useState<PlanComment[]>(() =>
    commentsStore.getByThread(threadId)
  );
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    commentsStore.load(threadId);
    return commentsStore.subscribe(() =>
      setComments(commentsStore.getByThread(threadId))
    );
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  function sendComment() {
    const t = draft.trim();
    if (!t) return;
    commentsStore.add(threadId, CLIENT_ID, "client", t);
    setDraft("");
  }

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
              {event.cancelled ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-salmon/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-salmon">
                  Annulé
                </span>
              ) : event.type === "urgence" ? (
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
              {showDeckBadge && (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-teal-bright/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-teal-bright">
                  📊 Deck préparé
                </span>
              )}
            </div>
            <h2
              id="event-modal-title"
              className="mt-3 text-xl font-medium leading-snug tracking-tight text-brand-cream"
            >
              {event.title}
            </h2>
            {event.responsable && (
              <p className="mt-1.5 text-[12px] text-brand-muted-on-dark">
                Animé par <span className="text-brand-cream">{event.responsable}</span>
              </p>
            )}
          </div>
        </div>

        {event.cancelled && (
          <div className="mt-5 rounded-[10px] border border-brand-salmon/30 bg-brand-salmon/10 px-4 py-2.5 text-[12px] leading-relaxed text-brand-salmon">
            ⚠ Cette action a été annulée par votre CSM. Elle reste visible
            pour conserver l&apos;historique mais ne sera pas tenue.
          </div>
        )}

        <div className="mt-6 space-y-5">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal-bright">
              À propos
            </h3>
            <p className="text-sm leading-relaxed text-brand-muted-on-dark">
              {description}
            </p>
          </section>

          {event.impact && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
                Impact attendu
              </h3>
              <p className="text-sm leading-relaxed text-brand-cream">
                {event.impact}
              </p>
            </section>
          )}

          {event.detail && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal-bright">
                Détails complémentaires
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-cream">
                {event.detail}
              </p>
            </section>
          )}

          {event.objectives && event.objectives.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal-bright">
                Objectifs
              </h3>
              <ul className="space-y-1.5 text-sm text-brand-cream">
                {event.objectives.map((o, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green-bright" aria-hidden />
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {assignedLabels.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal-bright">
                Étiquettes
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {assignedLabels.map((l) => (
                  <span
                    key={l.id}
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                    style={{
                      background: `${l.color}22`,
                      color: l.color,
                      border: `1px solid ${l.color}55`,
                    }}
                  >
                    {l.name}
                  </span>
                ))}
              </div>
            </section>
          )}

          {event.files && event.files.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal-bright">
                Fichiers partagés
              </h3>
              <div className="flex flex-col gap-1.5">
                {event.files.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => void openClientFile(f.path, f.name)}
                    className="inline-flex items-center gap-2 rounded-xl border border-brand-border-dark px-3 py-2 text-left text-[12px] font-medium text-brand-cream transition-colors hover:border-brand-green-bright/40 hover:bg-brand-green-bright/5"
                  >
                    <span className="text-[14px]">{getFileIcon(f.mimeType)}</span>
                    <span className="min-w-0 flex-1 truncate">{f.name}</span>
                    <span className="shrink-0 text-[11px] text-brand-muted-on-dark">{f.sizeLabel}</span>
                    <span className="shrink-0 text-brand-green-bright"><DownloadIcon /></span>
                  </button>
                ))}
              </div>
            </section>
          )}

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

        {/* ── Thread de commentaires ── */}
        {(
          <div className="mt-6 border-t border-brand-border-dark pt-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal-bright">
              Messages avec votre CSM
            </h3>

            {/* Thread */}
            <div className="mb-3 flex max-h-[260px] flex-col gap-2 overflow-y-auto pr-1">
              {comments.length === 0 && (
                <p className="py-4 text-center text-[12px] text-brand-muted-on-dark">
                  Aucun message pour le moment. Posez votre première question ci-dessous.
                </p>
              )}
              {comments.map((c) => {
                const isClient = c.author === "client";
                const d = new Date(c.date);
                const dateLabel = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) + " · " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={c.id} className={`flex flex-col gap-0.5 ${isClient ? "items-end" : "items-start"}`}>
                    <span className="text-[10px] text-brand-muted-on-dark px-1">
                      {isClient ? "Vous" : "CSM"} · {dateLabel}
                    </span>
                    <div className={`max-w-[85%] rounded-[12px] px-3.5 py-2.5 text-[13px] leading-snug ${
                      isClient
                        ? "rounded-br-[4px] bg-brand-teal-bright/15 text-brand-cream"
                        : "rounded-bl-[4px] bg-white/[0.06] text-brand-cream"
                    }`}>
                      {c.text}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendComment()}
                placeholder="Écrire un message à votre CSM…"
                className="flex-1 rounded-[10px] border border-brand-border-dark bg-white/[0.04] px-3.5 py-2.5 text-[13px] text-brand-cream placeholder-brand-muted-on-dark outline-none focus:border-brand-teal-bright/40"
              />
              <button
                onClick={sendComment}
                disabled={!draft.trim()}
                className="rounded-[10px] bg-brand-teal-bright/20 px-4 py-2.5 text-[13px] font-semibold text-brand-teal-bright transition-colors hover:bg-brand-teal-bright/30 disabled:opacity-30"
              >
                Envoyer
              </button>
            </div>
          </div>
        )}

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

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼";
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "📊";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "📊";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  return "📎";
}

function DocumentCard({ doc }: { doc: CsmDocument }) {
  const hasFiles = doc.files && doc.files.length > 0;
  const cardIcon = hasFiles ? getFileIcon(doc.files![0].mimeType) : "📄";

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-brand-border-dark bg-brand-surface p-5 transition-colors hover:border-brand-green-bright/40">
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#2d6b62] to-[#163834] text-2xl">
          {cardIcon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
                docTypeStyle[doc.type] ?? "bg-brand-cream/10 text-brand-cream"
              }`}
            >
              {doc.type}
            </span>
            <span className="text-[10px] text-brand-muted-on-dark">
              · {doc.size}
            </span>
            {hasFiles && (
              <span className="rounded-full bg-brand-green-bright/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-green-bright">
                {doc.files!.length} fichier{doc.files!.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <h3 className="text-sm font-medium leading-snug text-brand-cream">
            {doc.title}
          </h3>
          <p className="mt-1 text-[11px] text-brand-muted-on-dark">
            {doc.author} · {doc.date}
          </p>
        </div>
      </div>

      {hasFiles ? (
        <div className="flex flex-col gap-1.5">
          {doc.files!.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => void openClientFile(f.path, f.name)}
              className="inline-flex items-center gap-2 rounded-xl border border-brand-border-dark px-3 py-2 text-left text-[12px] font-medium text-brand-cream transition-colors hover:border-brand-green-bright/40 hover:bg-brand-green-bright/5"
            >
              <span className="text-[14px]">{getFileIcon(f.mimeType)}</span>
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="shrink-0 text-[11px] text-brand-muted-on-dark">{f.sizeLabel}</span>
              <span className="shrink-0 text-brand-green-bright"><DownloadIcon /></span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            title="Bientôt disponible"
            className="inline-flex flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-full border border-brand-border-dark px-3 py-2 text-[12px] font-medium text-brand-cream opacity-50"
          >
            <EyeIcon /> Voir
          </button>
          <button
            type="button"
            title="Bientôt disponible"
            className="inline-flex flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-full bg-brand-green-bright px-3 py-2 text-[12px] font-semibold text-brand-dark opacity-50"
          >
            <DownloadIcon /> Télécharger
          </button>
        </div>
      )}
    </article>
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
