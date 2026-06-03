"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  type AnimationItem,
  type EmailTopicKit,
  type LancementKit,
  type VisuelKit,
  type VisuelCategory,
  VISUEL_CATEGORIES,
} from "./data";
import { useKitsStore } from "@/lib/kits-store";
import { openKitFile, kitFileLabel, getKitFileUrl } from "@/lib/storage";
import { useWorkshops, themes as workshopThemes, type Workshop } from "@/lib/workshops-store";

const workshopThemeNameById = Object.fromEntries(
  workshopThemes.map((t) => [t.id, t.name])
);

type WorkshopKitType = "invitation" | "relance" | "post";

const workshopKitLabels: Record<WorkshopKitType, string> = {
  invitation: "Email d'invitation",
  relance: "Email de relance",
  post: "Message post-atelier",
};

const workshopKitIcons: Record<WorkshopKitType, string> = {
  invitation: "📧",
  relance: "⏰",
  post: "💬",
};

type ThemeId = "lancement" | "animation" | "emails" | "kits-ateliers" | "visuels";

type Theme = {
  id: ThemeId;
  name: string;
  icon: string;
  description: string;
  count: number;
};

const stepLabels: Record<string, string> = {
  before: "Avant le lancement",
  dday: "Jour J",
  after: "Après le lancement",
};

const stepOrder = ["before", "dday", "after"];

const TODAY_MONTH = "May";

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

const _currentIdx = allMonths.indexOf(TODAY_MONTH);

type MonthStatus = "past" | "current" | "upcoming";

function monthStatus(month: string): MonthStatus {
  const idx = allMonths.indexOf(month);
  if (idx < _currentIdx) return "past";
  if (idx === _currentIdx) return "current";
  return "upcoming";
}

function cleanTitle(title: string): string {
  return title.replace(/^[^\p{L}\p{N}]+/u, "").trim();
}

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

type CommQuarterId = "Q1" | "Q2" | "Q3" | "Q4";

type CommQuarter = {
  id: CommQuarterId;
  months: string[];
};

const commQuarters: CommQuarter[] = [
  { id: "Q1", months: ["January", "February", "March"] },
  { id: "Q2", months: ["April", "May", "June"] },
  { id: "Q3", months: ["July", "August", "September"] },
  { id: "Q4", months: ["October", "November", "December"] },
];

const DEFAULT_QUARTER_ID: CommQuarterId = (() => {
  const idx = allMonths.indexOf(TODAY_MONTH);
  if (idx <= 2) return "Q1";
  if (idx <= 5) return "Q2";
  if (idx <= 8) return "Q3";
  return "Q4";
})();

function quarterStatus(q: CommQuarter): "past" | "current" | "upcoming" {
  if (monthStatus(q.months[q.months.length - 1]) === "past") return "past";
  if (monthStatus(q.months[0]) === "upcoming") return "upcoming";
  return "current";
}

function commQuarterProgress(q: CommQuarter): number {
  const qs = quarterStatus(q);
  if (qs === "past") return 100;
  if (qs === "upcoming") return 0;
  const todayIdx = allMonths.indexOf(TODAY_MONTH);
  const startIdx = allMonths.indexOf(q.months[0]);
  return Math.round((todayIdx - startIdx) * 33 + 15);
}

function typeStyle(t: string): string {
  if (t.toLowerCase().includes("let's talk")) return "bg-[#E6AA99]/15 text-[#E6AA99]";
  return "bg-brand-accent/15 text-brand-accent";
}

function topicLabel(topic: string): string {
  switch (topic) {
    case "ABILITY TO COPE":
      return "Capacité à faire face";
    case "WORK-LIFE BALANCE":
      return "Équilibre pro / perso";
    case "COHESION":
      return "Cohésion";
    case "STRESS MANAGEMENT":
      return "Gestion du stress";
    case "RECOGNITION":
      return "Reconnaissance";
    case "EMOTION REGULATION":
      return "Régulation des émotions";
    case "VALUE ALIGNMENT":
      return "Alignement des valeurs";
    case "PHYSICAL WELL-BEING AND STRESS":
      return "Bien-être physique";
    default:
      return topic;
  }
}

type ActiveCard =
  | { kind: "lancement"; data: LancementKit }
  | { kind: "animation"; data: AnimationItem }
  | { kind: "email"; data: EmailTopicKit }
  | { kind: "visuel"; data: VisuelKit }
  | {
      kind: "workshop-kit";
      workshop: Workshop;
      kitType: WorkshopKitType;
      language: "FR" | "EN";
    };

