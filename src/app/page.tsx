import Link from "next/link";
import ActionsCard, { type Action } from "@/components/ActionsCard";

const FIRST_NAME = "Ophélie";

const TOTAL_ATELIERS = 12;
const ATELIERS_USED = 8;

const TOTAL_SEANCES_PSY = 200;
const SEANCES_PSY_USED = 73;

const CONTRACT_PCT = 67;
const TODAY_LABEL = "13 mai";

type MilestoneStatus = "done" | "current" | "upcoming";
type MilestoneKind = "atelier" | "comm" | "csm" | "bilan" | "contrat";

type Milestone = {
  date: string;
  title: string;
  kind: MilestoneKind;
  status: MilestoneStatus;
  position: number;
};

const milestones: Milestone[] = [
  { date: "12 sept. 2025", title: "Lancement du projet", kind: "contrat", status: "done", position: 0 },
  { date: "20 nov.", title: "Kit de communication Q4", kind: "comm", status: "done", position: 18 },
  { date: "14 janv.", title: "Atelier « Communication non violente »", kind: "atelier", status: "done", position: 35 },
  { date: "12 mars", title: "Bilan trimestriel Q1", kind: "bilan", status: "done", position: 49 },
  { date: "28 avr.", title: "Atelier « Charge mentale »", kind: "atelier", status: "done", position: 62 },
  { date: "13 mai", title: "Aujourd'hui", kind: "csm", status: "current", position: 67 },
  { date: "22 mai", title: "Atelier « Gestion du stress »", kind: "atelier", status: "upcoming", position: 69 },
  { date: "10 juin", title: "Atelier « Manager bienveillant »", kind: "atelier", status: "upcoming", position: 74 },
  { date: "1ᵉʳ juil.", title: "Bilan trimestriel Q2", kind: "bilan", status: "upcoming", position: 80 },
  { date: "12 sept. 2026", title: "Anniversaire du contrat", kind: "contrat", status: "upcoming", position: 100 },
];

const upcomingMilestones = milestones.filter((m) => m.status === "upcoming").slice(0, 3);

const actions: Action[] = [
  { title: "Relire le brief de l'atelier « Charge mentale »", due: "Échéance le 8 mai", overdue: true },
  { title: "Valider le kit de communication Q3", due: "Échéance le 18 mai" },
  { title: "Confirmer la date de « Manager bienveillant »", due: "Échéance le 22 mai" },
];

const meetings: { day: string; month: string; time: string; title: string; detail: string }[] = [
  { day: "15", month: "mai", time: "10:00", title: "Point CSM mensuel", detail: "Avec Lucie" },
  { day: "22", month: "mai", time: "14:00", title: "Atelier « Gestion du stress »", detail: "Animé par Marc" },
  { day: "05", month: "juin", time: "11:00", title: "Brief « Manager bienveillant »", detail: "Avec Lucie" },
];

export default function HomePage() {
  return (
    <div className="flex h-screen flex-col px-10 py-4">
      <header className="mb-4">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-brand-muted-on-dark">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-accent opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-accent" />
          </span>
          Mercredi 13 mai 2026
        </div>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-brand-cream">
          Bonjour {FIRST_NAME}{" "}
          <span
            className="inline-block origin-bottom-right transition-transform duration-300 hover:rotate-12"
            aria-hidden
          >
            👋
          </span>
        </h1>
        <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-brand-muted-on-dark">
          Voici un aperçu de votre pilotage Teale et de vos prochaines échéances.
        </p>
      </header>

      <section className="mb-3 grid grid-cols-2 gap-3">
        <KpiDonutCard
          label="Ateliers restants"
          remaining={TOTAL_ATELIERS - ATELIERS_USED}
          total={TOTAL_ATELIERS}
          subtitle="À programmer avant le 12 septembre 2026"
        />
        <KpiDonutCard
          label="Séances psy restantes"
          remaining={TOTAL_SEANCES_PSY - SEANCES_PSY_USED}
          total={TOTAL_SEANCES_PSY}
          subtitle="À consommer par vos équipes"
        />
      </section>

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-4">
        <div className="col-span-12 flex min-h-0 flex-col lg:col-span-7">
          <SectionHeader
            title="Planning projet en cours"
            meta="Année contrat 2025 — 2026"
          />
          <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-brand-border-dark bg-brand-surface p-4">
            <PlanningBar />
            <PlanningJalons />
          </section>
        </div>

        <div className="col-span-12 flex min-h-0 flex-col gap-3 lg:col-span-5">
          <ActionsCard actions={actions} />
          <MeetingsCard />
        </div>
      </div>
    </div>
  );
}

