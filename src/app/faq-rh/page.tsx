"use client";

import Image from "next/image";
import { Fragment, useMemo, useState, type ReactNode } from "react";

type Block =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "video"; href: string; title: string; meta: string };

type FaqItem = {
  question: string;
  answer: Block[];
};

type FaqSection = {
  title: string;
  items: FaqItem[];
};

const sections: FaqSection[] = [
  {
    title: "teale",
    items: [
      {
        question: "Que propose concrètement teale ?",
        answer: [
          {
            type: "p",
            text: "teale est la première plateforme de prévention en santé mentale à l'impact mesurable et durable.",
          },
          {
            type: "video",
            href: "https://www.youtube.com/watch?v=eOPjDvlrO90&t=1s",
            title: "Voir la présentation vidéo",
            meta: "youtube.com",
          },
        ],
      },
    ],
  },
  {
    title: "Santé mentale",
    items: [
      {
        question: "Pourquoi parler de santé mentale en entreprise ?",
        answer: [
          {
            type: "p",
            text: "La santé mentale fait partie intégrante de la santé globale. Stress, fatigue, surcharge, anxiété ou perte de motivation peuvent impacter le bien-être des collaborateurs, leur engagement et leur performance.",
          },
          {
            type: "p",
            text: "teale accompagne les collaborateurs **en prévention comme en soutien**, à chaque étape de leur parcours professionnel.",
          },
        ],
      },
      {
        question: "À qui s'adresse teale ?",
        answer: [
          {
            type: "p",
            text: "À **tous les collaborateurs**, quels que soient leur poste, leur ancienneté ou leur niveau de responsabilité.",
          },
          {
            type: "p",
            text: "teale s'adresse aussi bien à des personnes qui vont bien et souhaitent préserver leur équilibre, qu'à celles qui traversent une période plus difficile.",
          },
        ],
      },
    ],
  },
  {
    title: "Indice de santé mentale",
    items: [
      {
        question: "Qu'est-ce que l'indice de santé mentale ?",
        answer: [
          {
            type: "p",
            text: "Il s'agit d'un **auto-questionnaire court et scientifique**, rempli volontairement par les collaborateurs, qui leur permet d'évaluer leur état de santé mentale à un instant donné.",
          },
        ],
      },
      {
        question: "À quoi sert cet indice ?",
        answer: [
          {
            type: "ul",
            items: [
              "Pour le collaborateur : **mieux se situer**, prendre conscience de son état et être orienté vers des ressources adaptées.",
              "Pour l'entreprise : **avoir une vision globale et anonymisée** de la santé mentale des équipes, afin d'orienter les actions de prévention.",
            ],
          },
        ],
      },
      {
        question: "Les RH ont-elles accès aux réponses individuelles ?",
        answer: [
          {
            type: "p",
            text: "Non. **Aucune donnée individuelle n'est accessible** aux RH ou aux managers.",
          },
          {
            type: "p",
            text: "Seuls des **résultats agrégés et anonymisés** peuvent être partagés au niveau collectif.",
          },
        ],
      },
    ],
  },
  {
    title: "Librairie de contenus",
    items: [
      {
        question: "Qu'est-ce que la librairie teale ?",
        answer: [
          {
            type: "p",
            text: "Une bibliothèque de ressources digitales accessibles 24/7, comprenant :",
          },
          {
            type: "ul",
            items: [
              "des articles,",
              "des exercices pratiques,",
              "des vidéos et outils concrets.",
            ],
          },
          {
            type: "p",
            text: "Les contenus couvrent des thématiques comme le stress, le sommeil, les émotions, la charge mentale, l'équilibre vie pro/vie perso, la confiance, etc.",
          },
        ],
      },
      {
        question:
          "Les collaborateurs sont-ils obligés de suivre ces contenus ?",
        answer: [
          {
            type: "p",
            text: "Non. L'accès est **libre et autonome**. Chacun avance à son rythme, selon ses besoins et ses envies.",
          },
        ],
      },
    ],
  },
  {
    title: "Psychologues",
    items: [
      {
        question:
          "Les collaborateurs peuvent-ils parler à un professionnel ?",
        answer: [
          {
            type: "p",
            text: "Oui. Les collaborateurs peuvent **prendre rendez-vous avec un psychologue**, en toute confidentialité, directement via la plateforme.",
          },
        ],
      },
      {
        question: "Comment se déroulent les rendez-vous ?",
        answer: [
          {
            type: "ul",
            items: [
              "En visio ou par téléphone",
              "Sur des créneaux adaptés aux contraintes professionnelles",
              "Avec des psychologues formés aux enjeux du monde du travail",
            ],
          },
        ],
      },
      {
        question: "Les RH sont-elles informées de ces rendez-vous ?",
        answer: [
          {
            type: "p",
            text: "Non. **Aucune information individuelle n'est partagée** : ni le motif, ni le contenu, ni l'identité des personnes accompagnées.",
          },
        ],
      },
    ],
  },
  {
    title: "Engagement",
    items: [
      {
        question: "Comment inciter les collaborateurs à utiliser teale ?",
        answer: [
          { type: "p", text: "Les leviers les plus efficaces sont :" },
          {
            type: "ul",
            items: [
              "une communication RH simple et régulière,",
              "le relais managérial,",
              "des temps collectifs (ateliers, webinars, temps de sensibilisation).",
            ],
          },
          {
            type: "p",
            text: "Les équipes teale accompagnent les RH sur ces sujets avec des **kits de communication clés en main**.",
          },
        ],
      },
      {
        question: "L'utilisation de teale est-elle obligatoire ?",
        answer: [
          {
            type: "p",
            text: "Non. L'usage repose sur le **volontariat**. Cette liberté est essentielle pour garantir l'engagement et la confiance des collaborateurs.",
          },
        ],
      },
    ],
  },
  {
    title: "Confidentialité",
    items: [
      {
        question: "Les données sont-elles confidentielles ?",
        answer: [
          {
            type: "p",
            text: "Oui. La confidentialité est un **pilier fondamental** de teale.",
          },
          {
            type: "p",
            text: "Les données individuelles sont strictement personnelles et sécurisées.",
          },
        ],
      },
      {
        question: "teale est-elle conforme au RGPD ?",
        answer: [
          {
            type: "p",
            text: "Oui. teale est **pleinement conforme au RGPD**, avec des standards élevés de sécurité et de protection des données de santé.",
          },
        ],
      },
    ],
  },
];

