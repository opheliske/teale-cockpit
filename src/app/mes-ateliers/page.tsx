"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { workshops, themes, type Workshop } from "@/app/catalogue-ateliers/data";

type Format = "presentiel" | "distanciel" | "hybride";
type Audience = "RH" | "Elus" | "Managers" | "Collaborateurs" | "Codir";
type ScheduledStatus = "realise" | "annule" | "upcoming";

type ScheduledAtelier = {
  id: string;
  workshopId: string;
  dateLabel: string;
  timeLabel: string;
  isoDate: string;
  format: Format;
  location?: string;
  intervenant: {
    name: string;
    role?: string;
  };
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

const TODAY_ISO = "2026-05-13";

function dayDiff(iso: string): number {
  const today = new Date(TODAY_ISO);
  const target = new Date(iso);
  return Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
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
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(target);
}

const formatConfig: Record<
  Format,
  { label: string; emoji: string; pillClass: string }
> = {
  presentiel: {
    label: "Présentiel",
    emoji: "📍",
    pillClass: "bg-brand-salmon/15 text-brand-salmon",
  },
  distanciel: {
    label: "Distanciel",
    emoji: "💻",
    pillClass: "bg-brand-accent/15 text-brand-accent",
  },
  hybride: {
    label: "Hybride",
    emoji: "🔀",
    pillClass: "bg-brand-green-bright/15 text-brand-green-bright",
  },
};

const audienceConfig: Record<
  Audience,
  { label: string; emoji: string; pillClass: string }
> = {
  RH: { label: "RH", emoji: "👔", pillClass: "bg-brand-accent/15 text-brand-accent" },
  Elus: { label: "Élus", emoji: "🎯", pillClass: "bg-brand-salmon/15 text-brand-salmon" },
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

const statusConfig: Record<
  ScheduledStatus,
  { label: string; pillClass: string; dotClass: string }
> = {
  realise: {
    label: "Réalisé",
    pillClass: "bg-brand-green-bright/20 text-brand-green-bright",
    dotClass: "bg-brand-green-bright",
  },
  annule: {
    label: "Annulé",
    pillClass: "bg-brand-salmon/15 text-brand-salmon",
    dotClass: "bg-brand-salmon",
  },
  upcoming: {
    label: "À venir",
    pillClass: "bg-brand-upcoming/15 text-brand-upcoming",
    dotClass: "bg-brand-upcoming",
  },
};

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

const workshopById = Object.fromEntries(workshops.map((w) => [w.id, w]));
const themeNameById = Object.fromEntries(themes.map((t) => [t.id, t.name]));

const scheduled: ScheduledAtelier[] = [
  {
    id: "atl-jan-cnv",
    workshopId: "cerveau-emotions-reactions",
    dateLabel: "Mardi 14 janvier 2026",
    timeLabel: "10:30 — 11:30",
    isoDate: "2026-01-14",
    format: "distanciel",
    intervenant: { name: "Larissa Kalisch", role: "Psychologue du travail" },
    audiences: ["Collaborateurs", "Managers"],
    attendees: 42,
    satisfaction: 4.6,
    participantFeedbacks: 38,
    participantComments: [
      {
        rating: 5,
        text: "L'atelier a vraiment changé ma façon de m'exprimer en réunion. Merci !",
      },
      {
        rating: 5,
        text: "Beaucoup d'exemples concrets, c'était parfait pour appliquer dès le lendemain.",
      },
      {
        rating: 4,
        text: "Très bonne intervenante, format dynamique et bienveillant.",
      },
      {
        rating: 3,
        text: "Un peu court, j'aurais aimé plus de mises en situation.",
      },
    ],
    clientFeedback: {
      rating: 5,
      comment:
        "Excellent atelier, très bien reçu en interne. Les exemples concrets ont vraiment résonné avec nos équipes.",
    },
  },
  {
    id: "atl-fev-feedback",
    workshopId: "feedback",
    dateLabel: "Jeudi 5 février 2026",
    timeLabel: "14:00 — 15:00",
    isoDate: "2026-02-05",
    format: "hybride",
    location: "Auditorium Paris + Zoom",
    intervenant: { name: "Bérénice Lefevre", role: "Coach RH certifiée" },
    audiences: ["Managers", "RH"],
    attendees: 28,
    satisfaction: 4.8,
    participantFeedbacks: 27,
    participantComments: [
      {
        rating: 5,
        text: "Le format hybride était top, on a pu participer même à distance.",
      },
      {
        rating: 5,
        text: "Très utile pour préparer mes 1-1, je recommande à tous les managers.",
      },
      {
        rating: 4,
        text: "Les exemples sur le télétravail sont particulièrement pertinents.",
      },
      {
        rating: 5,
        text: "J'avais peur du sujet, mais l'animatrice rend tout limpide.",
      },
    ],
    clientFeedback: {
      rating: 5,
      comment:
        "Le format hybride a parfaitement fonctionné, les managers ont apprécié.",
    },
  },
  {
    id: "atl-mar-cohesion",
    workshopId: "cohesion-equipe",
    dateLabel: "Mercredi 11 mars 2026",
    timeLabel: "11:00 — 12:00",
    isoDate: "2026-03-11",
    format: "presentiel",
    location: "Salle Élysée, Tour Eiffel",
    intervenant: { name: "Cécile Pichon", role: "Coach équipe" },
    audiences: ["Managers"],
    cancelled: true,
    cancellationReason:
      "Annulé suite à un conflit d'agenda côté Codir. Report prévu en septembre.",
  },
  {
    id: "atl-avr-charge",
    workshopId: "charge-mentale",
    dateLabel: "Mardi 28 avril 2026",
    timeLabel: "13:00 — 14:00",
    isoDate: "2026-04-28",
    format: "distanciel",
    intervenant: { name: "Priscille D'Arexy", role: "Psychologue clinicienne" },
    audiences: ["Collaborateurs", "Managers", "RH"],
    attendees: 67,
    satisfaction: 4.7,
    participantFeedbacks: 59,
    participantComments: [
      {
        rating: 5,
        text: "On ressort avec des outils concrets pour alléger sa charge mentale au quotidien.",
      },
      {
        rating: 5,
        text: "L'exercice de cartographie de la charge mentale était très éclairant.",
      },
      {
        rating: 5,
        text: "Sujet important traité avec beaucoup de bienveillance, merci teale.",
      },
      {
        rating: 4,
        text: "J'aurais aimé plus de temps pour les questions à la fin.",
      },
      {
        rating: 4,
        text: "Bon atelier, je vais partager les conseils avec mon équipe.",
      },
    ],
    // pas de clientFeedback → en attente d'avis
  },
  {
    id: "atl-mai-csm-prep",
    workshopId: "premiers-pas-sante-mentale",
    dateLabel: "Jeudi 14 mai 2026",
    timeLabel: "09:30 — 10:30",
    isoDate: "2026-05-14",
    format: "hybride",
    location: "Salle Atrium + Teams",
    intervenant: { name: "Lucie Martin", role: "Customer Success Manager" },
    audiences: ["Codir", "RH"],
    registrationLink: "https://app.livestorm.co/teale-1/preparation-rentree",
  },
  {
    id: "atl-mai-stress",
    workshopId: "gerer-son-stress",
    dateLabel: "Vendredi 22 mai 2026",
    timeLabel: "11:00 — 12:00",
    isoDate: "2026-05-22",
    format: "distanciel",
    intervenant: { name: "Marc Dupont", role: "Psychologue du travail" },
    audiences: ["Collaborateurs"],
    registrationLink: "https://app.livestorm.co/teale-1/gestion-stress",
  },
  {
    id: "atl-juin-manager",
    workshopId: "feedback",
    dateLabel: "Mardi 10 juin 2026",
    timeLabel: "14:00 — 15:00",
    isoDate: "2026-06-10",
    format: "presentiel",
    location: "Campus La Défense, salle Mont-Blanc",
    intervenant: { name: "Carola Gawehn", role: "Psychologue & coach" },
    audiences: ["Managers"],
    registrationLink: "https://app.livestorm.co/teale-1/manager-bienveillant",
  },
  {
    id: "atl-juil-handicap",
    workshopId: "handicap-travail",
    dateLabel: "Jeudi 9 juillet 2026",
    timeLabel: "11:00 — 12:00",
    isoDate: "2026-07-09",
    format: "distanciel",
    intervenant: { name: "Adrien Bournas", role: "Psychologue" },
    audiences: ["Collaborateurs", "RH"],
    cancelled: true,
    cancellationReason:
      "Annulé : reporté à la semaine du handicap (novembre) pour cohérence avec le plan de communication.",
  },
  {
    id: "atl-sept-rentree",
    workshopId: "muscler-optimisme",
    dateLabel: "Jeudi 18 septembre 2026",
    timeLabel: "10:00 — 11:00",
    isoDate: "2026-09-18",
    format: "distanciel",
    intervenant: { name: "Milija Simlesa", role: "Psychologue & chercheuse" },
    audiences: ["Collaborateurs"],
  },
  {
    id: "atl-oct-rose",
    workshopId: "maladie-chronique",
    dateLabel: "Vendredi 16 octobre 2026",
    timeLabel: "13:00 — 14:00",
    isoDate: "2026-10-16",
    format: "hybride",
    location: "Auditorium Paris + Livestorm",
    intervenant: { name: "Émilie De Bueil", role: "Psychologue" },
    audiences: ["Collaborateurs", "RH", "Elus"],
  },
  {
    id: "atl-nov-qvct",
    workshopId: "prevenir-rps",
    dateLabel: "Jeudi 20 novembre 2026",
    timeLabel: "11:00 — 12:00",
    isoDate: "2026-11-20",
    format: "presentiel",
    location: "Campus La Défense, grand auditorium",
    intervenant: { name: "Adrien Bournas", role: "Psychologue & RPS expert" },
    audiences: ["RH", "Elus", "Codir"],
  },
];

type FilterId = "all" | "realise" | "annule" | "upcoming";

const filterTabs: { id: FilterId; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "realise", label: "Réalisés" },
  { id: "upcoming", label: "À venir" },
  { id: "annule", label: "Annulés" },
];

export default function MesAteliersPage() {
  const [filter, setFilter] = useState<FilterId>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [feedbacks, setFeedbacks] = useState<
    Record<string, { rating: number; comment: string }>
  >(() => {
    const init: Record<string, { rating: number; comment: string }> = {};
    for (const s of scheduled) {
      if (s.clientFeedback) init[s.id] = s.clientFeedback;
    }
    return init;
  });

  const pendingFeedbackAteliers = useMemo(
    () =>
      scheduled.filter(
        (s) => scheduledStatus(s) === "realise" && !feedbacks[s.id]
      ),
    [feedbacks]
  );

  const submitFeedback = (id: string, rating: number, comment: string) =>
    setFeedbacks((prev) => ({ ...prev, [id]: { rating, comment } }));

  const counts = useMemo(() => {
    const out = {
      realise: 0,
      annule: 0,
      upcoming: 0,
      all: scheduled.length,
    };
    for (const s of scheduled) {
      const st = scheduledStatus(s);
      out[st] += 1;
    }
    return out;
  }, []);

  const filteredOrdered = useMemo(() => {
    const list =
      filter === "all"
        ? [...scheduled]
        : scheduled.filter((s) => scheduledStatus(s) === filter);
    return list.sort((a, b) => {
      const da = dayDiff(a.isoDate);
      const db = dayDiff(b.isoDate);
      const sa = scheduledStatus(a);
      const sb = scheduledStatus(b);
      const rank: Record<ScheduledStatus, number> = {
        upcoming: 0,
        realise: 1,
        annule: 2,
      };
      if (rank[sa] !== rank[sb]) return rank[sa] - rank[sb];
      if (sa === "realise" || sa === "annule") return db - da;
      return da - db;
    });
  }, [filter]);

  const active = activeId
    ? scheduled.find((s) => s.id === activeId) ?? null
    : null;

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
              Pilotage
            </p>
            <h1 className="mt-4 max-w-3xl text-5xl font-medium leading-[1.05] tracking-tight text-brand-cream">
              Mes ateliers programmés
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-brand-muted-on-dark">
              Vos interventions collectives teale — faits, en cours, à venir.
              Cliquez sur un atelier pour consulter le détail complet
              (intervenant, format, audience cible, kit de communication).
            </p>
          </div>
          <div className="flex gap-3">
            <StatPill value={counts.all} label="Ateliers" accent />
            <StatPill value={counts.upcoming} label="À venir" />
          </div>
        </header>

        {pendingFeedbackAteliers.length > 0 && (
          <FeedbackBanner
            count={pendingFeedbackAteliers.length}
            firstAtelierId={pendingFeedbackAteliers[0].id}
            onOpen={(id) => setActiveId(id)}
          />
        )}

        <CancellationPolicyNotice cancelledCount={counts.annule} />

        <div className="mb-6 flex flex-wrap items-center gap-2">
          {filterTabs.map((t) => (
            <PillFilter
              key={t.id}
              selected={filter === t.id}
              onClick={() => setFilter(t.id)}
              count={counts[t.id]}
            >
              {t.label}
            </PillFilter>
          ))}
        </div>

        {filteredOrdered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-brand-border-dark bg-brand-surface/30 px-6 py-16 text-center">
            <p className="text-base font-medium text-brand-cream">
              Aucun atelier dans cette catégorie.
            </p>
            <p className="mt-2 text-sm text-brand-muted-on-dark">
              Changez de filtre pour voir d&apos;autres ateliers.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredOrdered.map((s) => (
              <AtelierCard
                key={s.id}
                scheduled={s}
                clientFeedback={feedbacks[s.id]}
                onOpen={() => setActiveId(s.id)}
              />
            ))}
          </div>
        )}
      </div>

      {active && (
        <AtelierModal
          scheduled={active}
          clientFeedback={feedbacks[active.id]}
          onSubmitFeedback={(rating, comment) =>
            submitFeedback(active.id, rating, comment)
          }
          onClose={() => setActiveId(null)}
        />
      )}
    </div>
  );
}

