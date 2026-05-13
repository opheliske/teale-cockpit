"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { themes, workshops, type Workshop } from "./data";

const totalWorkshops = workshops.length;

function workshopHaystack(w: Workshop): string {
  return [
    w.title,
    w.subtitle ?? "",
    ...w.objectives,
    ...w.programme.flatMap((p) => [p.title, ...(p.items ?? [])]),
    ...w.targetAudience,
  ]
    .join(" ")
    .toLowerCase();
}

function matchesSearch(w: Workshop, query: string): boolean {
  if (!query.trim()) return true;
  return workshopHaystack(w).includes(query.toLowerCase());
}

const themeChipStyle: Record<string, string> = {
  prevention: "bg-[#E6AA99]/15 text-[#E6AA99]",
  stress: "bg-brand-accent/15 text-brand-accent",
  epanouissement: "bg-brand-highlight/15 text-brand-highlight",
  relations: "bg-brand-cream/10 text-brand-cream",
  resilience: "bg-brand-muted-on-dark/15 text-brand-muted-on-dark",
};

const themeNameById = Object.fromEntries(themes.map((t) => [t.id, t.name]));

const themeGradient: Record<string, string> = {
  prevention: "bg-gradient-to-br from-[#b3826b] to-[#efb8ad]",
  stress: "bg-gradient-to-br from-[#2d6b62] to-[#4cbfa6]",
  epanouissement: "bg-gradient-to-br from-[#2a7d4a] to-[#a8e895]",
  relations: "bg-gradient-to-br from-[#8fb6c7] to-[#2d6b62]",
  resilience: "bg-gradient-to-br from-[#4d6961] to-[#c2bbab]",
};