export default function KitsCommunicationPage() {
  const { lancementKits, animationItems, emailTopicKits, visuelKits } = useKitsStore();
  const { workshops } = useWorkshops();

  const [search, setSearch] = useState("");
  const [activeTheme, setActiveTheme] = useState<ThemeId>("animation");
  const [activeLanguage, setActiveLanguage] = useState<"FR" | "EN">("FR");
  const [activeCard, setActiveCard] = useState<ActiveCard | null>(null);

  const lower = search.trim().toLowerCase();

  const themes = useMemo<Theme[]>(
    () => [
      {
        id: "animation",
        name: "Temps forts mensuels",
        icon: "📅",
        description:
          "Le calendrier des Let's Talks, playlists et nouveautés à relayer auprès de vos collaborateurs.",
        count: animationItems.length,
      },
      {
        id: "kits-ateliers",
        name: "Kits par atelier",
        icon: "🎓",
        description:
          "Pour chaque atelier collectif : email d'invitation, relance et message post-atelier.",
        count: workshops.length,
      },
      {
        id: "emails",
        name: "Emails par thématique",
        icon: "💌",
        description:
          "Modèles d'emails de réengagement, classés par thématique de santé mentale.",
        count: emailTopicKits.length,
      },
      {
        id: "lancement",
        name: "Kit de lancement",
        icon: "🚀",
        description:
          "Tous les contenus prêts à l'emploi pour l'annonce et l'activation de teale auprès de vos équipes.",
        count: lancementKits.length,
      },
      {
        id: "visuels",
        name: "Visuels & icônes",
        icon: "🎨",
        description:
          "Logos teale, icônes, pictos et bannières — téléchargez-les pour vos communications internes.",
        count: visuelKits.length,
      },
    ],
    [
      animationItems.length,
      workshops.length,
      emailTopicKits.length,
      lancementKits.length,
      visuelKits.length,
    ]
  );

  const filteredLancement = useMemo(
    () =>
      lancementKits.filter(
        (k) =>
          (!lower ||
            k.title.toLowerCase().includes(lower) ||
            stepLabels[k.step].toLowerCase().includes(lower)) &&
          activeTheme === "lancement" &&
          k.language === activeLanguage
      ),
    [lower, activeTheme, activeLanguage, lancementKits]
  );

  const filteredAnimation = useMemo(
    () =>
      animationItems.filter(
        (a) =>
          (!lower ||
            a.title.toLowerCase().includes(lower) ||
            a.month.toLowerCase().includes(lower) ||
            a.type.toLowerCase().includes(lower)) &&
          activeTheme === "animation" &&
          a.languages.includes(activeLanguage)
      ),
    [lower, activeTheme, activeLanguage, animationItems]
  );

  const filteredEmails = useMemo(
    () =>
      emailTopicKits.filter(
        (e) =>
          (!lower ||
            e.title.toLowerCase().includes(lower) ||
            topicLabel(e.topic).toLowerCase().includes(lower)) &&
          activeTheme === "emails" &&
          e.language === activeLanguage
      ),
    [lower, activeTheme, activeLanguage, emailTopicKits]
  );

  const filteredWorkshops = useMemo(
    () =>
      activeTheme !== "kits-ateliers"
        ? []
        : workshops.filter(
            (w) =>
              !lower ||
              w.title.toLowerCase().includes(lower) ||
              (workshopThemeNameById[w.themeId]?.toLowerCase().includes(lower) ??
                false)
          ),
    [lower, activeTheme, workshops]
  );

  // Visuels are language-agnostic (logos, icônes), so the language filter
  // doesn't apply — only the search query and the active tab matter here.
  const filteredVisuels = useMemo(
    () =>
      activeTheme !== "visuels"
        ? []
        : visuelKits.filter(
            (v) =>
              !lower ||
              v.title.toLowerCase().includes(lower) ||
              v.category.toLowerCase().includes(lower)
          ),
    [lower, activeTheme, visuelKits]
  );

  const totalVisible =
    filteredLancement.length +
    filteredAnimation.length +
    filteredEmails.length +
    filteredWorkshops.length +
    filteredVisuels.length;
  const hasActiveFilters =
    !!lower || activeTheme !== "animation" || activeLanguage !== "FR";
  const resetFilters = () => {
    setSearch("");
    setActiveTheme("animation");
    setActiveLanguage("FR");
  };

  const showLancement = activeTheme === "lancement";
  const showAnimation = activeTheme === "animation";
  const showEmails = activeTheme === "emails";
  const showWorkshopKits = activeTheme === "kits-ateliers";
  const showVisuels = activeTheme === "visuels";

  const totalKits =
    animationItems.length +
    emailTopicKits.length +
    lancementKits.length +
    workshops.length +
    visuelKits.length;
  const newInMay = animationItems.filter(
    (a) => a.month === TODAY_MONTH
  ).length;

  return (
    <div className="px-9 py-8">
      <div className="mx-auto max-w-[1280px]">
        <header className="mb-9 grid items-end gap-10 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[2.5px] text-[#5eead4]">
              Espace client
            </p>
            <h1 className="mt-3 text-[28px] font-semibold tracking-[-0.5px] text-brand-cream">
              Kits de communication
            </h1>
            <p className="text-[13px] leading-relaxed text-[#94a8a0]">
              Bibliothèque partagée par votre CSM Teale. Téléchargez ou copiez les ressources en un clic.
            </p>
          </div>
          <div className="flex gap-3">
            <StatPill value={totalKits} label="Kits disponibles" accent />
            <StatPill value={newInMay} label="Nouveaux en mai" />
          </div>
        </header>

        <div className="rounded-3xl border border-brand-border-dark bg-brand-surface p-5 sm:p-6">
          <div className="flex items-center gap-3 rounded-full bg-brand-dark px-5 py-3">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-brand-muted-on-dark"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un kit, une thématique, un mois…"
              className="flex-1 bg-transparent text-sm text-brand-cream placeholder:text-brand-muted-on-dark focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Effacer la recherche"
                className="grid h-6 w-6 place-items-center rounded-full text-brand-muted-on-dark hover:text-brand-cream"
              >
                ×
              </button>
            )}
          </div>
          <div className="mt-4 space-y-3">
            <FilterLine label="Vue">
              {themes.map((t) => (
                <PillFilter
                  key={t.id}
                  selected={activeTheme === t.id}
                  onClick={() => setActiveTheme(t.id)}
                  count={t.count}
                >
                  <span className="mr-1.5">{t.icon}</span>
                  {t.name}
                </PillFilter>
              ))}
            </FilterLine>
            {/* Visuels n'ont pas de variante FR/EN — masquer le filtre */}
            {activeTheme !== "visuels" && (
              <FilterLine label="Langue">
                <PillFilter
                  selected={activeLanguage === "FR"}
                  onClick={() => setActiveLanguage("FR")}
                >
                  🇫🇷 Français
                </PillFilter>
                <PillFilter
                  selected={activeLanguage === "EN"}
                  onClick={() => setActiveLanguage("EN")}
                >
                  🇬🇧 English
                </PillFilter>
              </FilterLine>
            )}
          </div>
        </div>

        <div className="mt-5 mb-6 flex items-center justify-between gap-3 text-[13px] text-brand-muted-on-dark">
          <span>
            {totalVisible === 0
              ? "Aucun résultat"
              : `${totalVisible} kit${totalVisible > 1 ? "s" : ""} affiché${totalVisible > 1 ? "s" : ""}`}
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-brand-teal-bright transition-colors hover:underline"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>

        {totalVisible === 0 ? (
          <EmptyState onReset={resetFilters} query={search} />
        ) : (
          <div className="space-y-12">
            {showAnimation && filteredAnimation.length > 0 && (
              <AnimationSection
                items={filteredAnimation}
                onOpen={(a) => setActiveCard({ kind: "animation", data: a })}
              />
            )}
            {showWorkshopKits && filteredWorkshops.length > 0 && (
              <WorkshopKitsSection
                workshops={filteredWorkshops}
                onOpenKit={(w, kitType) =>
                  setActiveCard({
                    kind: "workshop-kit",
                    workshop: w,
                    kitType,
                    language: activeLanguage,
                  })
                }
              />
            )}
            {showEmails && filteredEmails.length > 0 && (
              <EmailsSection
                items={filteredEmails}
                onOpen={(e) => setActiveCard({ kind: "email", data: e })}
              />
            )}
            {showLancement && filteredLancement.length > 0 && (
              <LancementSection
                items={filteredLancement}
                onOpen={(k) => setActiveCard({ kind: "lancement", data: k })}
              />
            )}
            {showVisuels && filteredVisuels.length > 0 && (
              <VisuelsSection
                items={filteredVisuels}
                onOpen={(v) => setActiveCard({ kind: "visuel", data: v })}
              />
            )}
          </div>
        )}
      </div>

      {activeCard && (
        <KitModal active={activeCard} onClose={() => setActiveCard(null)} />
      )}
    </div>
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
    <div className="min-w-[120px] rounded-2xl border border-brand-border-dark bg-brand-surface px-4 py-3.5">
      <div
        className={`text-3xl font-medium leading-none ${accent ? "text-brand-green-bright" : "text-brand-cream"}`}
      >
        {value}
      </div>
      <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-brand-muted-on-dark">
        {label}
      </div>
    </div>
  );
}