function KpiDonutCard({
  label,
  remaining,
  total,
  subtitle,
}: {
  label: string;
  remaining: number;
  total: number;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-brand-teal-bright/25 bg-gradient-to-br from-brand-teal-bright/[0.10] via-brand-accent/[0.04] to-transparent p-4">
      <Donut remaining={remaining} total={total} />
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-medium text-brand-cream">{label}</h3>
        <p className="mt-1 text-[12px] leading-snug text-brand-muted-on-dark">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function Donut({ remaining, total }: { remaining: number; total: number }) {
  const size = 84;
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = total > 0 ? remaining / total : 0;
  const arcLength = ratio * circumference;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--green-bright)"
          strokeWidth={stroke}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-medium text-brand-cream">
          {remaining} / {total}
        </span>
      </div>
    </div>
  );
}

function SectionHeader({ title, meta }: { title: string; meta: string }) {
  return (
    <header className="mb-2 flex items-baseline justify-between gap-3">
      <h2 className="text-lg font-medium text-brand-cream">{title}</h2>
      <span className="text-[13px] text-brand-muted-on-dark">{meta}</span>
    </header>
  );
}

function PlanningBar() {
  return (
    <div className="mb-6">
      <div className="mb-2 flex justify-between text-[10px] uppercase tracking-[0.14em] text-brand-muted-on-dark">
        <span>Sept. 2025</span>
        <span>Sept. 2026</span>
      </div>
      <div className="relative h-2 rounded-full bg-brand-dark">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-brand-accent"
          style={{ width: `${CONTRACT_PCT}%` }}
        />
        {milestones.map((m) => (
          <span
            key={m.date + m.title}
            className={
              m.status === "current"
                ? "absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-highlight ring-4 ring-[#dced63]/30"
                : "absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-cream"
            }
            style={{ left: `${m.position}%` }}
            title={`${m.date} — ${m.title}`}
          />
        ))}
      </div>
      <div className="relative mt-2 h-4">
        <div
          className="absolute -translate-x-1/2 whitespace-nowrap text-[11px] font-medium text-brand-highlight"
          style={{ left: `${CONTRACT_PCT}%` }}
        >
          ↑ Vous êtes ici · {TODAY_LABEL}
        </div>
      </div>
    </div>
  );
}

function PlanningJalons() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="mb-3 flex items-baseline justify-between">
        <h3 className="text-[11px] uppercase tracking-[0.18em] text-brand-muted-on-dark">
          Prochains jalons
        </h3>
        <Link
          href="/mon-planning"
          className="text-[11px] text-brand-accent hover:underline"
        >
          Voir tout →
        </Link>
      </header>
      <ol className="space-y-2">
        {upcomingMilestones.map((m) => (
          <li
            key={m.date + m.title}
            className="flex items-center gap-3 rounded-lg bg-brand-dark/40 px-3 py-2.5"
          >
            <span className="w-14 shrink-0 text-[11px] uppercase tracking-wider text-brand-muted-on-dark">
              {m.date}
            </span>
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${milestoneKindColor(m.kind)}`}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-sm text-brand-cream">
              {m.title}
            </span>
            <span className="hidden text-[10px] uppercase tracking-wider text-brand-muted-on-dark lg:inline">
              {milestoneKindLabel(m.kind)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function MeetingsCard() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SectionHeader
        title="Prochains rendez-vous"
        meta={`${meetings.length} planifiés`}
      />
      <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-brand-border-dark bg-brand-surface p-3">
        <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
          {meetings.map((meeting) => (
            <li key={meeting.title} className="flex items-center gap-3">
              <div className="w-10 shrink-0 rounded-lg bg-brand-dark px-1.5 py-1 text-center">
                <div className="text-base font-medium leading-none text-brand-accent">
                  {meeting.day}
                </div>
                <div className="mt-0.5 text-[9px] uppercase tracking-wider text-brand-muted-on-dark">
                  {meeting.month}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-brand-cream">
                  {meeting.title}
                </div>
                <div className="mt-0.5 text-[11px] text-brand-muted-on-dark">
                  {meeting.time} · {meeting.detail}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function milestoneKindColor(kind: MilestoneKind): string {
  switch (kind) {
    case "atelier":
      return "bg-brand-accent";
    case "comm":
      return "bg-brand-highlight";
    case "csm":
      return "bg-brand-cream";
    case "bilan":
      return "bg-[#E6AA99]";
    case "contrat":
      return "bg-brand-muted-on-dark";
  }
}

function milestoneKindLabel(kind: MilestoneKind): string {
  switch (kind) {
    case "atelier":
      return "Atelier";
    case "comm":
      return "Comm.";
    case "csm":
      return "Point CSM";
    case "bilan":
      return "Bilan";
    case "contrat":
      return "Contrat";
  }
}