const themeEmoji: Record<string, string> = {
  prevention: "🛡️",
  stress: "🧘",
  epanouissement: "🌱",
  relations: "🤝",
  resilience: "🌳",
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

export default function CatalogueAteliersPage() {
  const [search, setSearch] = useState("");
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [activeWorkshopId, setActiveWorkshopId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return workshops.filter(
      (w) =>
        (!activeThemeId || w.themeId === activeThemeId) &&
        matchesSearch(w, search)
    );
  }, [search, activeThemeId]);

  const grouped = useMemo(() => {
    return themes
      .map((t) => ({
        theme: t,
        items: filtered.filter((w) => w.themeId === t.id),
      }))
      .filter((g) => g.items.length > 0);
  }, [filtered]);

  const visibleCount = filtered.length;
  const hasActiveFilters = !!search.trim() || activeThemeId !== null;

  const resetFilters = () => {
    setSearch("");
    setActiveThemeId(null);
  };

  const activeWorkshop = activeWorkshopId
    ? workshops.find((w) => w.id === activeWorkshopId) ?? null
    : null;

  const animatedCount = workshops.filter((w) => w.alreadyAnimated).length;
  const remainingCount = totalWorkshops - animatedCount;

  return (
    <div className="relative px-10 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-0 h-[460px] w-[460px] translate-x-20 rounded-full bg-brand-teal-bright/10 blur-3xl"
      />
      <div className="relative z-10 mx-auto max-w-6xl">
        <header className="mb-9 grid items-end gap-10 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-teal-bright">
              Catalogue d&apos;ateliers
            </p>
            <h1 className="mt-4 max-w-3xl text-5xl font-medium leading-[1.05] tracking-tight text-brand-cream">
              Interventions collectives 2026
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-brand-muted-on-dark">
              {totalWorkshops} ateliers et conférences animés par nos experts
              en santé mentale, classés par thématique. Cliquez sur un atelier
              pour consulter son programme détaillé.
            </p>
          </div>
          <div className="flex gap-3">
            <StatPill value={totalWorkshops} label="Ateliers" accent />
            <StatPill value={remainingCount} label="À planifier" />
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
              placeholder="Rechercher un atelier, un objectif, un thème…"
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
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="w-14 shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-muted-on-dark">
              Thème
            </span>
            <div className="flex flex-wrap gap-2">
              <PillFilter
                selected={activeThemeId === null}
                onClick={() => setActiveThemeId(null)}
              >
                Toutes les thématiques
              </PillFilter>
              {themes.map((t) => (
                <PillFilter
                  key={t.id}
                  selected={activeThemeId === t.id}
                  onClick={() =>
                    setActiveThemeId(activeThemeId === t.id ? null : t.id)
                  }
                  count={workshops.filter((w) => w.themeId === t.id).length}
                >
                  <span className="mr-1.5">{themeEmoji[t.id] ?? ""}</span>
                  {t.name}
                </PillFilter>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 mb-8 flex items-center justify-between text-[13px] text-brand-muted-on-dark">
          <span>
            {visibleCount === 0
              ? "Aucun résultat"
              : visibleCount === totalWorkshops
                ? `${totalWorkshops} ateliers au total`
                : `${visibleCount} atelier${visibleCount > 1 ? "s" : ""} sur ${totalWorkshops}`}
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

        {grouped.length === 0 ? (
          <EmptyState onReset={resetFilters} query={search} />
        ) : (
          <div className="space-y-10">
            {grouped.map(({ theme, items }) => (
              <section key={theme.id}>
                <header className="mb-5 flex items-baseline justify-between gap-3">
                  <div>
                    <h2 className="flex items-center gap-3 text-2xl font-medium tracking-tight text-brand-cream">
                      <span aria-hidden>{themeEmoji[theme.id] ?? "✦"}</span>
                      {theme.name}
                    </h2>
                    <p className="mt-1.5 ml-1 max-w-3xl text-sm text-brand-muted-on-dark">
                      {theme.description}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] uppercase tracking-wider text-brand-muted-on-dark">
                    {items.length} atelier{items.length > 1 ? "s" : ""}
                  </span>
                </header>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((w) => (
                    <WorkshopCard
                      key={w.id}
                      workshop={w}
                      onOpen={() => setActiveWorkshopId(w.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
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

function WorkshopCard({
  workshop,
  onOpen,
}: {
  workshop: Workshop;
  onOpen: () => void;
}) {
  const gradient = themeGradient[workshop.themeId] ?? themeGradient.relations;
  const emoji = pickWorkshopEmoji(workshop);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-brand-border-dark bg-brand-surface text-left transition-all hover:-translate-y-1 hover:border-brand-green-bright/40"
    >
      <div className={`relative flex h-28 items-end p-3.5 ${gradient}`}>
        <span className="text-3xl drop-shadow-md" aria-hidden>
          {emoji}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-sm">
          {workshop.duration}
        </span>
      </div>
      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] ${themeChipStyle[workshop.themeId]}`}
          >
            {workshop.subtitle ?? themeShortName(workshop.themeId)}
          </span>
          {workshop.alreadyAnimated && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-green-bright/15 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-brand-green-bright">
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
              Animé
            </span>
          )}
        </div>
        <h3 className="text-[15px] font-medium leading-snug text-brand-cream">
          {workshop.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-[13px] text-brand-muted-on-dark">
          {workshop.objectives[0]}
        </p>
        <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3.5 text-xs">
          <span className="text-brand-muted-on-dark">
            {workshop.alreadyAnimated ? "Déjà animé" : "À planifier"}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-brand-teal-bright transition-transform group-hover:translate-x-0.5">
            Aperçu →
          </span>
        </div>
      </div>
    </button>
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

function StatusPill({ animated }: { animated: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
        animated ? "text-brand-accent" : "text-brand-muted-on-dark"
      }`}
    >
      {animated ? (
        <svg
          width="11"
          height="11"
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
      ) : (
        <span className="h-1.5 w-1.5 rounded-full border border-current" aria-hidden />
      )}
      {animated ? "Déjà animé" : "À planifier"}
    </span>
  );
}

function themeShortName(id: string): string {
  switch (id) {
    case "prevention":
      return "Prévention";
    case "stress":
      return "Stress & émotions";
    case "epanouissement":
      return "Épanouissement";
    case "relations":
      return "Relations";
    case "resilience":
      return "Résilience";
    default:
      return id;
  }
}

function WorkshopModal({
  workshop,
  onClose,
}: {
  workshop: Workshop;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-6 backdrop-blur-sm sm:p-10"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="workshop-modal-title"
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

        <div className="flex flex-wrap items-center gap-2 pr-12">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${themeChipStyle[workshop.themeId]}`}
          >
            {themeNameById[workshop.themeId]}
          </span>
          <span className="rounded-full bg-brand-dark px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-brand-muted-on-dark">
            {workshop.duration}
          </span>
          {workshop.subtitle && (
            <span className="text-[10px] uppercase tracking-wider text-brand-muted-on-dark">
              · {workshop.subtitle}
            </span>
          )}
          <span className="ml-auto">
            <StatusPill animated={!!workshop.alreadyAnimated} />
          </span>
        </div>

        <h2
          id="workshop-modal-title"
          className="mt-3 text-2xl font-medium tracking-tight text-brand-cream"
        >
          {workshop.title}
        </h2>

        <div className="mt-6 space-y-6">
          <Block title="Objectifs">
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-brand-cream">
              {workshop.objectives.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </Block>

          <Block title="Programme">
            <ol className="space-y-3 text-sm text-brand-cream">
              {workshop.programme.map((step, i) => (
                <li key={i}>
                  <div className="flex gap-3">
                    <span className="shrink-0 text-brand-accent">{i + 1}.</span>
                    <div className="flex-1">
                      <div className="font-medium">{step.title}</div>
                      {step.items && step.items.length > 0 && (
                        <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm leading-relaxed text-brand-muted-on-dark">
                          {step.items.map((it, j) => (
                            <li key={j}>{it}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Block>

          <Block title="Pour qui ?">
            <p className="text-xs uppercase tracking-wider text-brand-muted-on-dark">
              Cet atelier est pertinent si :
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-brand-muted-on-dark">
              {workshop.targetAudience.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </Block>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-brand-border-dark pt-5">
          <p className="text-xs text-brand-muted-on-dark">
            Demandez cet atelier à votre Customer Success Manager.
          </p>
          <button
            type="button"
            disabled
            title="Bientôt disponible"
            className="cursor-not-allowed rounded-full bg-brand-accent px-4 py-2 text-xs font-medium text-brand-dark opacity-70"
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
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
        {title}
      </h3>
      {children}
    </section>
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
          ? `Aucun atelier ne correspond à « ${query.trim()} »`
          : "Aucun atelier pour ces filtres"}
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
