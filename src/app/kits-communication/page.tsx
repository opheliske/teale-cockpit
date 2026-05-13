"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  animationItems,
  emailTopicKits,
  lancementKits,
  type AnimationItem,
  type EmailTopicKit,
  type LancementKit,
} from "./data";
import {
  workshops,
  themes as workshopThemes,
  type Workshop,
} from "@/app/catalogue-ateliers/data";

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

type ThemeId = "lancement" | "animation" | "emails" | "kits-ateliers";

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

const LETSTALK_LISTING_URL =
  "https://app.livestorm.co/teale-1/upcoming?limit=5";

type UpcomingLetsTalk = {
  id: string;
  title: string;
  dateLabel: string;
  timeUntil: string;
  duration: string;
  language: "FR" | "EN";
  url: string;
};

const upcomingLetsTalks: UpcomingLetsTalk[] = [
  {
    id: "lt-ia",
    title: "L'IA et vous : adopter les bons réflexes",
    dateLabel: "Jeudi 21 mai 2026 — 11h30 (CEST)",
    timeUntil: "Dans 8 jours",
    duration: "Environ 1 heure",
    language: "FR",
    url: "https://app.livestorm.co/p/0caf0a67-08b2-42d9-a92a-0f13c90767b1",
  },
  {
    id: "lt-burnout-en",
    title: "Goodbye Burnout!",
    dateLabel: "Wednesday 17 June 2026 — 16:30 (CEST)",
    timeUntil: "In about 1 month",
    duration: "About 1 hour",
    language: "EN",
    url: "https://app.livestorm.co/p/aa4e15e2-3647-432c-bb2c-b741bfa463d6",
  },
  {
    id: "lt-burnout-fr",
    title: "Burnout : parler du travail peut protéger",
    dateLabel: "Vendredi 19 juin 2026 — 11h30 (CEST)",
    timeUntil: "Dans environ 1 mois",
    duration: "Environ 1 heure",
    language: "FR",
    url: "https://app.livestorm.co/p/41f11be5-bf03-453e-8948-ba189b9212a7",
  },
  {
    id: "lt-keep-well",
    title: "Key steps to keep yourself well",
    dateLabel: "Thursday 15 October 2026 — 16:30 (CEST)",
    timeUntil: "In 5 months",
    duration: "About 1 hour",
    language: "EN",
    url: "https://app.livestorm.co/p/9c554bbc-d4d7-4987-b8aa-af32291b47a5",
  },
];

const themes: Theme[] = [
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
];

function statusStyle(status: string): string {
  if (status.includes("Current")) return "bg-brand-accent/15 text-brand-accent";
  if (status.includes("Upcoming")) return "bg-brand-highlight/15 text-brand-highlight";
  return "bg-brand-muted-on-dark/15 text-brand-muted-on-dark";
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
  | {
      kind: "workshop-kit";
      workshop: Workshop;
      kitType: WorkshopKitType;
      language: "FR" | "EN";
    };

export default function KitsCommunicationPage() {
  const [search, setSearch] = useState("");
  const [activeTheme, setActiveTheme] = useState<ThemeId>("animation");
  const [activeLanguage, setActiveLanguage] = useState<"FR" | "EN">("FR");
  const [activeCard, setActiveCard] = useState<ActiveCard | null>(null);

  const lower = search.trim().toLowerCase();

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
    [lower, activeTheme, activeLanguage]
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
    [lower, activeTheme, activeLanguage]
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
    [lower, activeTheme, activeLanguage]
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
    [lower, activeTheme]
  );

  const totalVisible =
    filteredLancement.length +
    filteredAnimation.length +
    filteredEmails.length +
    filteredWorkshops.length;
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

  const totalKits =
    animationItems.length +
    emailTopicKits.length +
    lancementKits.length +
    workshops.length;
  const newInMay = animationItems.filter(
    (a) => a.month === TODAY_MONTH
  ).length;

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
              Kits de communication
            </p>
            <h1 className="mt-4 max-w-3xl text-5xl font-medium leading-[1.05] tracking-tight text-brand-cream">
              Votre bibliothèque de contenus prêts à l&apos;emploi
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-brand-muted-on-dark">
              Communiquez efficacement autour de Teale : kits de lancement,
              actualités mensuelles, templates d&apos;emails par thématique.
              Téléchargez ou copiez les ressources en un clic.
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
            {showAnimation && (
              <FeaturedSection
                items={filteredAnimation}
                letsTalks={upcomingLetsTalks.filter(
                  (lt) => lt.language === activeLanguage
                )}
                onOpen={(a) => setActiveCard({ kind: "animation", data: a })}
              />
            )}
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

const COMM_GRADIENTS = [
  "bg-gradient-to-br from-[#2d6b62] to-[#4cbfa6]",
  "bg-gradient-to-br from-[#b3826b] to-[#efb8ad]",
  "bg-gradient-to-br from-[#2a7d4a] to-[#a8e895]",
  "bg-gradient-to-br from-[#4d6961] to-[#c2bbab]",
  "bg-gradient-to-br from-[#8fb6c7] to-[#2d6b62]",
  "bg-gradient-to-br from-[#163834] to-[#2a7d4a]",
];

function pickGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COMM_GRADIENTS[h % COMM_GRADIENTS.length];
}

