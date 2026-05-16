"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { themes, workshops, type Workshop } from "./data";

// --- constants computed once ---
const totalWorkshops = workshops.length;
const animatedCount = workshops.filter((w) => w.alreadyAnimated).length;
const remainingCount = totalWorkshops - animatedCount;

// --- helpers ---
function workshopHaystack(w: Workshop): string {
  return [w.title, w.subtitle ?? "", ...w.objectives, ...w.targetAudience]
    .join(" ")
    .toLowerCase();
}

function matchesSearch(w: Workshop, query: string): boolean {
  if (!query.trim()) return true;
  return workshopHaystack(w).includes(query.toLowerCase());
}

function parseDurationMinutes(dur: string): number {
  const m = dur.match(/^(\d+)h(\d*)?$/);
  if (!m) return 60;
  return parseInt(m[1]) * 60 + (m[2] ? parseInt(m[2]) : 0);
}

function formatTotalDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${m}`;
}

// --- theme style maps ---
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

const themeTagLabel: Record<string, string> = {
  prevention:    "PRÉVENTION",
  stress:        "STRESS & ÉMOTIONS",
  epanouissement:"ÉPANOUISSEMENT",
  relations:     "RELATIONS",
  resilience:    "RÉSILIENCE",
};

const themeDisplayLabel: Record<string, string> = {
  prevention:    "Prévention",
  stress:        "Stress & émotions",
  epanouissement:"Épanouissement",
  relations:     "Relations",
  resilience:    "Résilience",
};

const themeEmoji: Record<string, string> = {
  prevention:    "🛡️",
  stress:        "🧘",
  epanouissement:"🌱",
  relations:     "🤝",
  resilience:    "🌳",
};

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
  if (/maladie|handicap/.test(t)) return "♿";
  if (/changement/.test(t)) return "🔄";
  if (/résilience|resilience/.test(t)) return "🌳";
  if (/addict|comportement/.test(t)) return "🚭";
  if (/charge mentale/.test(t)) return "🧠";
  if (/émotion|emotion|cerveau/.test(t)) return "❤️";
  if (/rps|risque/.test(t)) return "⚠️";
  if (/premiers/.test(t)) return "🚀";
  return themeEmoji[w.themeId] ?? "✨";
}

const ALL_DURATIONS = ["1h", "1h30", "2h"] as const;
type DurationFilter = "all" | "1h" | "1h30" | "2h";
type StatusFilter = "all" | "done" | "todo";
type ViewMode = "grid" | "list";

export default function CatalogueAteliersPage() {
  const [search, setSearch] = useState("");
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<StatusFilter>("all");
  const [activeDuration, setActiveDuration] = useState<DurationFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeWorkshopId, setActiveWorkshopId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return workshops.filter((w) => {
      if (activeThemeId && w.themeId !== activeThemeId) return false;
      if (activeStatus === "done" && !w.alreadyAnimated) return false;
      if (activeStatus === "todo" && w.alreadyAnimated) return false;
      if (activeDuration !== "all" && w.duration !== activeDuration) return false;
      return matchesSearch(w, search);
    });
  }, [search, activeThemeId, activeStatus, activeDuration]);

  const selectedWorkshops = useMemo(
    () => workshops.filter((w) => selectedIds.has(w.id)),
    [selectedIds]
  );

  const totalMinutes = selectedWorkshops.reduce(
    (sum, w) => sum + parseDurationMinutes(w.duration),
    0
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetFilters = () => {
    setSearch("");
    setActiveThemeId(null);
    setActiveStatus("all");
    setActiveDuration("all");
  };

  const activeWorkshop = activeWorkshopId
    ? workshops.find((w) => w.id === activeWorkshopId) ?? null
    : null;

  const noFilters =
    !search.trim() && !activeThemeId && activeStatus === "all" && activeDuration === "all";

  return (
    <div className="px-9 py-8">
      <div className="mx-auto max-w-[1280px]">

        {/* HEADER */}
        <div className="mb-[22px] flex items-start justify-between gap-6">
          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[2.5px] text-[#5eead4]">
              Catalogue d&apos;ateliers
            </p>
            <h1 className="text-[30px] font-semibold tracking-[-0.4px] text-brand-cream">
              Interventions collectives 2026
            </h1>
            <p className="mt-1.5 max-w-[580px] text-[13px] leading-relaxed text-[#94a8a0]">
              {totalWorkshops} ateliers et conférences animés par nos experts en santé mentale.
              Filtrez, ajoutez à votre sélection, et planifiez en un clic avec votre CSM.
            </p>
          </div>
          <div className="flex shrink-0 gap-2.5">
            <StatBox value={totalWorkshops} label="Ateliers" />
            <StatBox value={animatedCount} label="Déjà animés" color="green" />
            <StatBox value={remainingCount} label="À planifier" color="amber" />
          </div>
        </div>

        {/* SEARCH + VIEW TOGGLE */}
        <div className="mb-4 grid grid-cols-[1fr_auto] items-center gap-3 rounded-[14px] border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-[14px_16px]">
          <div className="relative flex items-center">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-[14px] text-[#6b7c75]"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un atelier, un thème, un mot-clé..."
              className="w-full rounded-[10px] border border-[rgba(255,255,255,0.05)] bg-black/25 py-[11px] pl-[38px] pr-[14px] text-[13px] text-[#e8f5ef] placeholder:text-[#6b7c75] focus:border-[rgba(94,234,212,0.3)] focus:outline-none"
            />
          </div>
          <div className="flex rounded-[10px] border border-[rgba(255,255,255,0.05)] bg-black/25 p-[3px]">
            <ViewBtn active={viewMode === "grid"} onClick={() => setViewMode("grid")}>
              ⊞ Grille
            </ViewBtn>
            <ViewBtn active={viewMode === "list"} onClick={() => setViewMode("list")}>
              ☰ Liste
            </ViewBtn>
          </div>
        </div>

        {/* FILTER ROW: THÈME */}
        <div className="flex flex-wrap items-center gap-2 px-0.5 py-1">
          <span className="min-w-[60px] text-[9.5px] font-bold uppercase tracking-[1.5px] text-[#6b7c75]">
            THÈME
          </span>
          <Chip active={activeThemeId === null} onClick={() => setActiveThemeId(null)} count={totalWorkshops}>
            Tous
          </Chip>
          {themes.map((t) => (
            <Chip
              key={t.id}
              active={activeThemeId === t.id}
              onClick={() => setActiveThemeId(activeThemeId === t.id ? null : t.id)}
              count={workshops.filter((w) => w.themeId === t.id).length}
            >
              {themeEmoji[t.id]} {themeDisplayLabel[t.id]}
            </Chip>
          ))}
        </div>

        {/* FILTER ROW: STATUT + DURÉE */}
        <div className="mt-2 flex flex-wrap items-center gap-2 px-0.5 py-1">
          <span className="min-w-[60px] text-[9.5px] font-bold uppercase tracking-[1.5px] text-[#6b7c75]">
            STATUT
          </span>
          <Chip active={activeStatus === "all"} onClick={() => setActiveStatus("all")}>
            Tous
          </Chip>
          <Chip
            active={activeStatus === "done"}
            onClick={() => setActiveStatus(activeStatus === "done" ? "all" : "done")}
            count={animatedCount}
          >
            ✓ Déjà animé
          </Chip>
          <Chip
            active={activeStatus === "todo"}
            onClick={() => setActiveStatus(activeStatus === "todo" ? "all" : "todo")}
            count={remainingCount}
          >
            ○ À planifier
          </Chip>
          <span className="ml-4 min-w-[60px] text-[9.5px] font-bold uppercase tracking-[1.5px] text-[#6b7c75]">
            DURÉE
          </span>
          <Chip active={activeDuration === "all"} onClick={() => setActiveDuration("all")}>
            Toutes
          </Chip>
          {ALL_DURATIONS.map((d) => (
            <Chip
              key={d}
              active={activeDuration === d}
              onClick={() => setActiveDuration(activeDuration === d ? "all" : d)}
            >
              {d}
            </Chip>
          ))}
        </div>

        {/* MAIN LAYOUT */}
        <div className="mt-[18px] grid grid-cols-[1fr_320px] gap-5">

          {/* LEFT: RESULTS */}
          <div>
            <div className="mb-[14px] flex items-baseline justify-between">
              <div className="text-[13px] text-[#94a8a0]">
                <strong className="font-semibold text-[#e8f5ef]">
                  {filtered.length} {filtered.length === 1 ? "atelier" : "ateliers"}
                </strong>
                {noFilters
                  ? " · Toutes thématiques · Tous statuts"
                  : <>
                      {activeThemeId && ` · ${themeDisplayLabel[activeThemeId] ?? activeThemeId}`}
                      {activeStatus !== "all" && ` · ${activeStatus === "done" ? "Déjà animés" : "À planifier"}`}
                      {activeDuration !== "all" && ` · ${activeDuration}`}
                      {search.trim() && ` · « ${search.trim()} »`}
                    </>
                }
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#6b7c75]">
                Trier par
                <select className="rounded-[7px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1.5 text-[11px] text-[#c1d4cc] [color-scheme:dark] focus:outline-none">
                  <option>Thématique</option>
                  <option>Statut</option>
                  <option>Nom (A-Z)</option>
                </select>
              </div>
            </div>

            {filtered.length === 0 ? (
              <EmptyState onReset={resetFilters} query={search} />
            ) : (
              <div className={viewMode === "grid" ? "grid grid-cols-3 gap-3" : "flex flex-col gap-2"}>
                {filtered.map((w) => (
                  <WorkshopCard
                    key={w.id}
                    workshop={w}
                    isSelected={selectedIds.has(w.id)}
                    onSelect={() => toggleSelect(w.id)}
                    onOpen={() => setActiveWorkshopId(w.id)}
                    listMode={viewMode === "list"}
                  />
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: PLANNING BASKET */}
          <PlanningBasket
            selected={selectedWorkshops}
            onRemove={toggleSelect}
            totalMinutes={totalMinutes}
          />
        </div>
      </div>

      {activeWorkshop && (
        <WorkshopModal
          workshop={activeWorkshop}
          onClose={() => setActiveWorkshopId(null)}
        />
      )}
    </div>
  );
}

// --- sub-components ---

function StatBox({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color?: "green" | "amber";
}) {
  return (
    <div className="min-w-[100px] rounded-[11px] border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.025)] px-[18px] py-3">
      <div
        className={`text-[24px] font-bold tabular-nums leading-none ${
          color === "green"
            ? "text-[#5eead4]"
            : color === "amber"
              ? "text-[#fdba74]"
              : "text-[#e8f5ef]"
        }`}
      >
        {value}
      </div>
      <div className="mt-[5px] text-[9.5px] uppercase tracking-[1px] text-[#94a8a0]">
        {label}
      </div>
    </div>
  );
}

function ViewBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-[7px] px-3 py-2 text-[11px] font-semibold tracking-[0.3px] transition-all ${
        active
          ? "bg-[rgba(94,234,212,0.14)] text-[#5eead4]"
          : "text-[#94a8a0] hover:text-[#e8f5ef]"
      }`}
    >
      {children}
    </button>
  );
}