function CancellationPolicyNotice({
  cancelledCount,
}: {
  cancelledCount: number;
}) {
  return (
    <div className="mb-5 rounded-2xl border border-brand-border-dark bg-brand-surface/60 px-5 py-3.5">
      <div className="flex items-start gap-3">
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-upcoming/15 text-brand-upcoming"
          aria-hidden
        >
          ⚠
        </span>
        <div className="text-[13px] leading-relaxed text-brand-muted-on-dark">
          <span className="font-medium text-brand-cream">
            Politique d&apos;annulation :
          </span>{" "}
          un atelier peut être annulé ou reporté{" "}
          <span className="text-brand-cream">
            jusqu&apos;à 15 jours avant la date prévue
          </span>
          . Passé ce délai, l&apos;annulation n&apos;est plus possible. Tout
          atelier annulé ou reporté est{" "}
          <span className="text-brand-cream">
            décompté de votre forfait annuel
          </span>
          {cancelledCount > 0 && (
            <>
              {" "}
              ({cancelledCount} déjà décompté{cancelledCount > 1 ? "s" : ""} cette année)
            </>
          )}
          .
        </div>
      </div>
    </div>
  );
}

function FeedbackBanner({
  count,
  firstAtelierId,
  onOpen,
}: {
  count: number;
  firstAtelierId: string;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-2xl border border-brand-green-bright/30 bg-brand-green-bright/[0.06] px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="relative mt-0.5 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green-bright opacity-70" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-green-bright" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-brand-cream">
            {count === 1
              ? "1 atelier attend votre retour"
              : `${count} ateliers attendent votre retour`}
          </h2>
          <p className="mt-0.5 text-[13px] text-brand-muted-on-dark">
            Votre CSM apprécierait votre note et vos commentaires pour ajuster
            les prochaines interventions.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onOpen(firstAtelierId)}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-green-bright px-4 py-2 text-[13px] font-semibold text-brand-dark transition-colors hover:bg-brand-green-bright/90"
      >
        Donner mon feedback
        <span aria-hidden>→</span>
      </button>
    </div>
  );
}

