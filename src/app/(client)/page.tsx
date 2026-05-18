import Link from "next/link";
import ActionsCard, { type Action } from "@/components/ActionsCard";

const FIRST_NAME = "Ophélie";

const TOTAL_ATELIERS = 12;
const ATELIERS_USED = 8;

const TOTAL_SEANCES_PSY = 200;
const SEANCES_PSY_USED = 73;

type MilestoneKind = "atelier" | "comm" | "csm" | "bilan" | "contrat";

const actions: Action[] = [
  { title: "Relire le brief de l'atelier « Charge mentale »", due: "Échéance le 8 mai", overdue: true },
  { title: "Valider le kit de communication Q3", due: "Échéance le 18 mai" },
  { title: "Confirmer la date de « Manager bienveillant »", due: "Échéance le 22 mai" },
];

const kindConfig: Record<MilestoneKind, { label: string; pillClass: string }> = {
  atelier: { label: "Atelier",    pillClass: "bg-[rgba(168,85,247,0.15)] text-[#c4b5fd]" },
  comm:    { label: "Kit comm",   pillClass: "bg-[rgba(94,234,212,0.15)] text-[#5eead4]" },
  csm:     { label: "Point CSM", pillClass: "bg-[rgba(250,204,21,0.15)] text-[#fde047]" },
  bilan:   { label: "QBR",        pillClass: "bg-[rgba(96,165,250,0.15)] text-[#93c5fd]" },
  contrat: { label: "Contrat",    pillClass: "bg-[rgba(251,146,60,0.15)] text-[#fdba74]" },
};

const meetings: { day: string; month: string; mo: string; time: string; title: string; detail: string; kind: MilestoneKind; done: boolean }[] = [
  { day: "15", month: "mai",  mo: "MAI", time: "10:00", title: "Point CSM mensuel",                  detail: "Avec Lucie",     kind: "csm",     done: false },
  { day: "22", month: "mai",  mo: "MAI", time: "14:00", title: "Atelier « Gestion du stress »",      detail: "Animé par Marc", kind: "atelier", done: false },
  { day: "05", month: "juin", mo: "JUI", time: "11:00", title: "Brief « Manager bienveillant »",      detail: "Avec Lucie",     kind: "atelier", done: false },
];

const currentMonthMeetings = meetings.filter((m) => m.month === "mai");

export default function HomePage() {
  return (
    <div className="flex h-screen flex-col px-9 py-8">
      <header className="mb-4">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[2.5px] text-[#94a8a0]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-accent opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-accent" />
          </span>
          Mercredi 13 mai 2026
        </div>
        <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.5px] text-brand-cream">
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
          <div className="min-h-0 flex-1 overflow-y-auto">
            <CurrentMonthCard />
          </div>
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

function CurrentMonthCard() {
  const upcomingCount = currentMonthMeetings.filter((m) => !m.done).length;
  const nextMeeting = currentMonthMeetings.find((m) => !m.done) ?? null;

  return (
    <div className="rounded-[13px] border border-[rgba(94,234,212,0.15)] bg-[rgba(94,234,212,0.035)] p-[18px]">
      <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2.5">
          <h4 className="text-[12px] font-bold uppercase tracking-[1.8px] text-[#e8f5ef]">
            Mai
          </h4>
          <span className="rounded-[4px] bg-[#5eead4] px-[7px] py-[3px] text-[9px] font-bold tracking-[0.5px] text-[#042f2a]">
            En cours
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] tracking-[0.5px] text-[#6b7c75]">
            {upcomingCount > 0 ? `${upcomingCount} à venir` : "—"}
          </span>
          <Link href="/mon-planning" className="text-[11px] text-[#5eead4] hover:underline">
            Voir tout →
          </Link>
        </div>
      </div>
      <ul className="space-y-0">
        {currentMonthMeetings.map((m, i) => (
          <MeetingRow key={i} meeting={m} isNext={m === nextMeeting} />
        ))}
      </ul>
    </div>
  );
}

function MeetingRow({
  meeting,
  isNext,
}: {
  meeting: (typeof meetings)[0];
  isNext: boolean;
}) {
  const cfg = kindConfig[meeting.kind];
  return (
    <li className="relative">
      {isNext && (
        <span className="absolute -top-2 right-2.5 z-10 rounded-[4px] bg-[#5eead4] px-[7px] py-[3px] text-[8px] font-bold tracking-[0.5px] text-[#042f2a]">
          Prochain
        </span>
      )}
      <div
        className={`mb-2.5 flex w-full gap-2.5 rounded-[10px] border p-3 ${
          meeting.done
            ? "border-transparent opacity-[0.38]"
            : isNext
              ? "border-[rgba(94,234,212,0.18)] bg-[rgba(94,234,212,0.05)]"
              : "border-transparent"
        }`}
      >
        <div className="w-10 shrink-0 pt-0.5 text-center">
          <div
            className={`text-[19px] font-bold leading-none tabular-nums ${
              meeting.done ? "text-[#6b7c75] line-through" : "text-[#e8f5ef]"
            }`}
          >
            {meeting.day}
          </div>
          <div className="mt-[3px] text-[9px] uppercase tracking-[0.8px] text-[#6b7c75]">
            {meeting.mo}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-1.5">
            <span
              className={`rounded-[4px] px-[7px] py-[3px] text-[9px] font-bold tracking-[0.5px] ${cfg.pillClass}`}
            >
              {cfg.label.toUpperCase()}
            </span>
            <span
              className={`ml-auto flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full text-[9px] ${
                meeting.done
                  ? "bg-[rgba(94,234,212,0.2)] text-[#5eead4]"
                  : "border-[1.5px] border-white/15"
              }`}
              aria-hidden
            >
              {meeting.done ? "✓" : ""}
            </span>
          </div>
          <div
            className={`mb-1 text-[12.5px] font-medium leading-snug ${
              meeting.done ? "text-[#6b7c75] line-through" : "text-[#e8f5ef]"
            }`}
          >
            {meeting.title}
          </div>
          <div className="text-[10px] text-[#6b7c75]">
            {meeting.time} · {meeting.detail}
          </div>
        </div>
      </div>
    </li>
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