function Chip({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-[8px] border px-3 py-[7px] text-[11.5px] font-medium transition-all ${
        active
          ? "border-[rgba(94,234,212,0.3)] bg-[rgba(94,234,212,0.12)] text-[#5eead4]"
          : "border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] text-[#c1d4cc] hover:border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.06)]"
      }`}
    >
      {children}
      {count !== undefined && (
        <span
          className={`rounded-[4px] px-[6px] py-[1px] text-[9.5px] font-bold ${
            active
              ? "bg-[rgba(94,234,212,0.2)] text-[#5eead4]"
              : "bg-[rgba(255,255,255,0.06)] text-[#94a8a0]"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function WorkshopCard({
  workshop,
  isSelected,
  onSelect,
  onOpen,
  listMode,
}: {
  workshop: Workshop;
  isSelected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  listMode: boolean;
}) {
  const emoji = pickWorkshopEmoji(workshop);
  const emojiBoxClass = themeEmojiBoxClass[workshop.themeId] ?? "bg-[rgba(255,255,255,0.04)]";
  const tagClass = themeTagClass[workshop.themeId] ?? "bg-[rgba(255,255,255,0.05)] text-[#94a8a0]";
  const tagLabel = themeTagLabel[workshop.themeId] ?? workshop.themeId.toUpperCase();

  if (listMode) {
    return (
      <div
        className={`flex items-center gap-3 rounded-[13px] border bg-[rgba(255,255,255,0.02)] p-3 transition-all hover:bg-[rgba(255,255,255,0.035)] ${
          isSelected ? "border-[rgba(94,234,212,0.3)]" : "border-[rgba(255,255,255,0.05)]"
        }`}
      >
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] text-[18px] ${emojiBoxClass}`}
          aria-hidden
        >
          {emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`rounded-[4px] px-[6px] py-[2px] text-[8.5px] font-bold tracking-[0.4px] ${tagClass}`}>
              {tagLabel}
            </span>
            <span
              className={`rounded-[4px] px-[6px] py-[2px] text-[8.5px] font-semibold ${
                workshop.alreadyAnimated
                  ? "bg-[rgba(94,234,212,0.12)] text-[#5eead4]"
                  : "bg-[rgba(250,204,21,0.1)] text-[#fde047]"
              }`}
            >
              {workshop.alreadyAnimated ? "✓ Animé" : "○ À planifier"}
            </span>
          </div>
          <div className="mt-1 truncate text-[13px] font-semibold text-[#e8f5ef]">
            {workshop.title}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-[10.5px] text-[#6b7c75]">
          <span>⏱ {workshop.duration}</span>
          <button type="button" onClick={onOpen} className="font-semibold text-[#5eead4]">
            Aperçu →
          </button>
          <button
            type="button"
            onClick={onSelect}
            className={`grid h-7 w-7 place-items-center rounded-[7px] border text-[12px] transition-all ${
              isSelected
                ? "border-[rgba(94,234,212,0.3)] bg-[rgba(94,234,212,0.15)] text-[#5eead4]"
                : "border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.03)] text-[#94a8a0] hover:border-[rgba(94,234,212,0.2)] hover:bg-[rgba(94,234,212,0.1)] hover:text-[#5eead4]"
            }`}
          >
            {isSelected ? "✓" : "+"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col rounded-[13px] border bg-[rgba(255,255,255,0.02)] p-[14px] transition-all hover:-translate-y-0.5 hover:border-[rgba(94,234,212,0.25)] hover:bg-[rgba(255,255,255,0.035)] hover:shadow-[0_8px_24px_-10px_rgba(0,0,0,0.4)] ${
        isSelected ? "border-[rgba(94,234,212,0.3)]" : "border-[rgba(255,255,255,0.05)]"
      }`}
    >
      {/* top: emoji + action buttons */}
      <div className="mb-2.5 flex items-start justify-between">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-[22px] ${emojiBoxClass}`}
          aria-hidden
        >
          {emoji}
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            title="Sauvegarder"
            className="grid h-7 w-7 place-items-center rounded-[7px] border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.03)] text-[12px] text-[#94a8a0] transition-all hover:border-[rgba(94,234,212,0.2)] hover:bg-[rgba(94,234,212,0.1)] hover:text-[#5eead4]"
          >
            ☆
          </button>
          <button
            type="button"
            onClick={onSelect}
            title={isSelected ? "Retirer de ma sélection" : "Ajouter à ma sélection"}
            className={`grid h-7 w-7 place-items-center rounded-[7px] border text-[12px] transition-all ${
              isSelected
                ? "border-[rgba(94,234,212,0.3)] bg-[rgba(94,234,212,0.15)] text-[#5eead4]"
                : "border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.03)] text-[#94a8a0] hover:border-[rgba(94,234,212,0.2)] hover:bg-[rgba(94,234,212,0.1)] hover:text-[#5eead4]"
            }`}
          >
            {isSelected ? "✓" : "+"}
          </button>
        </div>
      </div>

      {/* tags */}
      <div className="mb-2 flex flex-wrap gap-[5px]">
        <span className={`rounded-[4px] px-[7px] py-[3px] text-[9px] font-bold tracking-[0.5px] ${tagClass}`}>
          {tagLabel}
        </span>
        {workshop.subtitle && (
          <span className="rounded-[4px] bg-[rgba(96,165,250,0.15)] px-[7px] py-[3px] text-[9px] font-bold tracking-[0.5px] text-[#93c5fd]">
            {workshop.subtitle.toUpperCase()}
          </span>
        )}
        <span
          className={`rounded-[4px] px-[7px] py-[3px] text-[9px] font-semibold tracking-[0.3px] ${
            workshop.alreadyAnimated
              ? "bg-[rgba(94,234,212,0.12)] text-[#5eead4]"
              : "bg-[rgba(250,204,21,0.1)] text-[#fde047]"
          }`}
        >
          {workshop.alreadyAnimated ? "✓ Animé" : "○ À planifier"}
        </span>
      </div>

      {/* title */}
      <div className="mb-[6px] line-clamp-2 min-h-[36px] text-[13px] font-semibold leading-[1.35] text-[#e8f5ef]">
        {workshop.title}
      </div>

      {/* desc */}
      <div className="mb-3 line-clamp-2 flex-1 text-[11px] leading-[1.45] text-[#94a8a0]">
        {workshop.objectives[0]}
      </div>

      {/* footer */}
      <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.04)] pt-2.5 text-[10.5px] text-[#6b7c75]">
        <span>⏱ {workshop.duration}</span>
        <button type="button" onClick={onOpen} className="font-semibold text-[#5eead4]">
          Aperçu →
        </button>
      </div>
    </div>
  );
}

function PlanningBasket({
  selected,
  onRemove,
  totalMinutes,
}: {
  selected: Workshop[];
  onRemove: (id: string) => void;
  totalMinutes: number;
}) {
  return (
    <div className="sticky top-8 flex max-h-[calc(100vh-64px)] flex-col self-start rounded-[14px] border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-[18px]">
      {/* head */}
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          <span className="text-[16px]" aria-hidden>🎯</span>
          Ma sélection
        </div>
        {selected.length > 0 && (
          <span className="min-w-[22px] rounded-[10px] bg-[#5eead4] px-[7px] py-[2px] text-center text-[10px] font-bold text-[#042f2a]">
            {selected.length}
          </span>
        )}
      </div>
      <p className="mb-[14px] text-[11px] leading-relaxed text-[#94a8a0]">
        Ateliers que vous envisagez de programmer. Partagez la liste à votre CSM pour planifier.
      </p>

      {/* list */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {selected.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="mb-2.5 text-[28px] opacity-40" aria-hidden>📋</div>
            <p className="text-[12px] text-[#94a8a0]">Votre sélection est vide</p>
            <p className="mt-1 text-[10px] leading-relaxed text-[#6b7c75]">
              Cliquez sur + pour ajouter un atelier
            </p>
          </div>
        ) : (
          <div className="space-y-[7px]">
            {selected.map((w) => (
              <div
                key={w.id}
                className="flex items-center gap-[9px] rounded-[9px] border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] p-[10px_11px]"
              >
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-[rgba(255,255,255,0.04)] text-[16px]"
                  aria-hidden
                >
                  {pickWorkshopEmoji(w)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11.5px] font-medium leading-[1.3] text-[#e8f5ef]">
                    {w.title}
                  </div>
                  <div className="mt-[2px] text-[9.5px] text-[#6b7c75]">
                    {themeDisplayLabel[w.themeId] ?? w.themeId} · {w.duration}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(w.id)}
                  aria-label="Retirer de la sélection"
                  className="shrink-0 p-1 text-[14px] text-[#6b7c75] transition-colors hover:text-[#fca5a5]"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* summary + CTA */}
      {selected.length > 0 && (
        <>
          <div className="mt-[14px] grid grid-cols-2 gap-2.5 rounded-[9px] border border-[rgba(94,234,212,0.12)] bg-[rgba(94,234,212,0.04)] p-3">
            <div>
              <div className="text-[18px] font-bold tabular-nums leading-none text-[#5eead4]">
                {formatTotalDuration(totalMinutes)}
              </div>
              <div className="mt-1 text-[9px] uppercase tracking-[0.3px] text-[#94a8a0]">
                Durée totale
              </div>
            </div>
            <div>
              <div className="text-[18px] font-bold tabular-nums leading-none text-[#5eead4]">
                {selected.length}
              </div>
              <div className="mt-1 text-[9px] uppercase tracking-[0.3px] text-[#94a8a0]">
                Atelier{selected.length > 1 ? "s" : ""}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[9px] bg-[#5eead4] py-[11px] text-[12px] font-semibold text-[#042f2a] transition-colors hover:bg-[#2dd4bf]"
          >
            📅 Planifier avec mon CSM
          </button>
          <button
            type="button"
            className="mt-1.5 w-full rounded-[9px] border border-[rgba(255,255,255,0.06)] py-[9px] text-[11px] font-medium text-[#94a8a0] transition-colors hover:border-[rgba(255,255,255,0.12)] hover:text-[#e8f5ef]"
          >
            Exporter la sélection
          </button>
        </>
      )}
    </div>
  );
}

function EmptyState({ onReset, query }: { onReset: () => void; query: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)] px-6 py-16 text-center">
      <p className="text-base font-medium text-[#e8f5ef]">
        {query.trim()
          ? `Aucun atelier ne correspond à « ${query.trim()} »`
          : "Aucun atelier pour ces filtres"}
      </p>
      <p className="mt-2 text-sm text-[#94a8a0]">
        Essayez d&apos;élargir votre recherche ou de changer de thématique.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-5 rounded-full border border-[rgba(94,234,212,0.5)] px-4 py-1.5 text-xs font-medium text-[#5eead4] transition-colors hover:bg-[rgba(94,234,212,0.1)]"
      >
        Réinitialiser les filtres
      </button>
    </div>
  );
}

function WorkshopModal({ workshop, onClose }: { workshop: Workshop; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const tagClass = themeTagClass[workshop.themeId] ?? "bg-[rgba(255,255,255,0.05)] text-[#94a8a0]";
  const tagLabel = themeTagLabel[workshop.themeId] ?? workshop.themeId.toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-6 backdrop-blur-sm sm:p-10"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="workshop-modal-title"
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0a1f18] p-7 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-[#94a8a0] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[#e8f5ef]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 6l12 12M6 18 18 6" />
          </svg>
        </button>

        <div className="flex flex-wrap items-center gap-2 pr-12">
          <span className={`rounded-[4px] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tagClass}`}>
            {tagLabel}
          </span>
          <span className="rounded-[4px] bg-[rgba(255,255,255,0.06)] px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-[#94a8a0]">
            {workshop.duration}
          </span>
          {workshop.subtitle && (
            <span className="text-[10px] uppercase tracking-wider text-[#94a8a0]">
              · {workshop.subtitle}
            </span>
          )}
          <span
            className={`ml-auto inline-flex items-center gap-1 rounded-[4px] px-2 py-0.5 text-[10px] font-semibold ${
              workshop.alreadyAnimated
                ? "bg-[rgba(94,234,212,0.12)] text-[#5eead4]"
                : "bg-[rgba(250,204,21,0.1)] text-[#fde047]"
            }`}
          >
            {workshop.alreadyAnimated ? "✓ Animé" : "○ À planifier"}
          </span>
        </div>

        <h2 id="workshop-modal-title" className="mt-3 text-2xl font-medium tracking-tight text-[#e8f5ef]">
          {workshop.title}
        </h2>

        <div className="mt-6 space-y-6">
          <Block title="Objectifs">
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#e8f5ef]">
              {workshop.objectives.map((o, i) => <li key={i}>{o}</li>)}
            </ul>
          </Block>
          <Block title="Programme">
            <ol className="space-y-3 text-sm text-[#e8f5ef]">
              {workshop.programme.map((step, i) => (
                <li key={i}>
                  <div className="flex gap-3">
                    <span className="shrink-0 text-[#5eead4]">{i + 1}.</span>
                    <div className="flex-1">
                      <div className="font-medium">{step.title}</div>
                      {step.items && step.items.length > 0 && (
                        <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm leading-relaxed text-[#94a8a0]">
                          {step.items.map((it, j) => <li key={j}>{it}</li>)}
                        </ul>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Block>
          <Block title="Pour qui ?">
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#94a8a0]">
              {workshop.targetAudience.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </Block>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(255,255,255,0.06)] pt-5">
          <p className="text-xs text-[#94a8a0]">
            Demandez cet atelier à votre Customer Success Manager.
          </p>
          <button
            type="button"
            disabled
            title="Bientôt disponible"
            className="cursor-not-allowed rounded-full bg-[#5eead4] px-4 py-2 text-xs font-medium text-[#042f2a] opacity-70"
          >
            Demander cet atelier
          </button>
        </div>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#5eead4]">
        {title}
      </h3>
      {children}
    </section>
  );
}