function AtelierCard({
  scheduled,
  clientFeedback,
  onOpen,
}: {
  scheduled: ScheduledAtelier;
  clientFeedback?: { rating: number; comment: string };
  onOpen: () => void;
}) {
  const workshop = workshopById[scheduled.workshopId];
  if (!workshop) return null;
  const gradient = themeGradient[workshop.themeId] ?? themeGradient.relations;
  const emoji = pickWorkshopEmoji(workshop);
  const status = scheduledStatus(scheduled);
  const sCfg = statusConfig[status];
  const fmtCfg = formatConfig[scheduled.format];
  const needsFeedback = status === "realise" && !clientFeedback;

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
        <span
          className={`absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur-sm`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${sCfg.dotClass}`} />
          {sCfg.label}
        </span>
      </div>
      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-brand-cream/10 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-brand-cream">
            {themeNameById[workshop.themeId] ?? "Atelier"}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] ${fmtCfg.pillClass}`}
          >
            {fmtCfg.emoji} {fmtCfg.label}
          </span>
        </div>
        <h3 className="text-[15px] font-medium leading-snug text-brand-cream">
          {workshop.title}
        </h3>
        <div className="mt-2 text-[12px] text-brand-muted-on-dark">
          {scheduled.dateLabel} · {scheduled.timeLabel}
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {scheduled.audiences.slice(0, 3).map((a) => (
            <span
              key={a}
              className="rounded-full bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-brand-cream"
            >
              {audienceConfig[a].emoji} {audienceConfig[a].label}
            </span>
          ))}
          {scheduled.audiences.length > 3 && (
            <span className="rounded-full bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-brand-muted-on-dark">
              +{scheduled.audiences.length - 3}
            </span>
          )}
        </div>
        {status === "realise" && scheduled.satisfaction !== undefined && (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-brand-dark/40 px-3 py-2">
            <div className="flex items-center gap-2">
              <StarRating value={scheduled.satisfaction} />
              <span className="text-[12px] font-medium text-brand-cream">
                {scheduled.satisfaction.toFixed(1)}/5
              </span>
            </div>
            <span className="text-[10px] text-brand-muted-on-dark">
              {scheduled.participantFeedbacks ?? "—"} avis
            </span>
          </div>
        )}
        {needsFeedback && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-green-bright/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-green-bright">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green-bright opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-green-bright" />
            </span>
            Votre avis attendu
          </div>
        )}
        <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-3.5 text-xs">
          <span className="text-brand-muted-on-dark">
            👤 {scheduled.intervenant.name}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-brand-teal-bright transition-transform group-hover:translate-x-0.5">
            Détail →
          </span>
        </div>
      </div>
    </button>
  );
}

