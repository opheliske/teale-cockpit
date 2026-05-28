"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { workshops, themes, type Workshop, type ProgrammeStep } from "@/app/(client)/catalogue-ateliers/data";
import { useActiveClient } from "@/lib/client-context";
import { planStore, type StoredPlanItem } from "@/lib/plan-store";
import { atelierFeedbackStore, type AtelierFeedback } from "@/lib/atelier-feedback-store";
import { csmClientsStore } from "@/lib/csm-clients-store";
import { buildPlanQuarters, type PlanQuarter } from "@/lib/plan-quarters";
import { monthFromMeta, yearFromMeta, dayFromMeta } from "@/lib/plan-dates";

type Format = "presentiel" | "distanciel" | "hybride";
type Audience = "RH" | "Elus" | "Managers" | "Collaborateurs" | "Codir";
type ScheduledStatus = "realise" | "annule" | "upcoming";

type ScheduledAtelier = {
  id: string;
  workshopId: string; // "" when no catalogue match
  // Workshop data carried directly on the scheduled item — so a CSM-typed
  // atelier title that doesn't match the static catalogue still produces a
  // visible card (the previous version returned null and rendered nothing).
  title: string;
  themeId: string;
  objectives: string[];
  duration?: string;
  programme?: ProgrammeStep[];
  catalogueTargetAudience?: string[];
  dateLabel: string;
  timeLabel: string;
  isoDate: string;
  format: Format;
  location?: string;
  intervenant: { name: string; role?: string };
  audiences: Audience[];
  registrationLink?: string;
  attendees?: number;
  satisfaction?: number;
  participantFeedbacks?: number;
  participantComments?: { rating: number; text: string }[];
  clientFeedback?: { rating: number; comment: string };
  cancelled?: boolean;
  cancellationReason?: string;
};

