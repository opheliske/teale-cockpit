"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { themes, type Workshop } from "./data";
import { useWorkshops } from "@/lib/workshops-store";
import { openKitFile } from "@/lib/storage";
import { setSeenIds } from "@/lib/catalogue-read-state";
import { useActiveClient } from "@/lib/client-context";
import { useFavoriteWorkshops } from "@/lib/favorite-workshops-store";
import { planStore, type StoredPlanState } from "@/lib/plan-store";
import { isPlanItemPast } from "@/lib/plan-dates";

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

type StatusFilter = "all" | "done" | "todo" | "favoris";
type ViewMode = "grid" | "list";

const themeColorLight: Record<string, string> = {
  prevention:    "#ea580c",
  stress:        "#0d9488",
  epanouissement:"#65a30d",
  relations:     "#0284c7",
  resilience:    "#64748b",
};

function exportToPDF(selected: Workshop[]): void {
  const date = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const workshopsHTML = selected.map((w, idx) => {
    const color = themeColorLight[w.themeId] ?? "#475569";
    const themeLabel = themeDisplayLabel[w.themeId] ?? w.themeId;
    const emoji = pickWorkshopEmoji(w);
    const objectives = w.objectives.map((o) => `<li>${o}</li>`).join("");
    const programme = w.programme.map((step, i) => {
      const items = step.items?.length
        ? `<ul>${step.items.map((it) => `<li>${it}</li>`).join("")}</ul>`
        : "";
      return `<div class="step"><span class="step-n">${i + 1}</span><div><b>${step.title}</b>${items}</div></div>`;
    }).join("");

    return `
      ${idx > 0 ? '<div class="break"></div>' : ""}
      <div class="workshop">
        <div class="wh">
          <span class="emoji">${emoji}</span>
          <div class="wh-meta">
            <span class="tag" style="background:${color}22;color:${color}">${themeLabel.toUpperCase()}</span>
            ${w.alreadyAnimated ? '<span class="done">✓ Déjà animé</span>' : ""}
          </div>
        </div>
        <h2>${w.title}${w.subtitle ? ` <small>${w.subtitle}</small>` : ""}</h2>
        <h3>Objectifs</h3>
        <ul>${objectives}</ul>
        <h3>Programme</h3>
        <div class="prog">${programme}</div>
        <h3>Pour qui ?</h3>
        <ul>${w.targetAudience.map((t) => `<li>${t}</li>`).join("")}</ul>
      </div>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Sélection d'ateliers — teale</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px;color:#1a2e28;background:#fff;padding:48px 52px}
  header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:36px;padding-bottom:20px;border-bottom:2px solid #061a16}
  .brand{font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#061a16}
  .brand span{color:#0d9488}
  .summary{text-align:right;font-size:12px;color:#4b5e57;line-height:1.6}
  .summary strong{color:#061a16}
  h1{font-size:22px;font-weight:700;margin-bottom:4px;color:#061a16}
  .workshop{margin-bottom:40px}
  .wh{display:flex;align-items:center;gap:12px;margin-bottom:12px}
  .emoji{font-size:28px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:#f0f4f3;border-radius:10px;flex-shrink:0}
  .wh-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .tag{padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:.5px}
  .dur{font-size:11px;color:#4b5e57}
  .done{font-size:11px;color:#0d9488;font-weight:600}
  h2{font-size:17px;font-weight:700;color:#061a16;margin-bottom:14px;line-height:1.3}
  h2 small{font-size:13px;font-weight:400;color:#4b5e57;margin-left:6px}
  h3{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#0d9488;margin:14px 0 7px}
  ul{padding-left:18px;line-height:1.7;color:#2d4039}
  ul li{margin-bottom:2px}
  .prog{display:flex;flex-direction:column;gap:8px}
  .step{display:flex;gap:10px;align-items:flex-start}
  .step-n{width:20px;height:20px;border-radius:50%;background:#061a16;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
  .step ul{margin-top:4px;font-size:12px;color:#4b5e57}
  .break{break-before:page;page-break-before:always}
  @media print{body{padding:0}@page{margin:20mm 18mm}}
</style>
</head>
<body>
<header>
  <div>
    <div class="brand">te<span>a</span>le</div>
    <h1>Sélection d'ateliers</h1>
  </div>
  <div class="summary">
    <strong>${selected.length} atelier${selected.length > 1 ? "s" : ""}</strong><br>
    Exporté le ${date}
  </div>
</header>
${workshopsHTML}
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

export default function CatalogueAteliersPage() {
  const { workshops: catalogueWorkshops } = useWorkshops();
  const { clientId } = useActiveClient();
  const { favoriteIds, toggle: toggleFavorite, add: addFavorites } =
    useFavoriteWorkshops(clientId);

  // « Déjà animé » est par-client : on le dérive du plan annuel du client,
  // pas du drapeau global `already_animated` du catalogue (qui s'appliquerait
  // à tous les clients). Un atelier est « déjà animé » dès qu'un item atelier
  // correspondant — même workshop, ou à défaut même titre — a sa date passée
  // et n'est pas annulé (mêmes critères que « ateliers consommés »).
  const [plan, setPlan] = useState<StoredPlanState | null>(() => planStore.getState());
  useEffect(() => {
    planStore.load(clientId);
    return planStore.subscribe(() => setPlan(planStore.getState()));
  }, [clientId]);

  const animatedFromPlan = useMemo(() => {
    const yearNow = new Date().getFullYear();
    const ids = new Set<string>();
    const titles = new Set<string>();
    for (const it of plan?.items ?? []) {
      if (it.type !== "atelier" || it.cancelled) continue;
      const calendarYear = it.year === "next" ? yearNow + 1 : yearNow;
      if (!isPlanItemPast({ month: it.month, meta: it.meta, cancelled: it.cancelled, calendarYear })) {
        continue;
      }
      if (it.workshopId) ids.add(it.workshopId);
      if (it.title) titles.add(it.title.trim().toLowerCase());
    }
    return { ids, titles };
  }, [plan]);

  // Catalogue partagé, mais avec un `alreadyAnimated` recalculé pour CE client
  // — tout le reste de la page (filtres, compteurs, badges, PDF) consomme ce
  // champ sans changement.
  const workshops = useMemo(
    () =>
      catalogueWorkshops.map((w) => ({
        ...w,
        alreadyAnimated:
          animatedFromPlan.ids.has(w.id) ||
          animatedFromPlan.titles.has(w.title.trim().toLowerCase()),
      })),
    [catalogueWorkshops, animatedFromPlan],
  );

  // Visiting the catalogue clears the "new ateliers" badge on the home —
  // every currently visible workshop is marked as seen.
  useEffect(() => {
    if (workshops.length > 0) setSeenIds("ateliers", workshops.map((w) => w.id));
  }, [workshops]);
  const totalWorkshops = workshops.length;
  const animatedCount = workshops.filter((w) => w.alreadyAnimated).length;
  const remainingCount = totalWorkshops - animatedCount;

  const [search, setSearch] = useState("");
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<StatusFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeWorkshopId, setActiveWorkshopId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return workshops.filter((w) => {
      if (activeThemeId && w.themeId !== activeThemeId) return false;
      if (activeStatus === "done" && !w.alreadyAnimated) return false;
      if (activeStatus === "todo" && w.alreadyAnimated) return false;
      if (activeStatus === "favoris" && !favoriteIds.has(w.id)) return false;
      return matchesSearch(w, search);
    });
  }, [workshops, search, activeThemeId, activeStatus, favoriteIds]);

  const selectedWorkshops = useMemo(
    () => workshops.filter((w) => selectedIds.has(w.id)),
    [workshops, selectedIds]
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
  };

  const activeWorkshop = activeWorkshopId
    ? workshops.find((w) => w.id === activeWorkshopId) ?? null
    : null;

  const noFilters =
    !search.trim() && !activeThemeId && activeStatus === "all";

  return (
    <div className="px-9 py-8">
      <div className="mx-auto max-w-[1280px]">

        {/* HEADER */}
        <div className="mb-[22px] flex items-start justify-between gap-6">
          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[2.5px] text-[#5eead4]">
              Catalogue d&apos;ateliers
            </p>
            <h1 className="text-[34px] font-semibold tracking-[-0.4px] text-brand-cream">
              Interventions collectives 2026
            </h1>
            <p className="mt-1.5 max-w-[580px] text-[13px] leading-relaxed text-[#94a8a0]">
              {totalWorkshops} ateliers et conférences animés par nos experts en santé mentale.
              Filtrez, explorez, et ajoutez vos ateliers favoris en un clic.
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
          <span className="min-w-[60px] text-[10px] font-bold uppercase tracking-[1.5px] text-[#6b7c75]">
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
          <span className="min-w-[60px] text-[10px] font-bold uppercase tracking-[1.5px] text-[#6b7c75]">
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
          <Chip
            active={activeStatus === "favoris"}
            onClick={() => setActiveStatus(activeStatus === "favoris" ? "all" : "favoris")}
            count={favoriteIds.size}
          >
            ★ Favoris
          </Chip>
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
                      {activeStatus !== "all" && ` · ${activeStatus === "done" ? "Déjà animés" : activeStatus === "todo" ? "À planifier" : "Favoris"}`}
                      {search.trim() && ` · « ${search.trim()} »`}
                    </>
                }
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#6b7c75]">
                Trier par
                <select className="field-select rounded-[7px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1.5 text-[11px] text-[#c1d4cc]">
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
                    isFavorite={favoriteIds.has(w.id)}
                    onToggleFavorite={() => toggleFavorite(w.id)}
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
            onExport={() => exportToPDF(selectedWorkshops)}
            onAddFavorites={() => addFavorites(selectedWorkshops.map((w) => w.id))}
            allFavorited={
              selectedWorkshops.length > 0 &&
              selectedWorkshops.every((w) => favoriteIds.has(w.id))
            }
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
      <div className="mt-[5px] text-[10px] uppercase tracking-[1px] text-[#94a8a0]">
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
      className={`inline-flex items-center gap-1.5 rounded-[8px] border px-3 py-[7px] text-[12px] font-medium transition-all ${
        active
          ? "border-[rgba(94,234,212,0.3)] bg-[rgba(94,234,212,0.12)] text-[#5eead4]"
          : "border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] text-[#c1d4cc] hover:border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.06)]"
      }`}
    >
      {children}
      {count !== undefined && (
        <span
          className={`rounded-[4px] px-[6px] py-[1px] text-[10px] font-bold ${
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

function FavoriteButton({ isFavorite, onToggle }: { isFavorite: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      aria-pressed={isFavorite}
      title={isFavorite ? "Retirer de mes ateliers favoris" : "Ajouter à mes ateliers favoris"}
      className={`grid h-7 w-7 place-items-center rounded-[7px] border text-[12px] transition-all ${
        isFavorite
          ? "border-[rgba(250,204,21,0.35)] bg-[rgba(250,204,21,0.15)] text-[#fde047]"
          : "border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.03)] text-[#94a8a0] hover:border-[rgba(250,204,21,0.25)] hover:bg-[rgba(250,204,21,0.1)] hover:text-[#fde047]"
      }`}
    >
      {isFavorite ? "★" : "☆"}
    </button>
  );
}

function WorkshopCard({
  workshop,
  isSelected,
  onSelect,
  isFavorite,
  onToggleFavorite,
  onOpen,
  listMode,
}: {
  workshop: Workshop;
  isSelected: boolean;
  onSelect: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
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
        onClick={onOpen}
        className={`flex cursor-pointer items-center gap-3 rounded-[13px] border bg-[rgba(255,255,255,0.02)] p-3 transition-all hover:bg-[rgba(255,255,255,0.035)] ${
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
            <span className={`rounded-[4px] px-[6px] py-[2px] text-[9px] font-bold tracking-[0.4px] ${tagClass}`}>
              {tagLabel}
            </span>
            <span
              className={`rounded-[4px] px-[6px] py-[2px] text-[9px] font-semibold ${
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
        <div className="flex shrink-0 items-center gap-2 text-[11px] text-[#6b7c75]">
          <button type="button" onClick={(e) => { e.stopPropagation(); onOpen(); }} className="font-semibold text-[#5eead4]">
            Aperçu →
          </button>
          <FavoriteButton isFavorite={isFavorite} onToggle={onToggleFavorite} />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
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
      onClick={onOpen}
      className={`flex cursor-pointer flex-col rounded-[13px] border bg-[rgba(255,255,255,0.02)] p-[14px] transition-all hover:-translate-y-0.5 hover:border-[rgba(94,234,212,0.25)] hover:bg-[rgba(255,255,255,0.035)] hover:shadow-[0_8px_24px_-10px_rgba(0,0,0,0.4)] ${
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
          <FavoriteButton isFavorite={isFavorite} onToggle={onToggleFavorite} />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
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
      <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.04)] pt-2.5 text-[11px] text-[#6b7c75]">
        <button type="button" onClick={(e) => { e.stopPropagation(); onOpen(); }} className="font-semibold text-[#5eead4]">
          Aperçu →
        </button>
      </div>
    </div>
  );
}

function PlanningBasket({
  selected,
  onRemove,
  onExport,
  onAddFavorites,
  allFavorited,
}: {
  selected: Workshop[];
  onRemove: (id: string) => void;
  onExport: () => void;
  onAddFavorites: () => void;
  allFavorited: boolean;
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
        Ateliers que vous envisagez de programmer. Ajoutez-les à vos favoris ou exportez la liste.
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
                  <div className="truncate text-[12px] font-medium leading-[1.3] text-[#e8f5ef]">
                    {w.title}
                  </div>
                  <div className="mt-[2px] text-[10px] text-[#6b7c75]">
                    {themeDisplayLabel[w.themeId] ?? w.themeId}
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
          <div className="mt-[14px] rounded-[9px] border border-[rgba(94,234,212,0.12)] bg-[rgba(94,234,212,0.04)] p-3">
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
            onClick={onAddFavorites}
            disabled={allFavorited}
            className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-[9px] py-[11px] text-[12px] font-semibold transition-colors ${
              allFavorited
                ? "cursor-default bg-[rgba(250,204,21,0.15)] text-[#fde047]"
                : "bg-[#5eead4] text-[#042f2a] hover:bg-[#2dd4bf]"
            }`}
          >
            {allFavorited ? "★ Dans mes ateliers favoris" : "☆ Ajouter à mes ateliers favoris"}
          </button>
          <button
            type="button"
            onClick={onExport}
            className="mt-1.5 w-full rounded-[9px] border border-[rgba(255,255,255,0.06)] py-[9px] text-[11px] font-medium text-[#94a8a0] transition-colors hover:border-[rgba(255,255,255,0.12)] hover:text-[#e8f5ef]"
          >
            ↓ Exporter en PDF
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
          {workshop.communicationKit && workshop.communicationKit.length > 0 && (
            <Block title="Kit de communication">
              <ul className="flex flex-col gap-1.5">
                {workshop.communicationKit.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => void openKitFile(f.path, f.name)}
                      className="flex w-full items-center gap-2.5 rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)] px-3 py-2 text-left transition-colors hover:border-[rgba(94,234,212,0.3)]"
                    >
                      <span className="shrink-0 text-[14px]">📎</span>
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-[#e8f5ef]">{f.name}</span>
                      <span className="shrink-0 text-[11px] font-semibold text-[#5eead4]">Télécharger ↓</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Block>
          )}
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