function StarRating({
  value,
  size = "sm",
}: {
  value: number;
  size?: "sm" | "md" | "lg";
}) {
  const stars: ("full" | "half" | "empty")[] = [];
  for (let i = 0; i < 5; i++) {
    const diff = value - i;
    if (diff >= 0.75) stars.push("full");
    else if (diff >= 0.25) stars.push("half");
    else stars.push("empty");
  }
  const sizeClass =
    size === "lg" ? "text-xl" : size === "md" ? "text-base" : "text-sm";
  return (
    <span
      className={`inline-flex items-center gap-0.5 leading-none ${sizeClass}`}
      aria-label={`Note : ${value.toFixed(1)} sur 5`}
    >
      {stars.map((s, i) => (
        <span
          key={i}
          className={
            s === "empty" ? "text-brand-muted-on-dark/40" : "text-brand-green-bright"
          }
          aria-hidden
        >
          {s === "half" ? "★" : s === "full" ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
}

function AtelierModal({
  scheduled,
  clientFeedback,
  onSubmitFeedback,
  onClose,
}: {
  scheduled: ScheduledAtelier;
  clientFeedback?: { rating: number; comment: string };
  onSubmitFeedback: (rating: number, comment: string) => void;
  onClose: () => void;
}) {
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [draftRating, setDraftRating] = useState(0);
  const [draftComment, setDraftComment] = useState("");

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

  const workshop = workshopById[scheduled.workshopId];
  if (!workshop) return null;
  const status = scheduledStatus(scheduled);
  const sCfg = statusConfig[status];
  const fmtCfg = formatConfig[scheduled.format];
  const gradient = themeGradient[workshop.themeId] ?? themeGradient.relations;
  const emoji = pickWorkshopEmoji(workshop);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-6 backdrop-blur-sm sm:p-10"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="atelier-modal-title"
    >
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-brand-border-dark bg-brand-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`relative flex h-32 items-end p-5 ${gradient}`}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
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
          <span className="text-4xl drop-shadow-md" aria-hidden>
            {emoji}
          </span>
          <span className="absolute right-16 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur-sm">
            <span className={`h-1.5 w-1.5 rounded-full ${sCfg.dotClass}`} />
            {sCfg.label}
          </span>
        </div>

        <div className="p-6 sm:p-7">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-brand-cream/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-cream">
              {themeNameById[workshop.themeId] ?? "Atelier"}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${fmtCfg.pillClass}`}
            >
              {fmtCfg.emoji} {fmtCfg.label}
            </span>
            <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-cream">
              {workshop.duration}
            </span>
          </div>
          <h2
            id="atelier-modal-title"
            className="mt-3 text-2xl font-medium leading-snug tracking-tight text-brand-cream"
          >
            {workshop.title}
          </h2>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoBlock
              icon="🗓"
              label="Date & heure"
              value={`${scheduled.dateLabel} · ${scheduled.timeLabel}`}
            />
            <InfoBlock
              icon={fmtCfg.emoji}
              label="Format"
              value={
                scheduled.location
                  ? `${fmtCfg.label} — ${scheduled.location}`
                  : fmtCfg.label
              }
            />
            <InfoBlock
              icon="👤"
              label="Intervenant"
              value={scheduled.intervenant.name}
              sub={scheduled.intervenant.role}
            />
            <InfoBlock
              icon="🎯"
              label="Audience cible"
              value={
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {scheduled.audiences.map((a) => {
                    const c = audienceConfig[a];
                    return (
                      <span
                        key={a}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${c.pillClass}`}
                      >
                        {c.emoji} {c.label}
                      </span>
                    );
                  })}
                </div>
              }
            />
          </div>

          <Section title="Présentation de l'atelier">
            <ul className="space-y-1.5 text-sm text-brand-cream">
              {workshop.objectives.map((o, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span
                    className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green-bright"
                    aria-hidden
                  />
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
                    <span className="shrink-0 text-brand-teal-bright">
                      {i + 1}.
                    </span>
                    <div className="flex-1">
                      <div className="font-medium">{p.title}</div>
                      {p.items && p.items.length > 0 && (
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-brand-muted-on-dark">
                          {p.items.map((it, j) => (
                            <li key={j}>{it}</li>
                          ))}
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
              Retrouvez les templates complets dans la rubrique{" "}
              <span className="text-brand-teal-bright">
                Kits de communication
              </span>
              .
            </p>
          </Section>

          {status === "realise" && scheduled.attendees !== undefined && (
            <Section title="Bilan des participants">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-brand-border-dark bg-brand-dark/40 p-3">
                  <div className="text-2xl font-medium text-brand-cream">
                    {scheduled.attendees}
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-brand-muted-on-dark">
                    Participants
                  </div>
                </div>
                {scheduled.satisfaction !== undefined && (
                  <div className="rounded-xl border border-brand-border-dark bg-brand-dark/40 p-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-medium text-brand-green-bright">
                        {scheduled.satisfaction.toFixed(1)}
                      </span>
                      <span className="text-[11px] text-brand-muted-on-dark">
                        / 5
                      </span>
                    </div>
                    <div className="mt-1">
                      <StarRating value={scheduled.satisfaction} size="md" />
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-wider text-brand-muted-on-dark">
                      Note globale
                    </div>
                  </div>
                )}
                {scheduled.participantFeedbacks !== undefined && (
                  <div className="rounded-xl border border-brand-border-dark bg-brand-dark/40 p-3">
                    <div className="text-2xl font-medium text-brand-cream">
                      {scheduled.participantFeedbacks}
                    </div>
                    <div className="text-[11px] uppercase tracking-wider text-brand-muted-on-dark">
                      Avis reçus
                    </div>
                  </div>
                )}
              </div>
            </Section>
          )}

          {status === "realise" &&
            scheduled.participantComments &&
            scheduled.participantComments.length > 0 && (
              <ParticipantCommentsSection
                comments={scheduled.participantComments}
                totalFeedbacks={scheduled.participantFeedbacks}
              />
            )}

          {status === "realise" && (
            <Section title="Votre feedback">
              {clientFeedback ? (
                <div className="rounded-xl border border-brand-green-bright/40 bg-brand-green-bright/[0.06] p-4">
                  <div className="flex items-center gap-2">
                    <StarRating value={clientFeedback.rating} size="md" />
                    <span className="text-sm font-medium text-brand-cream">
                      {clientFeedback.rating}/5
                    </span>
                  </div>
                  {clientFeedback.comment && (
                    <p className="mt-3 text-sm italic text-brand-muted-on-dark">
                      « {clientFeedback.comment} »
                    </p>
                  )}
                  <p className="mt-3 text-[11px] text-brand-muted-on-dark">
                    Feedback envoyé à votre CSM.
                  </p>
                </div>
              ) : showFeedbackForm ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (draftRating > 0) {
                      onSubmitFeedback(draftRating, draftComment.trim());
                    }
                  }}
                  className="rounded-xl border border-brand-green-bright/40 bg-brand-green-bright/[0.04] p-4"
                >
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted-on-dark">
                      Votre note
                    </span>
                    <div className="mt-2 flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setDraftRating(n)}
                          aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
                          className={`text-3xl leading-none transition-colors ${
                            n <= draftRating
                              ? "text-brand-green-bright"
                              : "text-brand-muted-on-dark/40 hover:text-brand-green-bright/60"
                          }`}
                        >
                          ★
                        </button>
                      ))}
                      {draftRating > 0 && (
                        <span className="ml-2 text-sm text-brand-cream">
                          {draftRating}/5
                        </span>
                      )}
                    </div>
                  </label>
                  <label className="mt-4 block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted-on-dark">
                      Commentaire <span className="font-normal opacity-70">(optionnel)</span>
                    </span>
                    <textarea
                      value={draftComment}
                      onChange={(e) => setDraftComment(e.target.value)}
                      placeholder="Qu'est-ce qui a bien fonctionné ? Qu'amélioreriez-vous ?"
                      rows={3}
                      className="mt-2 w-full resize-none rounded-lg border border-brand-border-dark bg-brand-dark px-3 py-2 text-sm text-brand-cream placeholder:text-brand-muted-on-dark focus:border-brand-green-bright focus:outline-none"
                    />
                  </label>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={draftRating === 0}
                      className="inline-flex items-center gap-1.5 rounded-full bg-brand-green-bright px-4 py-2 text-[13px] font-semibold text-brand-dark transition-colors hover:bg-brand-green-bright/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Envoyer mon feedback
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowFeedbackForm(false);
                        setDraftRating(0);
                        setDraftComment("");
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-brand-border-dark px-4 py-2 text-[13px] text-brand-cream hover:bg-brand-surface"
                    >
                      Annuler
                    </button>
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
                      <p className="text-sm font-medium text-brand-cream">
                        Votre CSM apprécierait votre retour.
                      </p>
                      <p className="mt-1 text-[13px] text-brand-muted-on-dark">
                        Comment s&apos;est passé cet atelier de votre point de
                        vue ? Votre note nous aide à améliorer les prochaines
                        interventions.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFeedbackForm(true)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-green-bright px-4 py-2 text-[13px] font-semibold text-brand-dark transition-colors hover:bg-brand-green-bright/90"
                  >
                    Donner mon feedback
                    <span aria-hidden>→</span>
                  </button>
                </div>
              )}
            </Section>
          )}

          {status === "upcoming" && (
            <UpcomingCancellationNotice isoDate={scheduled.isoDate} />
          )}

          {status === "annule" && (
            <Section title="Atelier annulé">
              <div className="rounded-xl border border-brand-salmon/30 bg-brand-salmon/[0.06] p-4">
                {scheduled.cancellationReason && (
                  <p className="text-sm leading-relaxed text-brand-cream">
                    {scheduled.cancellationReason}
                  </p>
                )}
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-salmon/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-salmon">
                  <span aria-hidden>⊖</span> Décompté de votre forfait
                </p>
              </div>
            </Section>
          )}

          {status === "upcoming" && scheduled.registrationLink && (
            <div className="mt-6 flex flex-wrap gap-2 border-t border-brand-border-dark pt-5">
              <a
                href={scheduled.registrationLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-green-bright px-4 py-2 text-[12px] font-semibold text-brand-dark transition-colors hover:bg-brand-green-bright/90"
              >
                Ouvrir Livestorm
                <span aria-hidden>↗</span>
              </a>
              <span className="self-center text-[11px] text-brand-muted-on-dark">
                Lien à diffuser à vos collaborateurs.
              </span>
            </div>
          )}

          <p className="mt-6 border-t border-brand-border-dark pt-4 text-[11px] text-brand-muted-on-dark">
            Vue lecture seule — pour annuler, reporter ou modifier
            l&apos;atelier, contactez votre Customer Success Manager.
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({
  icon,
  label,
  value,
  sub,
}: {
  icon: string;
  label: string;
  value: ReactNode;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-brand-border-dark bg-brand-dark/40 p-3.5">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-muted-on-dark">
        <span aria-hidden>{icon}</span>
        {label}
      </div>
      <div className="mt-1.5 text-sm text-brand-cream">{value}</div>
      {sub && (
        <div className="mt-0.5 text-[11px] text-brand-muted-on-dark">{sub}</div>
      )}
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
          <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-upcoming/15 text-brand-upcoming"
            aria-hidden
          >
            ⏱
          </span>
          <div>
            <p className="text-sm font-medium text-brand-cream">
              Encore {daysLeft} jour{daysLeft > 1 ? "s" : ""} pour annuler ou
              reporter cet atelier.
            </p>
            <p className="mt-1 text-[13px] text-brand-muted-on-dark">
              Date limite :{" "}
              <span className="text-brand-cream">{deadline}</span>. Au-delà,
              l&apos;atelier ne pourra plus être modifié et restera décompté
              de votre forfait s&apos;il est tout de même annulé.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-brand-salmon/40 bg-brand-salmon/[0.06] p-4">
          <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-salmon/20 text-brand-salmon"
            aria-hidden
          >
            ⛔
          </span>
          <div>
            <p className="text-sm font-medium text-brand-cream">
              Délai d&apos;annulation dépassé.
            </p>
            <p className="mt-1 text-[13px] text-brand-muted-on-dark">
              La date limite était le{" "}
              <span className="text-brand-cream">{deadline}</span>. L&apos;atelier
              ne peut plus être annulé ni reporté — toute annulation tardive
              entraînera son décompte sur votre forfait.
            </p>
          </div>
        </div>
      )}
    </Section>
  );
}