function FilterLine({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="w-14 shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-muted-on-dark">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function PillFilter({
  selected,
  onClick,
  count,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  count?: number;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] transition-colors ${
        selected
          ? "border-brand-green-bright/50 bg-brand-green-bright/15 text-brand-green-bright"
          : "border-brand-border-dark text-brand-cream hover:bg-brand-surface"
      }`}
    >
      {children}
      {count !== undefined && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[11px] ${
            selected
              ? "bg-brand-green-bright/25 text-brand-green-bright"
              : "bg-white/5 text-brand-muted-on-dark"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}


function LancementSection({
  items,
  onOpen,
}: {
  items: LancementKit[];
  onOpen: (k: LancementKit) => void;
}) {
  const grouped: Record<string, LancementKit[]> = {};
  for (const k of items) {
    (grouped[k.step] ||= []).push(k);
  }

  return (
    <section>
      <SectionTitle
        icon="🚀"
        title="Lancement"
        description="Tous les contenus pour réussir l'annonce et l'activation de teale."
      />
      <div className="space-y-6">
        {stepOrder.map((step) => {
          const stepItems = grouped[step];
          if (!stepItems || stepItems.length === 0) return null;
          return (
            <div key={step}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-muted-on-dark">
                {stepLabels[step]}
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {stepItems.map((k) => (
                  <TextKitCard
                    key={k.id}
                    title={k.title}
                    chip={k.language}
                    chipStyle="bg-brand-cream/10 text-brand-cream"
                    onOpen={() => onOpen(k)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AnimationSection({
  items,
  onOpen,
}: {
  items: AnimationItem[];
  onOpen: (it: AnimationItem) => void;
}) {
  const [activeQId, setActiveQId] = useState<CommQuarterId>(DEFAULT_QUARTER_ID);

  const quarter = commQuarters.find((q) => q.id === activeQId)!;

  const quarterItems = items.filter((i) => quarter.months.includes(i.month));
  const upcomingCount = quarterItems.filter((i) => monthStatus(i.month) !== "past").length;

  const nextItem = useMemo<AnimationItem | null>(() => {
    for (const month of quarter.months) {
      if (monthStatus(month) !== "past") {
        const found = items.find((i) => i.month === month);
        if (found) return found;
      }
    }
    return null;
  }, [items, quarter]);

  return (
    <section>
      <header className="mb-5">
        <h2 className="flex items-center gap-3 text-2xl font-medium tracking-tight text-brand-cream">
          <span aria-hidden>📅</span>
          Calendrier annuel
        </h2>
        <p className="mt-1.5 ml-1 text-sm text-brand-muted-on-dark">
          Cliquez sur un trimestre pour voir les communications associées.
        </p>
      </header>

      <div className="mb-7 grid grid-cols-4 gap-[10px]">
        {commQuarters.map((q) => (
          <QuarterTabComm
            key={q.id}
            quarter={q}
            isActive={q.id === activeQId}
            onClick={() => setActiveQId(q.id)}
          />
        ))}
      </div>

      <div className="mb-[18px] flex items-baseline justify-between">
        <div className="text-[14px] font-semibold tracking-[0.3px] text-[#e8f5ef]">
          Communications du trimestre{" "}
          <span className="text-[#5eead4]">·</span>{" "}
          <span className="font-medium text-[#94a8a0]">
            {quarter.months.map((m) => monthLabel[m] ?? m).join(" · ")} 2026
          </span>
        </div>
        <div className="text-[11px] uppercase tracking-[0.5px] text-[#6b7c75]">
          {quarterItems.length} kit{quarterItems.length > 1 ? "s" : ""} · {upcomingCount} à venir
        </div>
      </div>

      <div className="grid grid-cols-3 gap-[14px]">
        {quarter.months.map((month) => (
          <MonthColumnComm
            key={month}
            month={month}
            items={items.filter((i) => i.month === month)}
            nextItem={nextItem}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  );
}

function QuarterTabComm({
  quarter,
  isActive,
  onClick,
}: {
  quarter: CommQuarter;
  isActive: boolean;
  onClick: () => void;
}) {
  const status = quarterStatus(quarter);
  const progress = commQuarterProgress(quarter);
  const monthAbbrs = quarter.months
    .map((m) => (monthLabel[m] ?? m).slice(0, 3))
    .join(" · ");

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[11px] border p-[14px_16px] text-left transition-all ${
        status === "past"
          ? "border-transparent opacity-50 hover:opacity-80"
          : isActive
            ? "border-[rgba(94,234,212,0.3)] bg-[rgba(94,234,212,0.07)] shadow-[0_0_0_1px_rgba(94,234,212,0.15),0_8px_28px_-10px_rgba(94,234,212,0.5)]"
            : "border-transparent hover:bg-white/[0.03]"
      }`}
    >
      <div className="mb-[10px] flex items-center justify-between gap-2">
        <span
          className={`text-[11px] font-bold tracking-[0.6px] ${
            isActive ? "text-[#5eead4]" : "text-[#94a8a0]"
          }`}
        >
          {monthAbbrs}
        </span>
        <span
          className={`text-[9px] uppercase tracking-[0.5px] ${
            isActive
              ? "rounded-[4px] bg-[#5eead4] px-[7px] py-[3px] font-bold text-[#042f2a]"
              : "text-[#6b7c75]"
          }`}
        >
          {status === "past" ? "Passé" : status === "current" ? "Maintenant" : "À venir"}
        </span>
      </div>
      <div className="h-[3px] overflow-hidden rounded-[2px] bg-white/[0.05]">
        <div
          className={`h-full rounded-[2px] ${
            status === "past"
              ? "bg-[rgba(148,168,160,0.4)]"
              : "bg-gradient-to-r from-[#5eead4] to-[#2dd4bf]"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </button>
  );
}

function MonthColumnComm({
  month,
  items,
  nextItem,
  onOpen,
}: {
  month: string;
  items: AnimationItem[];
  nextItem: AnimationItem | null;
  onOpen: (it: AnimationItem) => void;
}) {
  const status = monthStatus(month);
  const doneCount = items.filter((i) => monthStatus(i.month) === "past").length;
  const upcomingCount = items.length - doneCount;

  return (
    <div
      className={`rounded-[13px] border p-[18px] transition-colors ${
        status === "current"
          ? "border-[rgba(94,234,212,0.15)] bg-[rgba(94,234,212,0.035)]"
          : "border-white/[0.04] bg-white/[0.012]"
      }`}
    >
      <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-[9px]">
          <h4
            className={`text-[12px] font-bold uppercase tracking-[1.8px] ${
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
          {items.length === 0
            ? "—"
            : doneCount > 0 && upcomingCount === 0
              ? `${doneCount} fait${doneCount > 1 ? "s" : ""}`
              : upcomingCount > 0
                ? `${upcomingCount} à venir`
                : "—"}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="py-5 text-center text-[11px] italic text-[#6b7c75]">
          Pas de communication programmée.
        </p>
      ) : (
        <ul className="space-y-0">
          {items.map((item) => (
            <CommEventRow
              key={item.id}
              item={item}
              isNext={item === nextItem}
              onOpen={() => onOpen(item)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CommEventRow({
  item,
  isNext,
  onOpen,
}: {
  item: AnimationItem;
  isNext: boolean;
  onOpen: () => void;
}) {
  const isDone = monthStatus(item.month) === "past";
  const isLetsTalk = item.type === "Let's talk";

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
        className={`group mb-2.5 flex w-full gap-2.5 rounded-[10px] border p-3 text-left transition-all ${
          isDone
            ? "border-transparent opacity-[0.38] hover:opacity-70"
            : isNext
              ? "border-[rgba(94,234,212,0.18)] bg-[rgba(94,234,212,0.05)]"
              : "border-transparent hover:border-white/5 hover:bg-white/[0.025]"
        }`}
      >
        <div className="w-9 shrink-0 pt-0.5 text-center text-xl leading-none">
          {isLetsTalk ? "📺" : "🎵"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-1.5">
            <span
              className={`rounded-[4px] px-[7px] py-[3px] text-[9px] font-bold tracking-[0.5px] ${
                isLetsTalk
                  ? "bg-[rgba(244,168,154,0.2)] text-[#f4a89a]"
                  : "bg-[rgba(94,234,212,0.15)] text-[#5eead4]"
              }`}
            >
              {isLetsTalk ? "LET'S TALK" : "PLAYLIST"}
            </span>
            <span
              className={`ml-auto flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full text-[9px] ${
                isDone
                  ? "bg-[rgba(94,234,212,0.2)] text-[#5eead4]"
                  : "border-[1.5px] border-white/15"
              }`}
              aria-hidden
            >
              {isDone ? "✓" : ""}
            </span>
          </div>
          <div
            className={`mb-1 text-[13px] font-medium leading-snug ${
              isDone ? "text-[#6b7c75] line-through" : "text-[#e8f5ef]"
            }`}
          >
            {cleanTitle(item.title)}
          </div>
          <div className="text-[10px] text-[#6b7c75]">
            {item.languages.map((l) => (l === "FR" ? "🇫🇷" : "🇬🇧")).join(" ")}
            {item.languages.length === 2 && " · FR / EN"}
          </div>
        </div>
      </button>
    </li>
  );
}

function EmailsSection({
  items,
  onOpen,
}: {
  items: EmailTopicKit[];
  onOpen: (e: EmailTopicKit) => void;
}) {
  const grouped: Record<string, EmailTopicKit[]> = {};
  for (const k of items) {
    (grouped[k.topic] ||= []).push(k);
  }

  return (
    <section>
      <SectionTitle
        icon="💌"
        title="Emails par thématique"
        description="Modèles d'emails classés par thématique de santé mentale, à envoyer pour réengager vos équipes."
      />
      <div className="space-y-6">
        {Object.entries(grouped).map(([topic, topicItems]) => (
          <div key={topic}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-muted-on-dark">
              {topicLabel(topic)}
            </h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {topicItems.map((k) => (
                <TextKitCard
                  key={k.id}
                  title={k.title}
                  chip={k.language}
                  chipStyle="bg-brand-cream/10 text-brand-cream"
                  onOpen={() => onOpen(k)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Visuels & icônes — galerie groupée par catégorie ────────────────────────
// Client view: vignettes (signed preview URL), titre, bouton télécharger.
// Le client n'a aucun bouton d'édition — c'est géré uniquement côté CSM.
function VisuelsSection({
  items,
  onOpen,
}: {
  items: VisuelKit[];
  onOpen: (v: VisuelKit) => void;
}) {
  const grouped: Record<VisuelCategory, VisuelKit[]> = {
    logo: [], icone: [], picto: [], banniere: [],
  };
  for (const v of items) grouped[v.category].push(v);

  return (
    <section>
      <SectionTitle
        icon="🎨"
        title="Visuels & icônes teale"
        description="Logos, icônes, pictos et bannières — cliquez sur une vignette pour télécharger le fichier source."
      />
      <div className="space-y-8">
        {VISUEL_CATEGORIES.map((cat) => {
          const list = grouped[cat.id];
          if (list.length === 0) return null;
          return (
            <div key={cat.id}>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-muted-on-dark">
                <span aria-hidden>{cat.icon}</span>
                {cat.label}
                <span className="text-brand-muted-on-dark/60">({list.length})</span>
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {list.map((v) => (
                  <VisuelCard key={v.id} item={v} onOpen={() => onOpen(v)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function VisuelCard({ item, onOpen }: { item: VisuelKit; onOpen: () => void }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // The preview is fetched once per mount via a 1 h signed URL. Stale URLs
  // are harmless: clicking the card always re-issues a fresh signed URL
  // through openKitFile (so old tabs in a downloaded preview keep working).
  useEffect(() => {
    let alive = true;
    void getKitFileUrl(item.path).then((u) => {
      if (alive) setPreviewUrl(u);
    });
    return () => { alive = false; };
  }, [item.path]);
  const isImage = item.mimeType.startsWith("image/");
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-xl border border-brand-border-dark bg-brand-surface text-left transition-colors hover:border-brand-accent/40"
    >
      <div className="relative grid aspect-square w-full place-items-center bg-brand-dark/40">
        {isImage && previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={item.title}
            className="h-full w-full object-contain p-3"
            loading="lazy"
          />
        ) : (
          <span className="text-3xl opacity-60" aria-hidden>📄</span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-brand-cream">
          {item.title}
        </span>
        <span className="shrink-0 text-brand-accent transition-transform group-hover:translate-x-0.5" aria-hidden>↓</span>
      </div>
    </button>
  );
}

function TextKitCard({
  title,
  chip,
  chipStyle,
  onOpen,
}: {
  title: string;
  chip: string;
  chipStyle: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-full flex-col justify-between rounded-xl border border-transparent bg-brand-surface p-4 text-left transition-colors hover:border-brand-accent/40"
    >
      <div>
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${chipStyle}`}
        >
          {chip}
        </span>
        <h4 className="mt-2 text-sm font-medium leading-snug text-brand-cream">
          {title}
        </h4>
      </div>
      <span className="mt-3 inline-flex items-center gap-1 text-xs text-brand-accent transition-transform group-hover:translate-x-0.5">
        Aperçu & téléchargement
        <span aria-hidden>→</span>
      </span>
    </button>
  );
}

function SectionTitle({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-5">
      <h2 className="flex items-center gap-2 text-xl font-medium text-brand-cream">
        <span aria-hidden>{icon}</span>
        {title}
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-brand-muted-on-dark">
        {description}
      </p>
    </header>
  );
}

function EmptyState({
  onReset,
  query,
}: {
  onReset: () => void;
  query: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-brand-border-dark bg-brand-surface/30 px-6 py-16 text-center">
      <p className="text-base font-medium text-brand-cream">
        {query.trim()
          ? `Aucun kit ne correspond à « ${query.trim()} »`
          : "Aucun kit pour ces filtres"}
      </p>
      <p className="mt-2 text-sm text-brand-muted-on-dark">
        Essayez d&apos;élargir votre recherche ou de changer de thématique.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-5 rounded-full border border-brand-accent/50 px-4 py-1.5 text-xs font-medium text-brand-accent transition-colors hover:bg-brand-accent hover:text-brand-dark"
      >
        Réinitialiser
      </button>
    </div>
  );
}

function CopyIcon() {
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
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12 10 17 19 7" />
    </svg>
  );
}

function ImageIcon() {
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
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}

function PdfIcon() {
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
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function WorkshopKitsSection({
  workshops: items,
  onOpenKit,
}: {
  workshops: Workshop[];
  onOpenKit: (w: Workshop, kit: WorkshopKitType) => void;
}) {
  const grouped: Record<string, Workshop[]> = {};
  for (const w of items) {
    (grouped[w.themeId] ||= []).push(w);
  }

  return (
    <section>
      <SectionTitle
        icon="🎓"
        title="Kits par atelier collectif"
        description="Pour chaque atelier proposé : email d'invitation, relance et message post-atelier prêts à diffuser."
      />
      <div className="space-y-6">
        {workshopThemes.map((theme) => {
          const themeWorkshops = grouped[theme.id];
          if (!themeWorkshops || themeWorkshops.length === 0) return null;
          return (
            <div key={theme.id}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-muted-on-dark">
                {theme.name}
              </h3>
              <div className="space-y-2">
                {themeWorkshops.map((w) => (
                  <WorkshopKitRow
                    key={w.id}
                    workshop={w}
                    onOpenKit={(kit) => onOpenKit(w, kit)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function WorkshopKitRow({
  workshop,
  onOpenKit,
}: {
  workshop: Workshop;
  onOpenKit: (kit: WorkshopKitType) => void;
}) {
  const kitTypes: WorkshopKitType[] = ["invitation", "relance", "post"];
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-brand-border-dark bg-brand-surface p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h4 className="text-sm font-medium leading-snug text-brand-cream">
          {workshop.title}
        </h4>
        {workshop.subtitle && (
          <p className="mt-0.5 text-[11px] uppercase tracking-wider text-brand-muted-on-dark">
            {workshop.subtitle}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {kitTypes.map((kit) => (
          <button
            key={kit}
            type="button"
            onClick={() => onOpenKit(kit)}
            className="inline-flex items-center gap-1.5 rounded-full border border-brand-accent/40 px-3 py-1 text-[11px] font-medium text-brand-accent transition-colors hover:bg-brand-accent hover:text-brand-dark"
          >
            <span aria-hidden>{workshopKitIcons[kit]}</span>
            {workshopKitLabels[kit]}
          </button>
        ))}
      </div>
    </div>
  );
}

function KitModal({
  active,
  onClose,
}: {
  active: ActiveCard;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-6 backdrop-blur-sm sm:p-10"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-brand-border-dark bg-brand-surface p-7 sm:p-8"
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

        {active.kind === "lancement" && (
          <TextKitModalBody
            chips={[
              { label: stepLabels[active.data.step], style: "bg-brand-accent/15 text-brand-accent" },
              { label: active.data.language, style: "bg-brand-cream/10 text-brand-cream" },
            ]}
            title={active.data.title}
            body={active.data.body?.trim() || defaultLancementTemplate(active.data)}
            copied={copied}
            setCopied={setCopied}
          />
        )}

        {active.kind === "email" && (
          <TextKitModalBody
            chips={[
              { label: topicLabel(active.data.topic), style: "bg-brand-accent/15 text-brand-accent" },
              { label: active.data.language, style: "bg-brand-cream/10 text-brand-cream" },
            ]}
            title={active.data.title}
            body={active.data.body?.trim() || defaultEmailTemplate(active.data)}
            copied={copied}
            setCopied={setCopied}
          />
        )}

        {active.kind === "workshop-kit" && (
          <TextKitModalBody
            chips={[
              {
                label: workshopKitLabels[active.kitType],
                style: "bg-brand-accent/15 text-brand-accent",
              },
              {
                label:
                  workshopThemeNameById[active.workshop.themeId] ?? "Atelier",
                style: "bg-brand-cream/10 text-brand-cream",
              },
              {
                label: active.language,
                style: "bg-brand-cream/10 text-brand-cream",
              },
            ]}
            title={active.workshop.title}
            body={defaultWorkshopKitTemplate(
              active.workshop,
              active.kitType,
              active.language
            )}
            copied={false}
            setCopied={() => {}}
          />
        )}

        {active.kind === "animation" && (
          <AnimationModalBody item={active.data} />
        )}

        {active.kind === "visuel" && (
          <VisuelModalBody item={active.data} />
        )}
      </div>
    </div>
  );
}

function VisuelModalBody({ item }: { item: VisuelKit }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void getKitFileUrl(item.path).then((u) => { if (alive) setPreviewUrl(u); });
    return () => { alive = false; };
  }, [item.path]);
  const isImage = item.mimeType.startsWith("image/");
  const categoryLabel =
    VISUEL_CATEGORIES.find((c) => c.id === item.category)?.label ?? item.category;
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 pr-12">
        <span className="rounded-full bg-brand-accent/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand-accent">
          {categoryLabel}
        </span>
        <span className="rounded-full bg-brand-cream/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand-cream">
          {kitFileLabel(item.path) || item.path}
        </span>
      </div>
      <h2 className="mt-3 text-2xl font-medium tracking-tight text-brand-cream">
        {item.title}
      </h2>

      <div className="mt-5 grid aspect-video w-full place-items-center overflow-hidden rounded-xl border border-brand-border-dark bg-brand-dark/40">
        {isImage && previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt={item.title} className="max-h-full max-w-full object-contain p-4" />
        ) : (
          <span className="text-4xl opacity-60" aria-hidden>📄</span>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-brand-border-dark pt-5">
        <button
          type="button"
          onClick={() => void openKitFile(item.path, kitFileLabel(item.path) || item.title)}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-accent px-4 py-2 text-xs font-medium text-brand-dark transition-colors hover:bg-brand-accent/90"
        >
          <DownloadIcon /> Télécharger
        </button>
      </div>
    </>
  );
}

function TextKitModalBody({
  chips,
  title,
  body,
  copied,
  setCopied,
}: {
  chips: { label: string; style: string }[];
  title: string;
  body: string;
  copied: boolean;
  setCopied: (v: boolean) => void;
}) {
  const copy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(body).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 pr-12">
        {chips.map((c, i) => (
          <span
            key={i}
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${c.style}`}
          >
            {c.label}
          </span>
        ))}
      </div>
      <h2 className="mt-3 text-2xl font-medium tracking-tight text-brand-cream">
        {title}
      </h2>

      <h3 className="mt-6 mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
        Aperçu du contenu
      </h3>
      <div className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg border border-brand-border-dark bg-brand-dark/40 p-4 text-sm leading-relaxed text-brand-cream">
        {body}
      </div>
      <p className="mt-2 text-[11px] text-brand-muted-on-dark">
        Aperçu indicatif — adaptez les variables (prénoms, dates, liens) avant
        envoi.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-brand-border-dark pt-5">
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-accent px-4 py-2 text-xs font-medium text-brand-dark transition-colors hover:bg-brand-accent/90"
        >
          {copied ? (
            <>
              <CheckIcon /> Copié dans le presse-papier
            </>
          ) : (
            <>
              <CopyIcon /> Copier le texte
            </>
          )}
        </button>
      </div>
    </>
  );
}

function AnimationModalBody({ item }: { item: AnimationItem }) {
  const isCurrent = item.status.includes("Current");
  const isUpcoming = item.status.includes("Upcoming");
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 pr-12">
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${typeStyle(item.type)}`}
        >
          {item.type}
        </span>
        <span className="rounded-full bg-brand-cream/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand-cream">
          {monthLabel[item.month] ?? item.month}
        </span>
        {item.languages.map((l) => (
          <span
            key={l}
            className="rounded-full bg-brand-cream/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand-cream"
          >
            {l}
          </span>
        ))}
        {isCurrent && (
          <span className="rounded-full bg-brand-accent/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand-accent">
            En ce moment
          </span>
        )}
        {isUpcoming && (
          <span className="rounded-full bg-brand-highlight/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand-highlight">
            À venir
          </span>
        )}
      </div>
      <h2 className="mt-3 text-2xl font-medium tracking-tight text-brand-cream">
        {item.title}
      </h2>

      {item.landing && (
        <a
          href={item.landing}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-brand-border-dark bg-brand-dark/40 px-4 py-2.5 text-sm text-brand-cream transition-colors hover:border-brand-accent/50 hover:bg-brand-dark/70"
        >
          <LinkIcon />
          Voir la landing page
          <span className="text-[11px] text-brand-muted-on-dark">
            ({new URL(item.landing).host})
          </span>
        </a>
      )}

      {item.body?.trim() && <CopyableTextBlock body={item.body.trim()} />}

      <div className="mt-6 space-y-5">
        <ResourceGroup
          title="Visuels FR"
          flag="🇫🇷"
          files={item.imagesFr}
          kind="image"
        />
        <ResourceGroup
          title="Visuels EN"
          flag="🇬🇧"
          files={item.imagesEn}
          kind="image"
        />
        <ResourceGroup
          title="PDF FR"
          flag="🇫🇷"
          files={item.pdfFr}
          kind="pdf"
        />
        <ResourceGroup
          title="PDF EN"
          flag="🇬🇧"
          files={item.pdfEn}
          kind="pdf"
        />
      </div>

      <p className="mt-6 border-t border-brand-border-dark pt-4 text-[11px] text-brand-muted-on-dark">
        Les fichiers sources sont hébergés dans Notion. La connexion à
        l&apos;export téléchargeable arrive prochainement — pour l&apos;instant
        les boutons listent les ressources disponibles.
      </p>
    </>
  );
}

function ResourceGroup({
  title,
  flag,
  files,
  kind,
}: {
  title: string;
  flag: string;
  files: string[];
  kind: "image" | "pdf";
}) {
  if (files.length === 0) return null;
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
        <span aria-hidden>{flag}</span> {title}
        <span className="text-brand-muted-on-dark">({files.length})</span>
      </h3>
      <ul className="space-y-1.5">
        {files.map((name, i) => (
          <li
            key={i}
            className="flex items-center gap-3 rounded-lg border border-brand-border-dark bg-brand-dark/30 px-3 py-2"
          >
            <span className="text-brand-muted-on-dark">
              {kind === "image" ? <ImageIcon /> : <PdfIcon />}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-brand-cream">
              {kitFileLabel(name) || name}
            </span>
            <button
              type="button"
              onClick={() => void openKitFile(name, kitFileLabel(name) || name)}
              disabled={!name.includes("/")}
              title={name.includes("/") ? "Télécharger" : "Fichier hérité (re-uploader depuis le catalogue)"}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brand-accent/40 px-3 py-1 text-[11px] font-medium text-brand-accent transition-colors hover:bg-brand-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <DownloadIcon /> Télécharger
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function defaultWorkshopKitTemplate(
  w: Workshop,
  kit: WorkshopKitType,
  lang: "FR" | "EN"
): string {
  const t = w.title;
  if (lang === "EN") {
    if (kit === "invitation") {
      return [
        `Subject: Join the workshop "${t}"`,
        "",
        "Hi {{first_name}},",
        "",
        `We're hosting a teale workshop: "${t}". It's a live session with a teale psychologist where you'll get practical tools you can apply right away.`,
        "",
        "• Format: live, 1 hour",
        "• Open to all — no preparation needed",
        "• Confidential",
        "",
        "Register here: {{registration_link}}",
        "",
        "Looking forward to seeing you there,",
        "The HR team",
      ].join("\n");
    }
    if (kit === "relance") {
      return [
        `Subject: 3 days to go — "${t}"`,
        "",
        "Hi {{first_name}},",
        "",
        `Just a quick reminder — the teale workshop "${t}" is in 3 days. If you haven't booked your spot yet:`,
        "",
        "{{registration_link}}",
        "",
        "It's open to everyone, regardless of your role or experience.",
        "",
        "See you there,",
        "The HR team",
      ].join("\n");
    }
    return [
      `Subject: Thanks for joining "${t}"`,
      "",
      "Hi {{first_name}},",
      "",
      `Thanks for taking part in the teale workshop "${t}".`,
      "",
      "Continue what you started:",
      "• The workshop exercises are now available in your teale app",
      "• Book a 1:1 with a teale psychologist if you'd like to go deeper",
      "• Share what you learned with your team",
      "",
      "Open teale: {{teale_link}}",
      "",
      "Take care,",
      "The HR team",
    ].join("\n");
  }

  if (kit === "invitation") {
    return [
      `Objet : Atelier teale « ${t} » — inscrivez-vous`,
      "",
      "Bonjour {{prénom}},",
      "",
      `Nous organisons un atelier collectif teale : « ${t} ». C'est une session animée par un·e psychologue teale avec des outils concrets, applicables dès le lendemain.`,
      "",
      "• Format : live, 1 heure",
      "• Ouvert à tous — pas de prérequis",
      "• Confidentiel",
      "",
      "Inscription : {{lien_inscription}}",
      "",
      "À très vite,",
      "L'équipe RH",
    ].join("\n");
  }
  if (kit === "relance") {
    return [
      `Objet : J-3 — Atelier « ${t} »`,
      "",
      "Bonjour {{prénom}},",
      "",
      `Petit rappel — l'atelier teale « ${t} » a lieu dans 3 jours. Si vous n'avez pas encore réservé votre place :`,
      "",
      "{{lien_inscription}}",
      "",
      "C'est ouvert à toutes et tous, peu importe votre poste ou votre expérience.",
      "",
      "À très vite,",
      "L'équipe RH",
    ].join("\n");
  }
  return [
    `Objet : Merci d'avoir participé à « ${t} »`,
    "",
    "Bonjour {{prénom}},",
    "",
    `Merci d'avoir participé à l'atelier teale « ${t} ».`,
    "",
    "Pour prolonger ce que vous avez commencé :",
    "• Les exercices de l'atelier sont disponibles dans votre application teale",
    "• Vous pouvez prendre rendez-vous avec un·e psychologue teale en 1:1 pour aller plus loin",
    "• Partagez ce que vous avez appris avec votre équipe",
    "",
    "Ouvrir teale : {{lien_teale}}",
    "",
    "Prenez soin de vous,",
    "L'équipe RH",
  ].join("\n");
}

function defaultLancementTemplate(k: LancementKit): string {
  const stepIntro: Record<string, string> = {
    before:
      "Dans quelques jours, nous lançons teale, notre nouveau partenaire pour prendre soin de la santé mentale au travail.",
    dday:
      "C'est aujourd'hui ! teale est ouvert à toutes et tous dès maintenant.",
    after:
      "Cela fait quelques semaines que teale est disponible — voici quelques rappels pour profiter pleinement de la plateforme.",
  };
  const intro =
    stepIntro[k.step] ??
    "Voici un nouveau message à diffuser à vos équipes.";

  const isEnglish = k.language === "EN";
  if (isEnglish) {
    return [
      "Subject: A new mental health partner is joining the team",
      "",
      "Hi {{first_name}},",
      "",
      "We're excited to announce that teale is now available for the whole team. teale is a science-based platform built to support your mental health — at any moment, for any reason.",
      "",
      "What you'll find inside teale:",
      "• A library of articles, audio sessions and exercises",
      "• 1:1 sessions with certified psychologists, in full confidentiality",
      "• Collective workshops and Let's Talks each month",
      "",
      "Activate your account in two clicks: {{activation_link}}",
      "",
      "Take care of yourself — and reach out if you have any question.",
      "",
      "The HR team",
    ].join("\n");
  }

  return [
    "Objet : un nouveau partenaire pour prendre soin de votre santé mentale",
    "",
    "Bonjour {{prénom}},",
    "",
    intro,
    "",
    "Pourquoi teale ?",
    "• Une bibliothèque de contenus (articles, audios, exercices) accessibles 24/7",
    "• Des rendez-vous individuels avec un psychologue, en toute confidentialité",
    "• Des ateliers collectifs et des Let's Talks chaque mois",
    "",
    "Activez votre compte en deux clics : {{lien_activation}}",
    "",
    "Prenez soin de vous, et n'hésitez pas à revenir vers nous si vous avez la moindre question.",
    "",
    "L'équipe RH",
  ].join("\n");
}

function defaultEmailTemplate(k: EmailTopicKit): string {
  const isEnglish = k.language === "EN";
  const topicFr = topicLabel(k.topic);
  if (isEnglish) {
    return [
      `Subject: ${k.title}`,
      "",
      "Hi {{first_name}},",
      "",
      `This month we're focusing on ${k.topic.toLowerCase()}. Here are a few teale resources to help you and your team thrive.`,
      "",
      "• 3 short audio sessions",
      "• A guided practical exercise",
      "• A 10-minute reading to deepen the topic",
      "",
      "Open teale: {{teale_link}}",
      "",
      "Take care,",
      "The HR team",
    ].join("\n");
  }
  return [
    `Objet : ${k.title}`,
    "",
    "Bonjour {{prénom}},",
    "",
    `Ce mois-ci, nous mettons l'accent sur la thématique « ${topicFr} ». Voici quelques ressources teale pour vous accompagner, vous et vos équipes.`,
    "",
    "• 3 séances audio courtes",
    "• Un exercice pratique guidé",
    "• Une lecture de 10 minutes pour aller plus loin",
    "",
    "Ouvrez teale : {{lien_teale}}",
    "",
    "À très vite,",
    "L'équipe RH",
  ].join("\n");
}

function DownloadIcon() {
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

function LinkIcon() {
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
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

// Reusable copy-to-clipboard block for the body field on animation kits.
// The lancement/email modals already render the body via TextKitModalBody;
// the animation modal didn't have a text section before, so it gets its
// own scrollable container + copy button here.
function CopyableTextBlock({ body }: { body: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(body).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    }
  };
  return (
    <div className="mt-6">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
          Contenu à copier
        </h3>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-accent px-3.5 py-1.5 text-[11px] font-medium text-brand-dark transition-colors hover:bg-brand-accent/90"
        >
          {copied ? (
            <>
              <CheckIcon /> Copié
            </>
          ) : (
            <>
              <CopyIcon /> Copier
            </>
          )}
        </button>
      </div>
      <div className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-lg border border-brand-border-dark bg-brand-dark/40 p-4 text-sm leading-relaxed text-brand-cream">
        {body}
      </div>
    </div>
  );
}