function dayDiff(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function scheduledStatus(s: ScheduledAtelier): ScheduledStatus {
  if (s.cancelled) return "annule";
  if (dayDiff(s.isoDate) < 0) return "realise";
  return "upcoming";
}

const CANCELLATION_THRESHOLD_DAYS = 15;

function daysUntilCancellationDeadline(iso: string): number {
  return dayDiff(iso) - CANCELLATION_THRESHOLD_DAYS;
}

function cancellationDeadlineLabel(iso: string): string {
  const target = new Date(iso);
  target.setDate(target.getDate() - CANCELLATION_THRESHOLD_DAYS);
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(target);
}

const formatConfig: Record<Format, { label: string; emoji: string; pillClass: string }> = {
  presentiel: { label: "Présentiel", emoji: "📍", pillClass: "bg-brand-salmon/15 text-brand-salmon" },
  distanciel: { label: "Distanciel", emoji: "🖥", pillClass: "bg-brand-accent/15 text-brand-accent" },
  hybride:    { label: "Hybride",    emoji: "💻", pillClass: "bg-brand-green-bright/15 text-brand-green-bright" },
};

const audienceConfig: Record<Audience, { label: string; emoji: string; pillClass: string }> = {
  RH:             { label: "RH",              emoji: "👔", pillClass: "bg-brand-accent/15 text-brand-accent" },
  Elus:           { label: "Élus",            emoji: "🎯", pillClass: "bg-brand-salmon/15 text-brand-salmon" },
  Managers:       { label: "Managers",        emoji: "👥", pillClass: "bg-brand-green-bright/15 text-brand-green-bright" },
  Collaborateurs: { label: "Collaborateurs",  emoji: "🧑‍🤝‍🧑", pillClass: "bg-brand-cream/10 text-brand-cream" },
  Codir:          { label: "Codir",           emoji: "👑", pillClass: "bg-brand-upcoming/15 text-brand-upcoming" },
};

const statusConfig: Record<ScheduledStatus, { label: string; pillClass: string; dotClass: string; badgeClass: string }> = {
  realise: { label: "Réalisé",  pillClass: "bg-brand-green-bright/20 text-brand-green-bright", dotClass: "bg-brand-green-bright",  badgeClass: "bg-brand-green-bright text-brand-dark" },
  annule:  { label: "Annulé",   pillClass: "bg-brand-salmon/15 text-brand-salmon",              dotClass: "bg-brand-salmon",          badgeClass: "bg-brand-salmon text-white" },
  upcoming:{ label: "À venir",  pillClass: "bg-brand-upcoming/15 text-brand-upcoming",          dotClass: "bg-brand-upcoming",        badgeClass: "bg-white/90 text-brand-dark" },
};

const themeGradient: Record<string, string> = {
  prevention:    "bg-gradient-to-br from-[#b3826b] to-[#efb8ad]",
  stress:        "bg-gradient-to-br from-[#2d6b62] to-[#4cbfa6]",
  epanouissement:"bg-gradient-to-br from-[#2a7d4a] to-[#a8e895]",
  relations:     "bg-gradient-to-br from-[#8fb6c7] to-[#2d6b62]",
  resilience:    "bg-gradient-to-br from-[#4d6961] to-[#c2bbab]",
};

const themeEmoji: Record<string, string> = {
  prevention: "🛡️", stress: "🧘", epanouissement: "🌱", relations: "🤝", resilience: "🌳",
};

const themeTagClass: Record<string, string> = {
  prevention:    "bg-[rgba(251,146,60,0.15)] text-[#fdba74]",
  stress:        "bg-[rgba(94,234,212,0.15)] text-[#5eead4]",
  epanouissement:"bg-[rgba(132,204,22,0.15)] text-[#bef264]",
  relations:     "bg-[rgba(125,211,252,0.15)] text-[#7dd3fc]",
  resilience:    "bg-[rgba(148,163,184,0.15)] text-[#cbd5e1]",
};

const themeEmojiBoxClass: Record<string, string> = {
  prevention:    "bg-[rgba(251,146,60,0.12)]",
  stress:        "bg-[rgba(94,234,212,0.1)]",
  epanouissement:"bg-[rgba(132,204,22,0.12)]",
  relations:     "bg-[rgba(125,211,252,0.12)]",
  resilience:    "bg-[rgba(148,163,184,0.12)]",
};

const themeShortLabel: Record<string, string> = {
  prevention:    "PRÉVENTION",
  stress:        "STRESS & ÉMOTIONS",
  epanouissement:"ÉPANOUISSEMENT",
  relations:     "RELATIONS",
  resilience:    "RÉSILIENCE",
};

const FR_MONTHS_LONG = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const FR_MONTHS_SHORT = ["JAN","FÉV","MAR","AVR","MAI","JUIN","JUIL","AOÛT","SEPT","OCT","NOV","DÉC"];

const AVATAR_COLORS: [string, string][] = [
  ["#5eead4","#2dd4bf"],
  ["#fdba74","#fb923c"],
  ["#c4b5fd","#a78bfa"],
  ["#7dd3fc","#38bdf8"],
  ["#bef264","#84cc16"],
  ["#f9a8d4","#ec4899"],
];

function avatarColors(name: string): [string, string] {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initials(name: string): string {
  return name.split(" ").map((p) => p[0] ?? "").slice(0, 2).join("").toUpperCase();
}

function pickWorkshopEmoji(w: Workshop): string {
  const t = w.title.toLowerCase();
  if (/burn|épuisement|epuisement/.test(t)) return "🔥";
  if (/stress/.test(t)) return "💆";
  if (/sommeil|insomn/.test(t)) return "😴";
  if (/optim/.test(t)) return "☀️";
  if (/force/.test(t)) return "💪";
  if (/feedback/.test(t)) return "💬";
  if (/cohésion|cohesion/.test(t)) return "🤝";
  if (/assertiv/.test(t)) return "🗣️";
  if (/adolesc|parent/.test(t)) return "👨‍👩‍👧";
  if (/maladie|handicap|inclusion/.test(t)) return "♿";
  if (/changement/.test(t)) return "🔄";
  if (/résilience|resilience/.test(t)) return "🌳";
  if (/addict|comportement/.test(t)) return "🚭";
  if (/charge mentale/.test(t)) return "🧠";
  if (/émotion|emotion|cerveau/.test(t)) return "❤️";
  if (/rps|risque/.test(t)) return "⚠️";
  if (/premiers/.test(t)) return "🚀";
  return themeEmoji[w.themeId] ?? "✨";
}

function groupByMonth(items: ScheduledAtelier[]): { label: string; count: number; items: ScheduledAtelier[] }[] {
  const map = new Map<string, ScheduledAtelier[]>();
  for (const item of items) {
    const d = new Date(item.isoDate);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries()).map(([key, its]) => {
    const parts = key.split("-");
    const monthIdx = parseInt(parts[1]);
    return { label: `${FR_MONTHS_LONG[monthIdx].toUpperCase()} ${parts[0]}`, count: its.length, items: its };
  });
}

const workshopById = Object.fromEntries(workshops.map((w) => [w.id, w]));
// Best-effort lookup by normalised title — covers the case where the CSM
// picked a workshop from the catalogue (the plan item stores the title
// verbatim, no workshop id). Trimmed + lower-cased to absorb tiny
// differences (trailing spaces, casing).
function normaliseTitle(t: string): string {
  return t.trim().toLowerCase();
}
const workshopByTitle = new Map<string, Workshop>(
  workshops.map((w) => [normaliseTitle(w.title), w]),
);
const themeNameById = Object.fromEntries(themes.map((t) => [t.id, t.name]));

/**
 * Returns a Workshop-shaped object for a ScheduledAtelier. Prefers the
 * catalogue match (richer: programme, duration, audience). Falls back to
 * a synthetic Workshop built from the data the CSM typed on the plan item
 * — title, themeId, objectives — so the UI always has something to show.
 */
function resolveWorkshop(s: ScheduledAtelier): Workshop {
  const catalogue = s.workshopId ? workshopById[s.workshopId] : undefined;
  if (catalogue) return catalogue;
  return {
    id: s.workshopId || `synth-${s.id}`,
    title: s.title,
    themeId: s.themeId || "relations",
    duration: s.duration,
    objectives: s.objectives,
    programme: s.programme ?? [],
    targetAudience: s.catalogueTargetAudience ?? [],
  };
}

const FR_MONTHS_LC = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function parseTimeFromMeta(meta: string): string | undefined {
  const m = meta.match(/(\d{1,2}:\d{2})/);
  return m?.[1];
}

// Build the client's scheduled-atelier list from their plan_state items.
// Rich fields not stored on the plan (audiences, attendees, satisfaction…)
// are left empty or omitted — the UI handles missing values gracefully.
//
// Sync note: the resolution chain for month/year must match the one used
// by the Suivi projet page (mon-planning) — otherwise an atelier with a
// parseable meta date but no structured `month` would appear in one page
// and not the other.
function planItemsToScheduled(
  items: StoredPlanItem[],
  feedbacks: Record<number, AtelierFeedback>,
  planQuarters: PlanQuarter[],
): ScheduledAtelier[] {
  const yearNow = new Date().getFullYear();
  const quarterFirstMonthNum: Record<string, number> = Object.fromEntries(
    planQuarters.map((pq) => [pq.id, pq.months[0]?.num ?? 0]),
  );
  const result: ScheduledAtelier[] = [];
  for (const it of items) {
    if (it.type !== "atelier") continue;

    // Month: structured field wins, else best-effort from meta text, else
    // the first month of the item's quarter (contract-anchored via
    // buildPlanQuarters). Same priority order as the Suivi projet page,
    // so the two views can never disagree on which ateliers exist.
    const monthNum =
      typeof it.month === "number"
        ? it.month
        : monthFromMeta(it.meta) ?? quarterFirstMonthNum[it.quarter];
    if (monthNum == null) continue; // no quarter either → genuinely unplaced

    // Year: a full date in meta (e.g. "24 mai 2026 · 10:00") wins over the
    // structured `year` flag — the human-typed date is authoritative.
    const year =
      yearFromMeta(it.meta) ??
      (it.year === "next" ? yearNow + 1 : yearNow);

    const day = dayFromMeta(it.meta);
    const isoDate = `${year}-${String(monthNum + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const monthName = FR_MONTHS_LC[monthNum];
    const dateLabel = `${day} ${monthName} ${year}`;
    const timeLabel = parseTimeFromMeta(it.meta) ?? "";
    const fb = feedbacks[it.id];

    // Best-effort match against the static workshop catalogue (by
    // normalised title). When matched, we get richer detail (programme,
    // duration, target audience) for the modal; when not, the synthetic
    // resolveWorkshop() fallback uses the title + themeId + objectives the
    // CSM saved directly on the plan item.
    const catalogue = workshopByTitle.get(normaliseTitle(it.title ?? ""));

    result.push({
      id: String(it.id),
      workshopId: catalogue?.id ?? "",
      title: it.title,
      themeId: catalogue?.themeId ?? it.themeId ?? "relations",
      objectives: catalogue?.objectives ?? it.objectives ?? [],
      duration: catalogue?.duration,
      programme: catalogue?.programme,
      catalogueTargetAudience: catalogue?.targetAudience,
      dateLabel,
      timeLabel,
      isoDate,
      format: "presentiel",
      intervenant: { name: it.responsable ?? "" },
      audiences: [],
      clientFeedback: fb ? { rating: fb.rating, comment: fb.comment } : undefined,
      cancelled: it.cancelled || undefined,
    });
  }
  return result;
}

type FilterId = "all" | "upcoming" | "realise" | "annule" | "feedback";
type ViewMode = "liste" | "cartes";

export default function MesAteliersPage() {
  const [filter, setFilter] = useState<FilterId>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("cartes");
  const [activeId, setActiveId] = useState<string | null>(null);
  // Active client (via the (client) route guard) — every list below is scoped
  // to this client.
  const { clientId } = useActiveClient();
  // List of scheduled ateliers, derived from the client's plan_state items.
  const [scheduled, setScheduled] = useState<ScheduledAtelier[]>([]);
  // Feedbacks keyed by ScheduledAtelier.id (string). Synced from the store.
  const [feedbacks, setFeedbacks] = useState<Record<string, { rating: number; comment: string }>>({});

  // Load plan + feedback for this client, rebuild scheduled on any change.
  // contractStart is read from the clients store so we can build the
  // contract-anchored planQuarters — same source as the Suivi projet page.
  useEffect(() => {
    const refresh = () => {
      const items = planStore.getState()?.items ?? [];
      const fbMap = atelierFeedbackStore.getAll();
      const contractStart = csmClientsStore.get(clientId)?.contractStart;
      const planQuarters = buildPlanQuarters(contractStart);
      setScheduled(planItemsToScheduled(items, fbMap, planQuarters));
      const stringKeyed: Record<string, { rating: number; comment: string }> = {};
      for (const fb of Object.values(fbMap)) {
        stringKeyed[String(fb.itemId)] = { rating: fb.rating, comment: fb.comment };
      }
      setFeedbacks(stringKeyed);
    };
    void planStore.load(clientId).then(refresh);
    void atelierFeedbackStore.load(clientId).then(refresh);
    const unsubPlan = planStore.subscribe(refresh);
    const unsubFb = atelierFeedbackStore.subscribe(refresh);
    // Refresh when the clients store hydrates / changes — we need
    // contractStart to compute the quarter fallback months.
    const unsubClients = csmClientsStore.subscribe(refresh);
    return () => {
      unsubPlan();
      unsubFb();
      unsubClients();
    };
  }, [clientId]);

  const counts = useMemo(() => {
    const out = { realise: 0, annule: 0, upcoming: 0, all: scheduled.length };
    for (const s of scheduled) out[scheduledStatus(s)] += 1;
    return out;
  }, [scheduled]);

  const pendingFeedbackItems = useMemo(
    () => scheduled.filter((s) => scheduledStatus(s) === "realise" && !feedbacks[s.id]),
    [scheduled, feedbacks]
  );

  const upcomingItems = useMemo(
    () => scheduled.filter((s) => scheduledStatus(s) === "upcoming").sort((a, b) => dayDiff(a.isoDate) - dayDiff(b.isoDate)),
    [scheduled]
  );
  const realiseItems = useMemo(
    () => scheduled.filter((s) => scheduledStatus(s) === "realise").sort((a, b) => dayDiff(b.isoDate) - dayDiff(a.isoDate)),
    [scheduled]
  );
  const annuleItems = useMemo(
    () => scheduled.filter((s) => s.cancelled),
    [scheduled]
  );

  const nextUpcoming = upcomingItems[0] ?? null;

  const monthCounts = useMemo(() => {
    const arr = new Array(12).fill(0);
    for (const s of scheduled) {
      if (!s.cancelled) arr[new Date(s.isoDate).getMonth()]++;
    }
    return arr;
  }, [scheduled]);

  const upcomingByMonth = useMemo(() => groupByMonth(upcomingItems), [upcomingItems]);

  // Plain computation — the React Compiler memoizes it automatically.
  const ratedItems = realiseItems.filter((s) => s.satisfaction !== undefined);
  const avgRating = ratedItems.length
    ? (ratedItems.reduce((a, s) => a + (s.satisfaction ?? 0), 0) / ratedItems.length).toFixed(1)
    : null;

  const totalFeedbacks = useMemo(
    () => realiseItems.reduce((a, s) => a + (s.participantFeedbacks ?? 0), 0),
    [realiseItems]
  );

  const upcomingRange = useMemo(() => {
    if (!upcomingItems.length) return "";
    const first = new Date(upcomingItems[0].isoDate);
    const last = new Date(upcomingItems[upcomingItems.length - 1].isoDate);
    return `Du ${first.getDate()} ${FR_MONTHS_LONG[first.getMonth()].toLowerCase()} au ${last.getDate()} ${FR_MONTHS_LONG[last.getMonth()].toLowerCase()} ${last.getFullYear()}`;
  }, [upcomingItems]);

  const active = activeId ? scheduled.find((s) => s.id === activeId) ?? null : null;
  const submitFeedback = (id: string, rating: number, comment: string) => {
    // Optimistic UI update; store subscription will re-confirm.
    setFeedbacks((prev) => ({ ...prev, [id]: { rating, comment } }));
    void atelierFeedbackStore.upsert(Number(id), rating, comment);
  };

  const showUpcoming = filter === "all" || filter === "upcoming";
  const showRealise  = filter === "all" || filter === "realise";
  const showAnnule   = filter === "all" || filter === "annule";
  const showFeedback = filter === "feedback";

  const currentMonthIdx = new Date().getMonth();

  return (
    <div className="px-9 py-8">
      <div className="mx-auto max-w-[1280px]">

        {/* HEADER */}
        <div className="mb-[22px] flex items-start justify-between gap-6">
          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[2.5px] text-[#5eead4]">PILOTAGE</p>
            <h1 className="text-[34px] font-semibold tracking-[-0.4px] text-[#e8f5ef]">Mes ateliers programmés</h1>
            <p className="mt-1.5 max-w-[580px] text-[13px] leading-relaxed text-[#94a8a0]">
              Vos interventions collectives Teale — faits, en cours, à venir.
            </p>
          </div>
          <div className="flex shrink-0 gap-2.5">
            <StatBox value={counts.all}      label="Total" />
            <StatBox value={counts.upcoming} label="À venir"  color="green" />
            <StatBox value={counts.realise}  label="Réalisés" color="amber" />
            <StatBox value={counts.annule}   label="Annulés"  color="red" />
          </div>
        </div>

        {/* HERO */}
        {nextUpcoming && (
          <HeroCard scheduled={nextUpcoming} onOpen={() => setActiveId(nextUpcoming.id)} />
        )}

        {/* ALERTS */}
        <AlertsRow
          pendingCount={pendingFeedbackItems.length}
          pendingTitle={pendingFeedbackItems[0]?.title ?? ""}
          pendingIntervenant={pendingFeedbackItems[0]?.intervenant.name ?? ""}
          cancelledCount={counts.annule}
          onOpenFeedback={() => setActiveId(pendingFeedbackItems[0]?.id ?? null)}
        />

        {/* TOOLBAR */}
        <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            <Chip active={filter === "all"}      onClick={() => setFilter("all")}      count={counts.all}>Tous</Chip>
            <Chip active={filter === "upcoming"} onClick={() => setFilter(filter === "upcoming" ? "all" : "upcoming")} count={counts.upcoming}>À venir</Chip>
            <Chip active={filter === "realise"}  onClick={() => setFilter(filter === "realise"  ? "all" : "realise")}  count={counts.realise}>Réalisés</Chip>
            <Chip active={filter === "annule"}   onClick={() => setFilter(filter === "annule"   ? "all" : "annule")}   count={counts.annule}>Annulés</Chip>
            {pendingFeedbackItems.length > 0 && (
              <Chip active={filter === "feedback"} onClick={() => setFilter(filter === "feedback" ? "all" : "feedback")} count={pendingFeedbackItems.length} marginLeft>
                📋 Avis attendu
              </Chip>
            )}
          </div>
          <div className="flex rounded-[9px] border border-[rgba(255,255,255,0.05)] bg-black/25 p-[3px]">
            <ViewBtn active={viewMode === "liste"}  onClick={() => setViewMode("liste")}>☰ Liste</ViewBtn>
            <ViewBtn active={viewMode === "cartes"} onClick={() => setViewMode("cartes")}>⊞ Cartes</ViewBtn>
          </div>
        </div>

        {/* TIMELINE BAR */}
        <TimelineBar monthCounts={monthCounts} currentMonthIdx={currentMonthIdx} />

        {/* SECTIONS */}
        {showFeedback ? (
          <div className="flex flex-col gap-2">
            {pendingFeedbackItems.map((s) => (
              <RowCard key={s.id} scheduled={s} clientFeedback={feedbacks[s.id]} onOpen={() => setActiveId(s.id)} />
            ))}
          </div>
        ) : (
          <>
            {showUpcoming && upcomingItems.length > 0 && (
              <SectionBlock
                icon="🎯" title="À venir" count={upcomingItems.length}
                pillClass="bg-[rgba(94,234,212,0.14)] text-[#5eead4]"
                meta={upcomingRange}
              >
                {viewMode === "liste" ? (
                  <div className="flex flex-col gap-2">
                    {upcomingByMonth.map((group) => (
                      <div key={group.label}>
                        <MonthDivider label={group.label} count={group.count} />
                        {group.items.map((s) => (
                          <RowCard key={s.id} scheduled={s} clientFeedback={feedbacks[s.id]} onOpen={() => setActiveId(s.id)} />
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {upcomingItems.map((s) => (
                      <AtelierCard key={s.id} scheduled={s} clientFeedback={feedbacks[s.id]} onOpen={() => setActiveId(s.id)} />
                    ))}
                  </div>
                )}
              </SectionBlock>
            )}

            {showRealise && realiseItems.length > 0 && (
              <SectionBlock
                icon="✓" title="Réalisés" count={realiseItems.length}
                pillClass="bg-[rgba(255,255,255,0.06)] text-[#94a8a0]"
                meta={avgRating ? `Note moyenne · ⭐ ${avgRating}/5 · ${totalFeedbacks} avis` : ""}
              >
                {viewMode === "liste" ? (
                  <div className="flex flex-col gap-2">
                    {realiseItems.map((s) => (
                      <RowCard key={s.id} scheduled={s} clientFeedback={feedbacks[s.id]} onOpen={() => setActiveId(s.id)} />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {realiseItems.map((s) => (
                      <AtelierCard key={s.id} scheduled={s} clientFeedback={feedbacks[s.id]} onOpen={() => setActiveId(s.id)} />
                    ))}
                  </div>
                )}
              </SectionBlock>
            )}

            {showAnnule && annuleItems.length > 0 && (
              <SectionBlock
                icon="✕" title="Annulés" count={annuleItems.length}
                pillClass="bg-[rgba(255,255,255,0.06)] text-[#94a8a0]"
                meta="Décomptés du forfait annuel"
              >
                {viewMode === "liste" ? (
                  <div className="flex flex-col gap-2">
                    {annuleItems.map((s) => (
                      <RowCard key={s.id} scheduled={s} clientFeedback={feedbacks[s.id]} onOpen={() => setActiveId(s.id)} />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {annuleItems.map((s) => (
                      <AtelierCard key={s.id} scheduled={s} clientFeedback={feedbacks[s.id]} onOpen={() => setActiveId(s.id)} />
                    ))}
                  </div>
                )}
              </SectionBlock>
            )}
          </>
        )}
      </div>

      {active && (
        <AtelierModal
          scheduled={active}
          clientFeedback={feedbacks[active.id]}
          onSubmitFeedback={(rating, comment) => submitFeedback(active.id, rating, comment)}
          onClose={() => setActiveId(null)}
        />
      )}
    </div>
  );
}

// --- new sub-components ---

function StatBox({ value, label, color }: { value: number; label: string; color?: "green" | "amber" | "red" }) {
  return (
    <div className="min-w-[90px] rounded-[11px] border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.025)] px-4 py-3">
      <div className={`text-[22px] font-bold tabular-nums leading-none ${
        color === "green" ? "text-[#5eead4]" :
        color === "amber" ? "text-[#fdba74]" :
        color === "red"   ? "text-[#fca5a5]" :
        "text-[#e8f5ef]"
      }`}>{value}</div>
      <div className="mt-[5px] text-[10px] uppercase tracking-[1px] text-[#94a8a0]">{label}</div>
    </div>
  );
}

function HeroCard({ scheduled: s, onOpen }: { scheduled: ScheduledAtelier; onOpen: () => void }) {
  const workshop = resolveWorkshop(s);
  const days = dayDiff(s.isoDate);
  const fmtCfg = formatConfig[s.format];
  const d = new Date(s.isoDate);
  const WEEKDAYS = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];
  const dateStr = `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${FR_MONTHS_LONG[d.getMonth()].toLowerCase()} · ${s.timeLabel.split(" — ")[0]}`;
  const countdownStr = days <= 0 ? "Aujourd'hui" : `J−${days}`;
  const audienceStr = s.audiences.map((a) => audienceConfig[a].label).join(", ");

  return (
    <div className="relative mb-[22px] overflow-hidden rounded-[16px] border border-[rgba(94,234,212,0.25)] bg-gradient-to-br from-[rgba(94,234,212,0.14)] to-[rgba(94,234,212,0.03)]">
      <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-[#5eead4] to-[#2dd4bf]" aria-hidden />
      <div className="grid items-center gap-6 p-[22px_26px]" style={{ gridTemplateColumns: "auto 1fr auto" }}>
        {/* countdown */}
        <div className="min-w-[130px] border-r border-[rgba(94,234,212,0.18)] pr-6 text-center">
          <div className="text-[38px] font-bold tabular-nums leading-none text-[#5eead4]">{countdownStr}</div>
          <div className="mt-1.5 text-[10px] uppercase tracking-[1px] text-[#94a8a0]">Prochain atelier</div>
          <div className="mt-2 text-[11px] font-medium text-[#c1d4cc]">{dateStr}</div>
        </div>
        {/* body */}
        <div className="min-w-0">
          <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-[4px] bg-[#5eead4] px-2 py-[3px] text-[10px] font-bold uppercase tracking-[1px] text-[#042f2a]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#042f2a]" aria-hidden />
            PROCHAIN{days > 0 ? ` · DANS ${days} JOUR${days !== 1 ? "S" : ""}` : " · AUJOURD'HUI"}
          </div>
          <div className="mb-2 text-[20px] font-semibold leading-[1.3] text-[#e8f5ef]">{workshop.title}</div>
          <div className="flex flex-wrap items-center gap-3.5 text-[12px] text-[#c1d4cc]">
            <span>👤 {s.intervenant.name}</span>
            <span className="text-[rgba(255,255,255,0.15)]">·</span>
            <span>{fmtCfg.emoji} {fmtCfg.label}</span>
            <span className="text-[rgba(255,255,255,0.15)]">·</span>
            <span>👔 {audienceStr}</span>
            <span className="text-[rgba(255,255,255,0.15)]">·</span>
            <span>⏱ {workshop.duration}</span>
          </div>
        </div>
        {/* actions */}
        <div className="flex shrink-0 flex-col gap-2">
          <button type="button" onClick={onOpen} className="rounded-[9px] bg-[#5eead4] px-[18px] py-[10px] text-[12px] font-semibold text-[#042f2a] transition-colors hover:bg-[#2dd4bf]">
            Voir le détail →
          </button>
          <button type="button" className="rounded-[9px] border border-[rgba(94,234,212,0.3)] px-4 py-[9px] text-[12px] font-medium text-[#5eead4] transition-colors hover:bg-[rgba(94,234,212,0.08)]">
            Kit de communication
          </button>
        </div>
      </div>
    </div>
  );
}

function AlertsRow({
  pendingCount, pendingTitle, pendingIntervenant, cancelledCount, onOpenFeedback,
}: {
  pendingCount: number; pendingTitle: string; pendingIntervenant: string;
  cancelledCount: number; onOpenFeedback: () => void;
}) {
  return (
    <div className="mb-[22px] grid grid-cols-[1fr_auto] gap-2.5">
      {pendingCount > 0 ? (
        <div className="flex items-center gap-3.5 rounded-[11px] border border-[rgba(250,204,21,0.18)] bg-[rgba(250,204,21,0.05)] p-[12px_16px]">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[rgba(250,204,21,0.15)] text-[14px]" aria-hidden>⭐</div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-[#fde047]">
              {pendingCount} atelier{pendingCount > 1 ? "s attendent" : " attend"} votre retour
            </div>
            <div className="truncate text-[11px] text-[#94a8a0]">
              « {pendingTitle} » — animé par {pendingIntervenant}
            </div>
          </div>
          <button type="button" onClick={onOpenFeedback} className="shrink-0 rounded-[7px] bg-[#fde047] px-[13px] py-[7px] text-[11px] font-semibold text-[#422006] transition-colors hover:bg-[#facc15]">
            Donner mon avis
          </button>
        </div>
      ) : (
        <div className="rounded-[11px] border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-[12px_16px] text-[11px] text-[#94a8a0]">
          Aucun atelier en attente de votre retour.
        </div>
      )}
      <div className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-[11px] border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] px-3.5 py-3 text-[11px] text-[#94a8a0] transition-colors hover:bg-[rgba(255,255,255,0.04)]">
        ⓘ Annulation&nbsp;: <strong className="text-[#e8f5ef] font-semibold">15 jours</strong>&nbsp;avant l&apos;atelier&nbsp;·&nbsp;<strong className="text-[#e8f5ef] font-semibold">{cancelledCount}/X</strong>&nbsp;utilisés
      </div>
    </div>
  );
}

function Chip({ active, onClick, count, children, marginLeft }: {
  active: boolean; onClick: () => void; count?: number; children: ReactNode; marginLeft?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-[7px] rounded-[8px] border px-[13px] py-2 text-[12px] font-medium transition-all ${marginLeft ? "ml-1.5" : ""} ${
        active
          ? "border-[rgba(94,234,212,0.3)] bg-[rgba(94,234,212,0.12)] text-[#5eead4]"
          : "border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] text-[#c1d4cc] hover:bg-[rgba(255,255,255,0.06)]"
      }`}
    >
      {children}
      {count !== undefined && (
        <span className={`rounded-[4px] px-[6px] py-[1px] text-[10px] font-bold ${
          active ? "bg-[rgba(94,234,212,0.2)] text-[#5eead4]" : "bg-[rgba(255,255,255,0.06)] text-[#94a8a0]"
        }`}>{count}</span>
      )}
    </button>
  );
}

function ViewBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-[5px] rounded-[6px] px-[11px] py-[7px] text-[11px] font-semibold transition-all ${
        active ? "bg-[rgba(94,234,212,0.14)] text-[#5eead4]" : "text-[#94a8a0] hover:text-[#e8f5ef]"
      }`}
    >
      {children}
    </button>
  );
}

function TimelineBar({ monthCounts, currentMonthIdx }: { monthCounts: number[]; currentMonthIdx: number }) {
  return (
    <div className="mb-[18px] flex items-center gap-3 rounded-[12px] border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.015)] px-4 py-3.5">
      <span className="mr-1 shrink-0 text-[10px] font-bold uppercase tracking-[1.2px] text-[#6b7c75]">2026</span>
      <div className="grid flex-1 grid-cols-12 gap-[3px]">
        {FR_MONTHS_SHORT.map((name, i) => {
          const isPast = i < currentMonthIdx;
          const isNow  = i === currentMonthIdx;
          const count  = monthCounts[i];
          return (
            <div
              key={i}
              className={`cursor-pointer rounded-[6px] px-1 py-1.5 text-center transition-all hover:bg-[rgba(255,255,255,0.03)] ${
                isNow  ? "border border-[rgba(94,234,212,0.25)] bg-[rgba(94,234,212,0.1)]" :
                isPast ? "opacity-40" :
                count > 0 ? "bg-[rgba(94,234,212,0.04)]" : ""
              }`}
            >
              <div className={`text-[10px] font-semibold tracking-[0.5px] ${isNow ? "text-[#5eead4]" : "text-[#94a8a0]"}`}>
                {name}
              </div>
              <div className={`mt-[3px] text-[11px] font-bold tabular-nums ${
                isNow   ? "text-[#5eead4]" :
                isPast  ? "text-[#94a8a0]" :
                count > 0 ? "text-[#e8f5ef]" : "text-[#2a3934]"
              }`}>
                {count > 0 ? count : "—"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionBlock({ icon, title, count, pillClass, meta, children }: {
  icon: string; title: string; count: number; pillClass: string; meta: string; children: ReactNode;
}) {
  return (
    <div className="mb-7">
      <div className="mb-[14px] flex items-baseline justify-between border-b border-[rgba(255,255,255,0.05)] pb-2.5">
        <div className="flex items-center gap-2.5 text-[14px] font-semibold text-[#e8f5ef]">
          <span aria-hidden>{icon}</span>
          {title}
          <span className={`rounded-[5px] px-2 py-[3px] text-[10px] font-bold tracking-[0.5px] ${pillClass}`}>
            {count} ATELIER{count !== 1 ? "S" : ""}
          </span>
        </div>
        {meta && <span className="text-[11px] text-[#6b7c75]">{meta}</span>}
      </div>
      {children}
    </div>
  );
}

function MonthDivider({ label, count }: { label: string; count: number }) {
  return (
    <div className="mt-1 mb-2 flex items-center gap-3 px-1 py-2">
      <span className="text-[11px] font-bold tracking-[1.2px] text-[#94a8a0]">{label}</span>
      <span className="h-px flex-1 bg-[rgba(255,255,255,0.04)]" />
      <span className="text-[10px] text-[#6b7c75]">{count} atelier{count > 1 ? "s" : ""}</span>
    </div>
  );
}

function RowCard({ scheduled: s, clientFeedback, onOpen }: {
  scheduled: ScheduledAtelier;
  clientFeedback?: { rating: number; comment: string };
  onOpen: () => void;
}) {
  const workshop = resolveWorkshop(s);
  const status = scheduledStatus(s);
  const days = dayDiff(s.isoDate);
  const needsFeedback = status === "realise" && !clientFeedback;
  const tagClass = themeTagClass[workshop.themeId] ?? "bg-[rgba(255,255,255,0.05)] text-[#94a8a0]";
  const tagLabel = themeShortLabel[workshop.themeId] ?? workshop.themeId.toUpperCase();
  const fmtCfg = formatConfig[s.format];
  const d = new Date(s.isoDate);
  const dayNum = String(d.getDate()).padStart(2, "0");
  const monthAbbr = FR_MONTHS_LONG[d.getMonth()].slice(0, 4);
  const timeOnly = s.timeLabel.split(" — ")[0];
  const [c1, c2] = avatarColors(s.intervenant.name);
  const inits = initials(s.intervenant.name);

  let statusEl: ReactNode;
  if (status === "annule") {
    statusEl = <span className="min-w-[80px] rounded-[5px] bg-[rgba(252,165,165,0.12)] px-[9px] py-1 text-center text-[10px] font-bold tracking-[0.5px] text-[#fca5a5]">ANNULÉ</span>;
  } else if (needsFeedback) {
    statusEl = <span className="min-w-[80px] rounded-[5px] bg-[rgba(250,204,21,0.14)] px-[9px] py-1 text-center text-[10px] font-bold tracking-[0.5px] text-[#fde047]">⭐ AVIS ATTENDU</span>;
  } else if (status === "realise") {
    statusEl = <span className="min-w-[80px] rounded-[5px] bg-[rgba(255,255,255,0.05)] px-[9px] py-1 text-center text-[10px] font-bold tracking-[0.5px] text-[#94a8a0]">RÉALISÉ</span>;
  } else {
    const label = days === 0 ? "AUJOURD'HUI" : `DANS ${days}J`;
    statusEl = <span className="min-w-[80px] rounded-[5px] bg-[rgba(94,234,212,0.12)] px-[9px] py-1 text-center text-[10px] font-bold tracking-[0.5px] text-[#5eead4]">{label}</span>;
  }

  return (
    <div
      onClick={onOpen}
      className={`mb-2 grid cursor-pointer items-center rounded-[12px] border p-[14px_16px] transition-all hover:translate-x-0.5 hover:border-[rgba(94,234,212,0.18)] hover:bg-[rgba(255,255,255,0.035)] ${
        status === "annule"  ? "border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] opacity-50" :
        needsFeedback        ? "border-[rgba(250,204,21,0.18)] bg-[rgba(250,204,21,0.03)]" :
        status === "realise" ? "border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] opacity-[0.72]" :
                               "border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)]"
      }`}
      style={{ gridTemplateColumns: "64px 1fr auto auto auto", gap: "18px" }}
    >
      {/* date block */}
      <div className="rounded-[8px] border border-[rgba(255,255,255,0.04)] bg-black/20 py-1.5 text-center">
        <div className={`text-[18px] font-bold tabular-nums leading-none ${status !== "upcoming" ? "text-[#94a8a0]" : "text-[#e8f5ef]"}`}>{dayNum}</div>
        <div className="mt-[3px] text-[9px] uppercase tracking-[0.8px] text-[#94a8a0]">{monthAbbr}</div>
        <div className="mt-[2px] text-[9px] tabular-nums text-[#6b7c75]">{timeOnly}</div>
      </div>

      {/* body */}
      <div className="min-w-0">
        <div className="mb-[5px] flex flex-wrap gap-[5px]">
          <span className={`rounded-[4px] px-[7px] py-[2px] text-[9px] font-bold tracking-[0.5px] ${tagClass}`}>{tagLabel}</span>
          <span className="inline-flex items-center gap-1 rounded-[4px] bg-[rgba(255,255,255,0.05)] px-[7px] py-[2px] text-[9px] text-[#94a8a0]">
            {fmtCfg.emoji} {fmtCfg.label}
          </span>
        </div>
        <div className={`mb-1 truncate text-[14px] font-semibold leading-[1.3] ${status === "annule" ? "text-[#94a8a0] line-through" : "text-[#e8f5ef]"}`}>
          {workshop.title}
        </div>
        <div className="flex items-center gap-[5px] text-[11px] text-[#94a8a0]">
          <span
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-[#042f2a]"
            style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
            aria-hidden
          >
            {inits}
          </span>
          {s.intervenant.name}
        </div>
      </div>

      {/* audience */}
      <div className="flex flex-wrap gap-1">
        {s.audiences.slice(0, 3).map((a) => (
          <span key={a} className="rounded-[6px] bg-[rgba(255,255,255,0.04)] px-2 py-1 text-[10px] text-[#94a8a0]">
            {audienceConfig[a].label}
          </span>
        ))}
      </div>

      {/* rating */}
      <div className="flex flex-col items-end gap-[3px] text-[10px]">
        {status === "realise" && s.satisfaction !== undefined ? (
          <>
            <div>
              <span className="text-[11px] tracking-[-1px] text-[#fde047]">★★★★★</span>{" "}
              <span className="font-semibold text-[#e8f5ef]">{s.satisfaction.toFixed(1)}</span>
            </div>
            <div className="text-[10px] text-[#6b7c75]">{s.participantFeedbacks} avis</div>
          </>
        ) : <div />}
      </div>

      {/* status */}
      {statusEl}
    </div>
  );
}

// --- preserved components ---

function AtelierCard({ scheduled: s, clientFeedback, onOpen }: {
  scheduled: ScheduledAtelier;
  clientFeedback?: { rating: number; comment: string };
  onOpen: () => void;
}) {
  const workshop = resolveWorkshop(s);
  const status = scheduledStatus(s);
  const days = dayDiff(s.isoDate);
  const emoji = pickWorkshopEmoji(workshop);
  const fmtCfg = formatConfig[s.format];
  const tagClass = themeTagClass[workshop.themeId] ?? "bg-[rgba(255,255,255,0.05)] text-[#94a8a0]";
  const tagLabel = themeShortLabel[workshop.themeId] ?? workshop.themeId.toUpperCase();
  const emojiBoxClass = themeEmojiBoxClass[workshop.themeId] ?? "bg-[rgba(255,255,255,0.04)]";
  const needsFeedback = status === "realise" && !clientFeedback;
  const [c1, c2] = avatarColors(s.intervenant.name);
  const inits = initials(s.intervenant.name);

  const borderClass =
    status === "annule"  ? "border-[rgba(255,255,255,0.05)] opacity-60" :
    needsFeedback        ? "border-[rgba(250,204,21,0.2)]" :
    status === "upcoming"? "border-[rgba(94,234,212,0.2)]" :
                           "border-[rgba(255,255,255,0.05)]";

  let badgeEl: ReactNode;
  if (needsFeedback) {
    badgeEl = <span className="rounded-[4px] bg-[rgba(250,204,21,0.14)] px-[7px] py-[3px] text-[9px] font-bold tracking-[0.4px] text-[#fde047]">⭐ AVIS ATTENDU</span>;
  } else if (status === "annule") {
    badgeEl = <span className="rounded-[4px] bg-[rgba(252,165,165,0.12)] px-[7px] py-[3px] text-[9px] font-bold tracking-[0.4px] text-[#fca5a5]">ANNULÉ</span>;
  } else if (status === "realise") {
    badgeEl = <span className="rounded-[4px] bg-[rgba(255,255,255,0.05)] px-[7px] py-[3px] text-[9px] font-bold tracking-[0.4px] text-[#94a8a0]">RÉALISÉ</span>;
  } else {
    const label = days === 0 ? "AUJOURD'HUI" : days === 1 ? "DEMAIN" : `DANS ${days}J`;
    badgeEl = <span className="rounded-[4px] bg-[rgba(94,234,212,0.12)] px-[7px] py-[3px] text-[9px] font-bold tracking-[0.4px] text-[#5eead4]">{label}</span>;
  }

  return (
    <div
      onClick={onOpen}
      className={`flex cursor-pointer flex-col rounded-[13px] border bg-[rgba(255,255,255,0.02)] p-[14px] transition-all hover:-translate-y-0.5 hover:border-[rgba(94,234,212,0.25)] hover:bg-[rgba(255,255,255,0.035)] hover:shadow-[0_8px_24px_-10px_rgba(0,0,0,0.4)] ${borderClass}`}
    >
      {/* top: emoji + status badge */}
      <div className="mb-2.5 flex items-start justify-between">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-[22px] ${emojiBoxClass}`}
          aria-hidden
        >
          {emoji}
        </div>
        {badgeEl}
      </div>

      {/* tags */}
      <div className="mb-2 flex flex-wrap gap-[5px]">
        <span className={`rounded-[4px] px-[7px] py-[3px] text-[9px] font-bold tracking-[0.5px] ${tagClass}`}>
          {tagLabel}
        </span>
        <span className={`inline-flex items-center gap-1 rounded-[4px] px-[7px] py-[3px] text-[9px] font-bold tracking-[0.3px] ${fmtCfg.pillClass}`}>
          {fmtCfg.emoji} {fmtCfg.label}
        </span>
      </div>

      {/* title */}
      <div className={`mb-[6px] line-clamp-2 min-h-[36px] text-[13px] font-semibold leading-[1.35] ${status === "annule" ? "line-through text-[#94a8a0]" : "text-[#e8f5ef]"}`}>
        {workshop.title}
      </div>

      {/* date */}
      <div className="mb-2 line-clamp-1 text-[11px] leading-[1.45] text-[#94a8a0]">
        📅 {s.dateLabel} · {s.timeLabel}
      </div>

      {/* intervenant */}
      <div className="mb-2.5 flex items-center gap-1.5 text-[11px] text-[#94a8a0]">
        <span
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-[#042f2a]"
          style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
          aria-hidden
        >
          {inits}
        </span>
        {s.intervenant.name}
      </div>

      {/* audiences */}
      <div className="flex flex-1 flex-wrap content-start gap-1">
        {s.audiences.slice(0, 3).map((a) => (
          <span key={a} className="rounded-[4px] bg-[rgba(255,255,255,0.04)] px-[6px] py-[2px] text-[9px] text-[#94a8a0]">
            {audienceConfig[a].label}
          </span>
        ))}
      </div>

      {/* footer */}
      <div className="mt-3 flex items-center justify-between border-t border-[rgba(255,255,255,0.04)] pt-2.5 text-[11px] text-[#6b7c75]">
        <div>
          {status === "realise" && s.satisfaction !== undefined ? (
            <span className="flex items-center gap-1">
              <span className="text-[#fde047]">★</span>
              <span className="font-semibold text-[#e8f5ef]">{s.satisfaction.toFixed(1)}</span>
              <span>/ 5 · {s.participantFeedbacks} avis</span>
            </span>
          ) : (
            <span>⏱ {workshop.duration}</span>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
          className="font-semibold text-[#5eead4]"
        >
          Détail →
        </button>
      </div>
    </div>
  );
}

function StarRating({ value, size = "sm" }: { value: number; size?: "sm" | "md" | "lg" }) {
  const stars: ("full" | "half" | "empty")[] = [];
  for (let i = 0; i < 5; i++) {
    const diff = value - i;
    if (diff >= 0.75) stars.push("full");
    else if (diff >= 0.25) stars.push("half");
    else stars.push("empty");
  }
  const sizeClass = size === "lg" ? "text-xl" : size === "md" ? "text-base" : "text-sm";
  return (
    <span className={`inline-flex items-center gap-0.5 leading-none ${sizeClass}`} aria-label={`Note : ${value.toFixed(1)} sur 5`}>
      {stars.map((s, i) => (
        <span key={i} className={s === "empty" ? "text-brand-muted-on-dark/40" : "text-brand-green-bright"} aria-hidden>
          {s === "full" || s === "half" ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
}

function AtelierModal({ scheduled, clientFeedback, onSubmitFeedback, onClose }: {
  scheduled: ScheduledAtelier;
  clientFeedback?: { rating: number; comment: string };
  onSubmitFeedback: (rating: number, comment: string) => void;
  onClose: () => void;
}) {
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [draftRating, setDraftRating] = useState(0);
  const [draftComment, setDraftComment] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const workshop = resolveWorkshop(scheduled);
  const status = scheduledStatus(scheduled);
  const sCfg = statusConfig[status];
  const fmtCfg = formatConfig[scheduled.format];
  const gradient = themeGradient[workshop.themeId] ?? themeGradient.relations;
  const emoji = pickWorkshopEmoji(workshop);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-6 backdrop-blur-sm sm:p-10" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="atelier-modal-title">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-brand-border-dark bg-brand-surface" onClick={(e) => e.stopPropagation()}>
        <div className={`relative flex h-32 items-end p-5 ${gradient}`}>
          <button type="button" onClick={onClose} aria-label="Fermer" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M6 6l12 12M6 18 18 6" />
            </svg>
          </button>
          <span className="text-4xl drop-shadow-md" aria-hidden>{emoji}</span>
          <span className="absolute right-16 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur-sm">
            <span className={`h-1.5 w-1.5 rounded-full ${sCfg.dotClass}`} />
            {sCfg.label}
          </span>
        </div>

        <div className="p-6 sm:p-7">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-brand-cream/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-cream">{themeNameById[workshop.themeId] ?? "Atelier"}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${fmtCfg.pillClass}`}>{fmtCfg.emoji} {fmtCfg.label}</span>
            <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-cream">{workshop.duration}</span>
          </div>
          <h2 id="atelier-modal-title" className="mt-3 text-2xl font-medium leading-snug tracking-tight text-brand-cream">{workshop.title}</h2>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoBlock icon="🗓" label="Date & heure" value={`${scheduled.dateLabel} · ${scheduled.timeLabel}`} />
            <InfoBlock icon={fmtCfg.emoji} label="Format" value={scheduled.location ? `${fmtCfg.label} — ${scheduled.location}` : fmtCfg.label} />
            <InfoBlock icon="👤" label="Intervenant" value={scheduled.intervenant.name} sub={scheduled.intervenant.role} />
            <InfoBlock icon="🎯" label="Audience cible" value={
              <div className="mt-1 flex flex-wrap gap-1.5">
                {scheduled.audiences.map((a) => {
                  const c = audienceConfig[a];
                  return <span key={a} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${c.pillClass}`}>{c.emoji} {c.label}</span>;
                })}
              </div>
            } />
          </div>

          <Section title="Présentation de l'atelier">
            <ul className="space-y-1.5 text-sm text-brand-cream">
              {workshop.objectives.map((o, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green-bright" aria-hidden />
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Programme">
            <ol className="space-y-2.5 text-sm text-brand-cream">
              {workshop.programme.map((p, i) => (
                <li key={i}>
                  <div className="flex gap-2">
                    <span className="shrink-0 text-brand-teal-bright">{i + 1}.</span>
                    <div className="flex-1">
                      <div className="font-medium">{p.title}</div>
                      {p.items && p.items.length > 0 && (
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-brand-muted-on-dark">
                          {p.items.map((it, j) => <li key={j}>{it}</li>)}
                        </ul>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          <Section title="Kit de communication">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <KitTile emoji="📧" label="Email d'invitation" />
              <KitTile emoji="⏰" label="Email de relance (J-3)" />
              <KitTile emoji="💬" label="Message post-atelier" />
            </div>
            <p className="mt-2 text-[11px] text-brand-muted-on-dark">
              Retrouvez les templates complets dans la rubrique <span className="text-brand-teal-bright">Kits de communication</span>.
            </p>
          </Section>

          {status === "realise" && scheduled.attendees !== undefined && (
            <Section title="Bilan des participants">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-brand-border-dark bg-brand-dark/40 p-3">
                  <div className="text-2xl font-medium text-brand-cream">{scheduled.attendees}</div>
                  <div className="text-[11px] uppercase tracking-wider text-brand-muted-on-dark">Participants</div>
                </div>
                {scheduled.satisfaction !== undefined && (
                  <div className="rounded-xl border border-brand-border-dark bg-brand-dark/40 p-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-medium text-brand-green-bright">{scheduled.satisfaction.toFixed(1)}</span>
                      <span className="text-[11px] text-brand-muted-on-dark">/ 5</span>
                    </div>
                    <div className="mt-1"><StarRating value={scheduled.satisfaction} size="md" /></div>
                    <div className="mt-1 text-[11px] uppercase tracking-wider text-brand-muted-on-dark">Note globale</div>
                  </div>
                )}
                {scheduled.participantFeedbacks !== undefined && (
                  <div className="rounded-xl border border-brand-border-dark bg-brand-dark/40 p-3">
                    <div className="text-2xl font-medium text-brand-cream">{scheduled.participantFeedbacks}</div>
                    <div className="text-[11px] uppercase tracking-wider text-brand-muted-on-dark">Avis reçus</div>
                  </div>
                )}
              </div>
            </Section>
          )}

          {status === "realise" && scheduled.participantComments && scheduled.participantComments.length > 0 && (
            <ParticipantCommentsSection comments={scheduled.participantComments} totalFeedbacks={scheduled.participantFeedbacks} />
          )}

          {status === "realise" && (
            <Section title="Votre feedback">
              {clientFeedback ? (
                <div className="rounded-xl border border-brand-green-bright/40 bg-brand-green-bright/[0.06] p-4">
                  <div className="flex items-center gap-2">
                    <StarRating value={clientFeedback.rating} size="md" />
                    <span className="text-sm font-medium text-brand-cream">{clientFeedback.rating}/5</span>
                  </div>
                  {clientFeedback.comment && <p className="mt-3 text-sm italic text-brand-muted-on-dark">« {clientFeedback.comment} »</p>}
                  <p className="mt-3 text-[11px] text-brand-muted-on-dark">Feedback envoyé à votre CSM.</p>
                </div>
              ) : showFeedbackForm ? (
                <form onSubmit={(e) => { e.preventDefault(); if (draftRating > 0) { onSubmitFeedback(draftRating, draftComment.trim()); setShowFeedbackForm(false); } }} className="rounded-xl border border-brand-green-bright/40 bg-brand-green-bright/[0.04] p-4">
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted-on-dark">Votre note</span>
                    <div className="mt-2 flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} type="button" onClick={() => setDraftRating(n)} aria-label={`${n} étoile${n > 1 ? "s" : ""}`} className={`text-3xl leading-none transition-colors ${n <= draftRating ? "text-brand-green-bright" : "text-brand-muted-on-dark/40 hover:text-brand-green-bright/60"}`}>★</button>
                      ))}
                      {draftRating > 0 && <span className="ml-2 text-sm text-brand-cream">{draftRating}/5</span>}
                    </div>
                  </label>
                  <label className="mt-4 block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted-on-dark">Commentaire <span className="font-normal opacity-70">(optionnel)</span></span>
                    <textarea value={draftComment} onChange={(e) => setDraftComment(e.target.value)} placeholder="Qu'est-ce qui a bien fonctionné ? Qu'amélioreriez-vous ?" rows={3} className="mt-2 w-full resize-none rounded-lg border border-brand-border-dark bg-brand-dark px-3 py-2 text-sm text-brand-cream placeholder:text-brand-muted-on-dark focus:border-brand-green-bright focus:outline-none" />
                  </label>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="submit" disabled={draftRating === 0} className="inline-flex items-center gap-1.5 rounded-full bg-brand-green-bright px-4 py-2 text-[13px] font-semibold text-brand-dark transition-colors hover:bg-brand-green-bright/90 disabled:cursor-not-allowed disabled:opacity-50">Envoyer mon feedback</button>
                    <button type="button" onClick={() => { setShowFeedbackForm(false); setDraftRating(0); setDraftComment(""); }} className="inline-flex items-center gap-1 rounded-full border border-brand-border-dark px-4 py-2 text-[13px] text-brand-cream hover:bg-brand-surface">Annuler</button>
                  </div>
                </form>
              ) : (
                <div className="rounded-xl border border-brand-green-bright/30 bg-brand-green-bright/[0.04] p-4">
                  <div className="flex items-start gap-3">
                    <span className="relative mt-1 flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green-bright opacity-70" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-green-bright" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-brand-cream">Votre CSM apprécierait votre retour.</p>
                      <p className="mt-1 text-[13px] text-brand-muted-on-dark">Comment s&apos;est passé cet atelier de votre point de vue ? Votre note nous aide à améliorer les prochaines interventions.</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setShowFeedbackForm(true)} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-green-bright px-4 py-2 text-[13px] font-semibold text-brand-dark transition-colors hover:bg-brand-green-bright/90">
                    Donner mon feedback <span aria-hidden>→</span>
                  </button>
                </div>
              )}
            </Section>
          )}

          {status === "upcoming" && <UpcomingCancellationNotice isoDate={scheduled.isoDate} />}

          {status === "annule" && (
            <Section title="Atelier annulé">
              <div className="rounded-xl border border-brand-salmon/30 bg-brand-salmon/[0.06] p-4">
                {scheduled.cancellationReason && <p className="text-sm leading-relaxed text-brand-cream">{scheduled.cancellationReason}</p>}
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-salmon/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-salmon"><span aria-hidden>⊖</span> Décompté de votre forfait</p>
              </div>
            </Section>
          )}

          {status === "upcoming" && scheduled.registrationLink && (
            <div className="mt-6 flex flex-wrap gap-2 border-t border-brand-border-dark pt-5">
              <a href={scheduled.registrationLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-brand-green-bright px-4 py-2 text-[12px] font-semibold text-brand-dark transition-colors hover:bg-brand-green-bright/90">
                Ouvrir Livestorm <span aria-hidden>↗</span>
              </a>
              <span className="self-center text-[11px] text-brand-muted-on-dark">Lien à diffuser à vos collaborateurs.</span>
            </div>
          )}

          <p className="mt-6 border-t border-brand-border-dark pt-4 text-[11px] text-brand-muted-on-dark">
            Vue lecture seule — pour annuler, reporter ou modifier l&apos;atelier, contactez votre Customer Success Manager.
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ icon, label, value, sub }: { icon: string; label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl border border-brand-border-dark bg-brand-dark/40 p-3.5">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-muted-on-dark">
        <span aria-hidden>{icon}</span>{label}
      </div>
      <div className="mt-1.5 text-sm text-brand-cream">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-brand-muted-on-dark">{sub}</div>}
    </div>
  );
}

function UpcomingCancellationNotice({ isoDate }: { isoDate: string }) {
  const daysLeft = daysUntilCancellationDeadline(isoDate);
  const canStill = daysLeft > 0;
  const deadline = cancellationDeadlineLabel(isoDate);
  return (
    <Section title="Annulation / report">
      {canStill ? (
        <div className="flex items-start gap-3 rounded-xl border border-brand-upcoming/30 bg-brand-upcoming/[0.05] p-4">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-upcoming/15 text-brand-upcoming" aria-hidden>⏱</span>
          <div>
            <p className="text-sm font-medium text-brand-cream">Encore {daysLeft} jour{daysLeft > 1 ? "s" : ""} pour annuler ou reporter cet atelier.</p>
            <p className="mt-1 text-[13px] text-brand-muted-on-dark">Date limite : <span className="text-brand-cream">{deadline}</span>.</p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-brand-salmon/40 bg-brand-salmon/[0.06] p-4">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-salmon/20 text-brand-salmon" aria-hidden>⛔</span>
          <div>
            <p className="text-sm font-medium text-brand-cream">Délai d&apos;annulation dépassé.</p>
            <p className="mt-1 text-[13px] text-brand-muted-on-dark">La date limite était le <span className="text-brand-cream">{deadline}</span>.</p>
          </div>
        </div>
      )}
    </Section>
  );
}

function ParticipantCommentsSection({ comments, totalFeedbacks }: { comments: { rating: number; text: string }[]; totalFeedbacks?: number }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? comments : comments.slice(0, 3);
  const hasMore = comments.length > 3;
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal-bright">Commentaires des participants</h3>
        <span className="text-[11px] text-brand-muted-on-dark">
          {comments.length} affiché{comments.length > 1 ? "s" : ""}{totalFeedbacks !== undefined && totalFeedbacks > comments.length && ` sur ${totalFeedbacks}`}
        </span>
      </div>
      <ul className="space-y-2.5">
        {visible.map((c, i) => (
          <li key={i} className="rounded-xl border border-brand-border-dark bg-brand-dark/40 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <StarRating value={c.rating} size="sm" />
              <span className="text-[10px] uppercase tracking-wider text-brand-muted-on-dark">Participant anonyme</span>
            </div>
            <p className="text-[13px] italic leading-relaxed text-brand-cream">« {c.text} »</p>
          </li>
        ))}
      </ul>
      {hasMore && (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-3 inline-flex items-center gap-1 text-[12px] text-brand-teal-bright hover:underline">
          {expanded ? "Réduire" : `Voir les ${comments.length - 3} commentaires restants`}
          <span aria-hidden>{expanded ? "↑" : "↓"}</span>
        </button>
      )}
      <p className="mt-2 text-[10px] italic text-brand-muted-on-dark/80">Commentaires anonymisés par teale.</p>
    </section>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal-bright">{title}</h3>
      {children}
    </section>
  );
}

function KitTile({ emoji, label }: { emoji: string; label: string }) {
  return (
    <button type="button" disabled title="Disponible dans la rubrique Kits de communication" className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-brand-border-dark bg-brand-dark/30 px-3 py-2.5 text-left text-[12px] opacity-80">
      <span aria-hidden>{emoji}</span>
      <span className="text-brand-cream">{label}</span>
    </button>
  );
}