const totalQuestions = sections.reduce((n, s) => n + s.items.length, 0);

function blockToPlainText(block: Block): string {
  if (block.type === "p") return block.text;
  if (block.type === "ul") return block.items.join(" ");
  if (block.type === "video") return `${block.title} ${block.meta}`;
  return "";
}

function matchesSearch(item: FaqItem, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  if (item.question.toLowerCase().includes(q)) return true;
  return item.answer.some((b) =>
    blockToPlainText(b).toLowerCase().includes(q)
  );
}

export default function FaqRhPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const filteredSections = useMemo(() => {
    return sections
      .filter((s) => !activeFilter || s.title === activeFilter)
      .map((s) => ({
        ...s,
        items: s.items.filter((item) => matchesSearch(item, search)),
      }))
      .filter((s) => s.items.length > 0);
  }, [search, activeFilter]);

  const visibleCount = filteredSections.reduce(
    (n, s) => n + s.items.length,
    0
  );
  const hasActiveFilters = !!search.trim() || activeFilter !== null;

  const resetFilters = () => {
    setSearch("");
    setActiveFilter(null);
  };

  const toggleItem = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="relative px-10 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-0 h-[460px] w-[460px] translate-x-20 rounded-full bg-brand-teal-bright/10 blur-3xl"
      />
      <div className="relative z-10 mx-auto max-w-5xl">
        <header className="mb-9 grid items-end gap-10 lg:grid-cols-[1fr_auto]">
          <div className="flex items-start gap-6">
            <Image
              src="/faq-rh-illustration.png"
              alt=""
              width={654}
              height={651}
              priority
              aria-hidden
              className="hidden h-32 w-32 shrink-0 object-contain sm:block"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-teal-bright">
                FAQ RH
              </p>
              <h1 className="mt-4 max-w-3xl text-5xl font-medium leading-[1.05] tracking-tight text-brand-cream">
                Déployer teale auprès de vos collaborateurs
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-brand-muted-on-dark">
                Toutes les réponses aux questions que vous vous posez pour
                accompagner le lancement et l&apos;adoption de la plateforme
                dans vos équipes.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <StatPill value={totalQuestions} label="Questions" accent />
            <StatPill value={sections.length} label="Thématiques" />
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
              placeholder="Rechercher dans la FAQ…"
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
                selected={activeFilter === null}
                onClick={() => setActiveFilter(null)}
              >
                Toutes
              </PillFilter>
              {sections.map((s) => (
                <PillFilter
                  key={s.title}
                  selected={activeFilter === s.title}
                  onClick={() =>
                    setActiveFilter(activeFilter === s.title ? null : s.title)
                  }
                  count={s.items.length}
                >
                  <span className="mr-1.5">{sectionEmoji(s.title)}</span>
                  {s.title}
                </PillFilter>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 mb-8 flex items-center justify-between text-[13px] text-brand-muted-on-dark">
          <span>
            {visibleCount === 0
              ? "Aucun résultat"
              : visibleCount === totalQuestions
                ? `${totalQuestions} questions au total`
                : `${visibleCount} question${visibleCount > 1 ? "s" : ""} sur ${totalQuestions}`}
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

        {filteredSections.length === 0 ? (
          <EmptyState onReset={resetFilters} query={search} />
        ) : (
          <div className="space-y-10">
            {filteredSections.map((section) => (
              <SectionBlock
                key={section.title}
                title={section.title}
                count={section.items.length}
              >
                {section.items.map((item) => (
                  <FaqCard
                    key={item.question}
                    item={item}
                    query={search}
                    isOpen={openIds.has(item.question)}
                    onToggle={() => toggleItem(item.question)}
                  />
                ))}
              </SectionBlock>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function sectionEmoji(title: string): string {
  switch (title) {
    case "teale":
      return "✦";
    case "Santé mentale":
      return "🧠";
    case "Indice de santé mentale":
      return "📊";
    case "Librairie de contenus":
      return "📚";
    case "Psychologues":
      return "👩‍⚕️";
    case "Engagement":
      return "🤝";
    case "Confidentialité":
      return "🔒";
    default:
      return "✦";
  }
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

function SectionBlock({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  const isSingle = count === 1;
  return (
    <section>
      <header className="mb-5 flex items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-3 text-2xl font-medium tracking-tight text-brand-cream">
          <span aria-hidden>{sectionEmoji(title)}</span>
          {title}
        </h2>
        <span className="shrink-0 text-[11px] uppercase tracking-wider text-brand-muted-on-dark">
          {count} question{count > 1 ? "s" : ""}
        </span>
      </header>
      <div
        className={`grid gap-3 ${
          isSingle ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
        }`}
      >
        {children}
      </div>
    </section>
  );
}

function FaqCard({
  item,
  query,
  isOpen,
  onToggle,
}: {
  item: FaqItem;
  query: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`group rounded-2xl border bg-brand-surface transition-all ${
        isOpen
          ? "border-brand-green-bright/40"
          : "border-brand-border-dark hover:border-brand-green-bright/30"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span
          className={`text-[15px] leading-snug ${
            isOpen ? "font-medium text-brand-cream" : "text-brand-cream"
          }`}
        >
          <HighlightedText text={item.question} query={query} />
        </span>
        <ToggleIcon isOpen={isOpen} />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-3 px-5 pb-5 text-sm leading-relaxed text-brand-muted-on-dark">
            {item.answer.map((block, i) => (
              <RenderBlock key={i} block={block} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <span
      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full transition-all duration-200 ${
        isOpen
          ? "rotate-45 bg-brand-green-bright text-brand-dark"
          : "border border-brand-border-dark text-brand-muted-on-dark group-hover:border-brand-muted-on-dark group-hover:text-brand-cream"
      }`}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        aria-hidden
      >
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    </span>
  );
}

function RenderBlock({ block }: { block: Block }) {
  if (block.type === "p") {
    return (
      <p>
        <RichText text={block.text} />
      </p>
    );
  }
  if (block.type === "ul") {
    return (
      <ul className="list-disc space-y-1.5 pl-5">
        {block.items.map((it, i) => (
          <li key={i}>
            <RichText text={it} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <a
      href={block.href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 inline-flex items-center gap-3 rounded-lg border border-brand-border-dark bg-brand-dark/40 px-4 py-2.5 text-sm text-brand-cream transition-colors hover:border-brand-accent/50 hover:bg-brand-dark/70"
    >
      <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-accent text-brand-dark">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
      <span className="flex flex-col">
        <span>{block.title}</span>
        <span className="text-[11px] text-brand-muted-on-dark">
          {block.meta}
        </span>
      </span>
    </a>
  );
}

function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-medium text-brand-cream">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

function HighlightedText({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="rounded-sm bg-brand-accent/25 px-0.5 text-brand-cream"
          >
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
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
          ? `Aucune question ne correspond à « ${query.trim()} »`
          : "Aucun résultat pour ces filtres"}
      </p>
      <p className="mt-2 text-sm text-brand-muted-on-dark">
        Essayez de modifier votre recherche ou de changer de thématique.
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