function pickEmoji(title: string): string {
  const t = title.toLowerCase();
  if (/burnout|épuisement|epuisement|burn/.test(t)) return "🔥";
  if (/stress.*financier|financ/.test(t)) return "💰";
  if (/parcours pma|pma|fertility|amour|love|cerveau, amour/.test(t)) return "💞";
  if (/sommeil|sleep|insomnie/.test(t)) return "😴";
  if (/manager|gestion|charge|change/.test(t)) return "🧠";
  if (/qvct|nature|jardin|méditation|meditation/.test(t)) return "🌿";
  if (/ia |ai|intelligence/.test(t)) return "🤖";
  if (/noël|noel|christmas/.test(t)) return "🎄";
  if (/solitude|loneli/.test(t)) return "🎵";
  if (/confiance|aide|cohésion|cohesion|aidant/.test(t)) return "💪";
  if (/rumeur|ragot|gossip|protég/.test(t)) return "🛡️";
  if (/hormonal|alimentation|nourriture/.test(t)) return "🍎";
  if (/handicap|inclusion/.test(t)) return "🤝";
  if (/tabac|smoke|alcool|addic/.test(t)) return "🚭";
  if (/octobre rose|cancer/.test(t)) return "🎗️";
  return "✨";
}

function FeaturedSection({
  items,
  letsTalks,
  onOpen,
}: {
  items: AnimationItem[];
  letsTalks: UpcomingLetsTalk[];
  onOpen: (it: AnimationItem) => void;
}) {
  const featured = items.filter(
    (a) => a.month === TODAY_MONTH && a.type !== "Let's talk"
  );
  const mainTalk = letsTalks[0];
  const nextTalk = letsTalks[1];

  return (
    <section>
      <header className="mb-5">
        <h2 className="flex items-center gap-3 text-2xl font-medium tracking-tight text-brand-cream">
          <span className="text-brand-green-bright" aria-hidden>
            ✦
          </span>
          À la une
        </h2>
        <p className="mt-1.5 ml-1 text-sm text-brand-muted-on-dark">
          À relayer dès maintenant — événements à venir et communications en
          cours.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1.4fr]">
        {mainTalk && <LiveTalkFeaturedCard main={mainTalk} next={nextTalk} />}

        {featured.length > 0 && (
          <div>
            <div className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em]">
              <span className="text-brand-cream/80">
                📢 Communications du mois — {monthLabel[TODAY_MONTH]?.toLowerCase()}
              </span>
              <span className="font-normal text-brand-muted-on-dark normal-case tracking-normal">
                {featured.length} disponibles
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {featured.map((it) => (
                <CommCoverCard
                  key={it.id}
                  item={it}
                  onOpen={() => onOpen(it)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function LiveTalkFeaturedCard({
  main,
  next,
}: {
  main: UpcomingLetsTalk;
  next?: UpcomingLetsTalk;
}) {
  return (
    <article className="overflow-hidden rounded-3xl border border-brand-border-dark bg-brand-surface">
      <div className="relative overflow-hidden bg-gradient-to-br from-[#2d6b62] to-[#163834] px-6 pb-14 pt-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-brand-green-bright/25 blur-2xl"
        />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-green-bright/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-green-bright">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green-bright opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-green-bright" />
            </span>
            En direct bientôt
          </div>
          <h3 className="mt-3 text-2xl font-medium leading-tight tracking-tight text-brand-cream">
            {main.title}
          </h3>
          <p className="mt-2 text-sm text-brand-cream/80">
            {main.dateLabel} ·{" "}
            {main.language === "FR" ? "En français 🇫🇷" : "En anglais 🇬🇧"}
          </p>
        </div>
      </div>
      <div className="relative -mt-9 px-6 pb-5 pt-6">
        <div className="mb-4 flex items-center gap-4 text-[13px] text-brand-muted-on-dark">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden>⏱</span> {main.duration}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden>📅</span> {main.timeUntil}
          </span>
        </div>
        <div className="flex gap-2.5">
          <a
            href={main.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-full bg-brand-green-bright px-4 py-3 text-center text-sm font-semibold text-[#142d24] transition-colors hover:bg-brand-green-bright/90"
          >
            S&apos;inscrire
          </a>
          <button
            type="button"
            className="rounded-full border border-brand-border-dark px-4 py-3 text-sm text-brand-cream transition-colors hover:bg-brand-surface"
          >
            Voir le kit de relais
          </button>
        </div>
      </div>
      {next && (
        <div className="flex items-center gap-3.5 border-t border-brand-border-dark px-6 py-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#c4937a] to-[#8a5b48] font-medium text-white">
            {next.title.trim().charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-muted-on-dark">
              Prochaine session
            </div>
            <div className="truncate text-sm text-brand-cream">
              {next.title}
            </div>
            <div className="truncate text-xs text-brand-muted-on-dark">
              {next.timeUntil} ·{" "}
              {next.language === "FR" ? "En français 🇫🇷" : "En anglais 🇬🇧"}
            </div>
          </div>
          <a
            href={next.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-full border border-brand-border-dark px-3 py-2 text-[11px] text-brand-cream hover:bg-brand-surface"
          >
            Détails
          </a>
        </div>
      )}
    </article>
  );
}

function CommCoverCard({
  item,
  onOpen,
}: {
  item: AnimationItem;
  onOpen: () => void;
}) {
  const gradient = pickGradient(item.id);
  const emoji = pickEmoji(item.title);
  const hasLanding = !!item.landing;
  const totalVisuals = item.imagesFr.length + item.imagesEn.length;
  const langLabel =
    item.languages.length === 2
      ? "FR/EN"
      : item.languages[0] ?? "FR";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-2xl border border-brand-border-dark bg-brand-surface text-left transition-all hover:-translate-y-0.5 hover:border-brand-green-bright/40"
    >
      <div className={`relative h-20 overflow-hidden ${gradient}`}>
        <span
          className="absolute bottom-2.5 right-3 text-2xl text-white/80 drop-shadow-md"
          aria-hidden
        >
          {emoji}
        </span>
      </div>
      <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
        <div className="mb-2.5 flex gap-1.5">
          <span className="rounded-full bg-brand-green-bright/15 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-brand-green-bright">
            {item.type === "Let's talk" ? "Let's talk" : "Playlist"}
          </span>
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-brand-muted-on-dark">
            {langLabel}
          </span>
        </div>
        <h4 className="mb-auto text-sm leading-snug text-brand-cream">
          {cleanTitle(item.title)}
        </h4>
        <div className="mt-3.5 flex items-center justify-between text-xs text-brand-muted-on-dark">
          <span>
            {totalVisuals > 0 && `${totalVisuals} visuel${totalVisuals > 1 ? "s" : ""}`}
            {totalVisuals > 0 && hasLanding && " · "}
            {hasLanding && "Landing"}
          </span>
          <span className="font-semibold text-brand-teal-bright">
            Aperçu →
          </span>
        </div>
      </div>
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
  const [activeMonth, setActiveMonth] = useState<string>(TODAY_MONTH);

  const grouped: Record<string, AnimationItem[]> = {};
  for (const it of items) {
    (grouped[it.month] ||= []).push(it);
  }
  const selectedItems = grouped[activeMonth] ?? [];
  const status = monthStatus(activeMonth);

  return (
    <>
      <section>
        <header className="mb-5">
          <h2 className="flex items-center gap-3 text-2xl font-medium tracking-tight text-brand-cream">
            <span aria-hidden>📅</span>
            Calendrier annuel
          </h2>
          <p className="mt-1.5 ml-1 text-sm text-brand-muted-on-dark">
            Cliquez sur un mois pour voir les communications associées.
          </p>
        </header>

        <CalendarBanner
          items={items}
          activeMonth={activeMonth}
          onSelect={setActiveMonth}
        />
      </section>

      <section>
        <SelectedMonthHeader
          month={activeMonth}
          status={status}
          count={selectedItems.length}
        />

        {selectedItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-brand-border-dark bg-brand-surface/30 px-6 py-10 text-center">
            <p className="text-sm text-brand-muted-on-dark">
              Aucune communication programmée ce mois-ci.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {selectedItems.map((it) => (
              <BigCommCard
                key={it.id}
                item={it}
                onOpen={() => onOpen(it)}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function BigCommCard({
  item,
  onOpen,
}: {
  item: AnimationItem;
  onOpen: () => void;
}) {
  const gradient = pickGradient(item.id);
  const emoji = pickEmoji(item.title);
  const status = monthStatus(item.month);
  const isLetsTalk = item.type === "Let's talk";
  const isCurrent = status === "current";
  const hasLanding = !!item.landing;
  const totalVisuals = item.imagesFr.length + item.imagesEn.length;
  const langLabel =
    item.languages.length === 2
      ? "FR/EN"
      : item.languages[0] ?? "FR";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-3xl border border-brand-border-dark bg-brand-surface text-left transition-all hover:-translate-y-1 hover:border-brand-green-bright/40"
    >
      <div className={`relative flex h-28 items-end p-3.5 ${gradient}`}>
        <span
          className="text-3xl drop-shadow-md"
          aria-hidden
        >
          {emoji}
        </span>
      </div>
      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          <span
            className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] ${
              isLetsTalk
                ? "bg-brand-salmon/15 text-brand-salmon"
                : "bg-brand-green-bright/15 text-brand-green-bright"
            }`}
          >
            {isLetsTalk ? "Let's talk" : "Playlist"}
          </span>
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-brand-muted-on-dark">
            {langLabel}
          </span>
          {isCurrent && (
            <span className="rounded-full bg-brand-green-bright/15 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-brand-green-bright">
              En ce moment
            </span>
          )}
        </div>
        <h4 className="mb-auto text-[15px] font-medium leading-snug text-brand-cream">
          {cleanTitle(item.title)}
        </h4>
        <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3.5 text-xs text-brand-muted-on-dark">
          <span>
            {totalVisuals > 0 && `${totalVisuals} visuel${totalVisuals > 1 ? "s" : ""}`}
            {totalVisuals > 0 && hasLanding && " · "}
            {hasLanding && "Landing"}
            {totalVisuals === 0 && !hasLanding && "—"}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-brand-teal-bright">
            Aperçu →
          </span>
        </div>
      </div>
    </button>
  );
}

function LetsTalksList() {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-muted-on-dark">
          <span aria-hidden>📺</span> Prochains Let&apos;s Talks
        </h3>
        <a
          href={LETSTALK_LISTING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-brand-accent hover:underline"
        >
          Ouvrir Livestorm
          <span aria-hidden>↗</span>
        </a>
      </div>
      <div className="overflow-hidden rounded-xl border border-brand-border-dark bg-white">
        <iframe
          src={LETSTALK_LISTING_URL}
          title="Prochains Let's Talks teale"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="block h-[420px] w-full border-0"
        />
      </div>
    </div>
  );
}

function LetsTalkRow({ item }: { item: UpcomingLetsTalk }) {
  const langLabel =
    item.language === "FR" ? "En français 🇫🇷" : "En anglais 🇬🇧";
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-4 rounded-xl border border-transparent bg-brand-surface px-4 py-3 transition-colors hover:border-brand-accent/40"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#E6AA99]/15 text-[#E6AA99]">
        <span aria-hidden>📺</span>
      </span>
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-medium text-brand-cream">
          {item.title}
        </h4>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-brand-muted-on-dark">
          <span className="text-brand-accent">{item.timeUntil}</span>
          <span aria-hidden>·</span>
          <span>{item.duration}</span>
          <span aria-hidden>·</span>
          <span>{langLabel}</span>
        </div>
      </div>
      <div className="hidden shrink-0 text-right sm:block">
        <div className="text-[12px] font-medium text-brand-cream">
          {item.dateLabel}
        </div>
      </div>
      <span className="ml-2 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-accent px-3 py-1.5 text-[11px] font-medium text-brand-dark transition-colors group-hover:bg-brand-accent/90">
        S&apos;inscrire
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M15 3h6v6" />
          <path d="M10 14 21 3" />
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        </svg>
      </span>
    </a>
  );
}

function SelectedMonthHeader({
  month,
  status,
  count,
}: {
  month: string;
  status: MonthStatus;
  count: number;
}) {
  const config: Record<
    MonthStatus,
    {
      label: string;
      description: string;
      borderClass: string;
      bgClass: string;
      textClass: string;
      barClass: string;
      badgeClass: string;
    }
  > = {
    past: {
      label: "Passé",
      description: "Communications déjà diffusées ce mois-ci.",
      borderClass: "border-brand-muted-on-dark/30",
      bgClass: "bg-brand-muted-on-dark/[0.05]",
      textClass: "text-brand-muted-on-dark",
      barClass: "bg-brand-muted-on-dark/60",
      badgeClass: "bg-brand-muted-on-dark/15 text-brand-muted-on-dark",
    },
    current: {
      label: "En cours",
      description: "Communications actives ce mois-ci, à relayer dès maintenant.",
      borderClass: "border-brand-accent/50",
      bgClass: "bg-brand-accent/[0.06]",
      textClass: "text-brand-accent",
      barClass: "bg-brand-accent",
      badgeClass: "bg-brand-accent/20 text-brand-accent",
    },
    upcoming: {
      label: "À venir",
      description: "Communications à préparer pour ce mois.",
      borderClass: "border-brand-upcoming/50",
      bgClass: "bg-brand-upcoming/[0.06]",
      textClass: "text-brand-upcoming",
      barClass: "bg-brand-upcoming",
      badgeClass: "bg-brand-upcoming/20 text-brand-upcoming",
    },
  };
  const c = config[status];
  if (status === "current") {
    return (
      <header className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-[#f4ecd8] to-[#ead9c0] px-7 py-6 text-[#244038]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-accent/30 blur-2xl"
        />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-3 text-3xl font-medium tracking-tight">
              {monthLabel[month] ?? month} 2026
              <span className="rounded-full bg-[#2a7d4a]/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#1f5d37]">
                En cours
              </span>
            </h3>
            <p className="mt-1 text-sm text-[#4d6961]">{c.description}</p>
          </div>
          <div className="text-right">
            <div className="text-5xl font-semibold leading-none text-[#2a7d4a]">
              {count}
            </div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4d6961]">
              Communication{count > 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </header>
    );
  }
  return (
    <header
      className={`relative mb-5 overflow-hidden rounded-2xl border ${c.borderClass} ${c.bgClass} px-5 py-4`}
    >
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-1 ${c.barClass}`}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 pl-2">
        <div>
          <div className="flex items-baseline gap-3">
            <h3 className="text-2xl font-medium text-brand-cream">
              {monthLabel[month] ?? month} 2026
            </h3>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${c.badgeClass}`}
            >
              {c.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-brand-muted-on-dark">
            {c.description}
          </p>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-medium leading-none ${c.textClass}`}>
            {count}
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-wider text-brand-muted-on-dark">
            communication{count > 1 ? "s" : ""}
          </div>
        </div>
      </div>
    </header>
  );
}

function CalendarBanner({
  items,
  activeMonth,
  onSelect,
}: {
  items: AnimationItem[];
  activeMonth: string;
  onSelect: (m: string) => void;
}) {
  const summary: Record<
    string,
    { letsTalk?: string; kit?: string; count: number }
  > = {};
  for (const m of allMonths) summary[m] = { count: 0 };
  for (const it of items) {
    const s = summary[it.month];
    if (!s) continue;
    s.count += 1;
    if (it.type === "Let's talk" && !s.letsTalk) {
      s.letsTalk = cleanTitle(it.title);
    } else if (it.type === "Playlist" && !s.kit) {
      s.kit = cleanTitle(it.title);
    }
  }

  return (
    <div className="rounded-3xl border border-brand-border-dark bg-brand-surface p-6 sm:p-7">
      <div className="mb-5 flex flex-wrap items-center gap-5 text-[12px] text-brand-muted-on-dark">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-brand-muted-on-dark/40" />
          Passé
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-brand-green-bright shadow-[0_0_0_3px_rgba(168,232,149,0.2)]" />
          En cours
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-brand-salmon" />
          À venir
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {allMonths.map((month) => {
          const s = summary[month];
          const status = monthStatus(month);
          const isActive = month === activeMonth;
          const isFutureEmpty = status === "upcoming" && s.count === 0;

          let cellClasses =
            "min-h-[110px] cursor-pointer rounded-2xl border bg-brand-dark/40 p-3.5 text-left transition-all";
          if (isActive) {
            cellClasses +=
              " border-brand-green-bright bg-brand-green-bright/15 shadow-[0_0_0_2px_rgba(168,232,149,0.25)]";
          } else if (status === "current") {
            cellClasses +=
              " border-brand-green-bright/50 bg-brand-green-bright/[0.10] hover:bg-brand-green-bright/15";
          } else if (status === "past") {
            cellClasses +=
              " border-transparent opacity-55 hover:opacity-100 hover:border-brand-border-dark";
          } else {
            cellClasses +=
              " border-transparent hover:border-brand-border-dark";
          }

          const monthNameClass =
            isActive || status === "current"
              ? "text-brand-green-bright"
              : "text-brand-cream/80";

          const countBadgeClass = isFutureEmpty
            ? "bg-brand-salmon/15 text-brand-salmon"
            : isActive || status === "current"
              ? "bg-brand-green-bright/25 text-brand-green-bright"
              : "bg-white/[0.06] text-brand-cream";

          return (
            <button
              key={month}
              type="button"
              onClick={() => onSelect(month)}
              aria-pressed={isActive}
              className={cellClasses}
            >
              <div className="mb-2.5 flex items-center justify-between">
                <span
                  className={`text-[11px] font-bold uppercase tracking-[0.14em] ${monthNameClass}`}
                >
                  {(monthLabel[month] ?? month).slice(0, 4)}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${countBadgeClass}`}
                >
                  {s.count > 0 ? s.count : "—"}
                </span>
              </div>
              <div
                className={`space-y-1 text-[11.5px] leading-relaxed ${
                  isFutureEmpty
                    ? "text-brand-muted-on-dark/60"
                    : "text-brand-muted-on-dark"
                }`}
              >
                {isFutureEmpty ? (
                  <div className="truncate">À programmer</div>
                ) : (
                  <>
                    {s.letsTalk && (
                      <div className="truncate">
                        {pickEmoji(s.letsTalk)}{" "}
                        {s.letsTalk.slice(0, 26)}
                        {s.letsTalk.length > 26 && "…"}
                      </div>
                    )}
                    {s.kit && (
                      <div className="truncate">
                        🎵 {s.kit.slice(0, 26)}
                        {s.kit.length > 26 && "…"}
                      </div>
                    )}
                    {!s.letsTalk && !s.kit && (
                      <div className="truncate">—</div>
                    )}
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
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

function AnimationCard({
  item,
  onOpen,
}: {
  item: AnimationItem;
  onOpen: () => void;
}) {
  const totalImages = item.imagesFr.length + item.imagesEn.length;
  const totalPdfs = item.pdfFr.length + item.pdfEn.length;
  const isCurrent = item.status.includes("Current");

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-full flex-col rounded-xl border border-transparent bg-brand-surface p-4 text-left transition-colors hover:border-brand-accent/40"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${typeStyle(item.type)}`}
        >
          {item.type}
        </span>
        {item.languages.map((l) => (
          <span
            key={l}
            className="rounded-full bg-brand-cream/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand-cream"
          >
            {l}
          </span>
        ))}
        {isCurrent && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${statusStyle(item.status)}`}
          >
            En ce moment
          </span>
        )}
      </div>

      <h4 className="mt-2 line-clamp-2 text-sm font-medium leading-snug text-brand-cream">
        {item.title}
      </h4>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-brand-muted-on-dark">
        {totalImages > 0 && (
          <span className="inline-flex items-center gap-1">
            <ImageIcon /> {totalImages}
          </span>
        )}
        {totalPdfs > 0 && (
          <span className="inline-flex items-center gap-1">
            <PdfIcon /> {totalPdfs}
          </span>
        )}
        {item.landing && (
          <span className="inline-flex items-center gap-1">
            <LinkIcon /> Landing
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1 text-brand-accent transition-transform group-hover:translate-x-0.5">
          Aperçu
          <span aria-hidden>→</span>
        </span>
      </div>
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

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        selected
          ? "border-brand-accent bg-brand-accent text-brand-dark"
          : "border-brand-border-dark bg-brand-dark text-brand-cream hover:border-brand-muted-on-dark"
      }`}
    >
      {children}
    </button>
  );
}

function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted-on-dark"
        aria-hidden
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Rechercher un kit, une thématique, un mois…"
        className="w-full rounded-full border border-brand-border-dark bg-brand-dark py-3 pl-12 pr-12 text-sm text-brand-cream placeholder:text-brand-muted-on-dark focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/20"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Effacer la recherche"
          className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-brand-muted-on-dark transition-colors hover:bg-brand-border-dark hover:text-brand-cream"
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
            <path d="M6 6l12 12M6 18 18 6" />
          </svg>
        </button>
      )}
    </div>
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
            body={mockLancementBody(active.data)}
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
            body={mockEmailBody(active.data)}
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
            body={mockWorkshopKitBody(
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
      </div>
    </div>
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
              {name}
            </span>
            <button
              type="button"
              disabled
              title="Bientôt disponible"
              className="inline-flex shrink-0 cursor-not-allowed items-center gap-1.5 rounded-full border border-brand-accent/40 px-3 py-1 text-[11px] font-medium text-brand-accent opacity-70"
            >
              <DownloadIcon /> Télécharger
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function mockWorkshopKitBody(
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

function mockLancementBody(k: LancementKit): string {
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

function mockEmailBody(k: EmailTopicKit): string {
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