function ParticipantCommentsSection({
  comments,
  totalFeedbacks,
}: {
  comments: { rating: number; text: string }[];
  totalFeedbacks?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? comments : comments.slice(0, 3);
  const hasMore = comments.length > 3;
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal-bright">
          Commentaires des participants
        </h3>
        <span className="text-[11px] text-brand-muted-on-dark">
          {comments.length} affiché{comments.length > 1 ? "s" : ""}
          {totalFeedbacks !== undefined &&
            totalFeedbacks > comments.length &&
            ` sur ${totalFeedbacks}`}
        </span>
      </div>
      <ul className="space-y-2.5">
        {visible.map((c, i) => (
          <li
            key={i}
            className="rounded-xl border border-brand-border-dark bg-brand-dark/40 p-4"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <StarRating value={c.rating} size="sm" />
              <span className="text-[10px] uppercase tracking-wider text-brand-muted-on-dark">
                Participant anonyme
              </span>
            </div>
            <p className="text-[13px] italic leading-relaxed text-brand-cream">
              « {c.text} »
            </p>
          </li>
        ))}
      </ul>
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 inline-flex items-center gap-1 text-[12px] text-brand-teal-bright hover:underline"
        >
          {expanded
            ? "Réduire"
            : `Voir les ${comments.length - 3} commentaires restants`}
          <span aria-hidden>{expanded ? "↑" : "↓"}</span>
        </button>
      )}
      <p className="mt-2 text-[10px] italic text-brand-muted-on-dark/80">
        Commentaires anonymisés par teale pour préserver la confidentialité des
        participants.
      </p>
    </section>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal-bright">
        {title}
      </h3>
      {children}
    </section>
  );
}

function KitTile({ emoji, label }: { emoji: string; label: string }) {
  return (
    <button
      type="button"
      disabled
      title="Disponible dans la rubrique Kits de communication"
      className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-brand-border-dark bg-brand-dark/30 px-3 py-2.5 text-left text-[12px] opacity-80"
    >
      <span aria-hidden>{emoji}</span>
      <span className="text-brand-cream">{label}</span>
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
