"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  type AnimationItem,
  type EmailTopicKit,
  type LancementKit,
  type VisuelKit,
  VISUEL_CATEGORIES,
} from "./data";
import { useKitsStore } from "@/lib/kits-store";
import { openKitFile, kitFileLabel, getKitFileUrl } from "@/lib/storage";
import { useWorkshops, themes as workshopThemes, type Workshop } from "@/lib/workshops-store";
import { setSeenIds } from "@/lib/catalogue-read-state";
import { useNewCatalogueItems } from "@/lib/use-new-catalogue-items";
import { RichText } from "@/components/RichText";
import { copyKitBody } from "@/lib/rich-text";

// ─────────────────────────────────────────────────────────────────────────────
// Normalisation
//
// La page expose une grille homogène de cartes. Les 5 sources hétérogènes du
// store (temps forts, ateliers, emails, lancement, visuels) sont projetées vers
// un type `KitCard` unique : un badge "type", un titre, une thématique, un
// public, une langue, un mois optionnel et un drapeau "nouveau". Le payload
// conserve la donnée d'origine pour rouvrir la modale adéquate.
// ─────────────────────────────────────────────────────────────────────────────

type KitTypeId = "tempsfort" | "atelier" | "email" | "lancement" | "visuel";
type AudId = "tous" | "managers" | "codir" | "elus" | "rh";
type LangId = "fr" | "en" | "both";

const TYPE_META: Record<
  KitTypeId,
  { label: string; icon: string; badge: string }
> = {
  atelier: { label: "Kit atelier", icon: "🎓", badge: "bg-brand-accent/15 text-brand-accent" },
  email: { label: "Email", icon: "💌", badge: "bg-brand-salmon/15 text-brand-salmon" },
  tempsfort: { label: "Temps fort", icon: "📅", badge: "bg-brand-blue-soft/15 text-brand-blue-soft" },
  lancement: { label: "Lancement", icon: "🚀", badge: "bg-[#e0b657]/15 text-[#e0b657]" },
  visuel: { label: "Visuel", icon: "🎨", badge: "bg-[#bca6e8]/15 text-[#bca6e8]" },
};
// Ordre d'affichage du badge "type" dans la facette.
const TYPE_ORDER: KitTypeId[] = ["tempsfort", "atelier", "email", "lancement", "visuel"];

const AUD_META: Record<AudId, string> = {
  tous: "Tous les collaborateurs",
  managers: "Managers",
  codir: "CODIR",
  elus: "Élus",
  rh: "Équipe RH",
};
const AUD_ORDER: AudId[] = ["managers", "codir", "elus", "rh", "tous"];

const LANG_META: Record<LangId, string> = {
  fr: "Français",
  both: "FR / EN",
  en: "English",
};
const LANG_ORDER: LangId[] = ["fr", "both", "en"];

type ActiveCard =
  | { kind: "lancement"; data: LancementKit }
  | { kind: "animation"; data: AnimationItem }
  | { kind: "email"; data: EmailTopicKit }
  | { kind: "visuel"; data: VisuelKit }
  | { kind: "workshop"; workshop: Workshop };

type KitCard = {
  id: string;
  type: KitTypeId;
  title: string;
  theme: string;
  audiences: AudId[];
  lang: LangId;
  month: number | null; // 1-12, uniquement pour les temps forts
  isNew: boolean;
  payload: ActiveCard;
  searchHay: string;
};

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

const stepLabels: Record<string, string> = {
  before: "Avant le lancement",
  dday: "Jour J",
  after: "Après le lancement",
};

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

function monthName(n: number): string {
  return monthLabel[allMonths[n - 1]] ?? "";
}

// Aucun champ "public" structuré n'existe dans le repo (le targetAudience des
// ateliers décrit des situations, pas des rôles). On dérive donc le public du
// titre par mots-clés ; défaut "tous" (Collaborateurs). Un vrai champ `public`
// pourrait être ajouté au modèle plus tard pour plus de précision.
function deriveAudiences(title: string): AudId[] {
  const t = title.toLowerCase();
  const out: AudId[] = [];
  if (/manager/.test(t)) out.push("managers");
  if (/codir|comit[ée] de direction/.test(t)) out.push("codir");
  if (/(^|[^a-z])élus?([^a-z]|$)|(^|[^a-z])elus?([^a-z]|$)/.test(t)) out.push("elus");
  if (/(^|[^a-z])rh([^a-z]|$)|ressources humaines/.test(t)) out.push("rh");
  return out.length > 0 ? out : ["tous"];
}

function makeCard(c: Omit<KitCard, "searchHay">): KitCard {
  const hay = [
    c.title,
    c.theme,
    TYPE_META[c.type].label,
    ...c.audiences.map((a) => AUD_META[a]),
  ]
    .join(" ")
    .toLowerCase();
  return { ...c, searchHay: hay };
}

function langFlag(l: LangId): string {
  return l === "both" ? "🇫🇷 🇬🇧" : l === "en" ? "🇬🇧" : "🇫🇷";
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

function typeStyle(t: string): string {
  if (t.toLowerCase().includes("let's talk")) return "bg-[#E6AA99]/15 text-[#E6AA99]";
  return "bg-brand-accent/15 text-brand-accent";
}

type SortId = "relevance" | "new" | "az" | "period";

// ── Sous-rubriques (segmented nav) ───────────────────────────────────────────
// Chaque onglet mappe sur un ou plusieurs types EXISTANTS (KitTypeId). Aucune
// nouvelle dimension : on réorganise uniquement l'affichage par rubrique.
type TabId = "actualites" | "lancement" | "divers";
const TAB_META: { id: TabId; icon: string; label: string; sub: string }[] = [
  { id: "actualites", icon: "📅", label: "Actualités", sub: "Temps forts du calendrier" },
  { id: "lancement", icon: "🚀", label: "Lancement", sub: "Déployer teale dans vos équipes" },
  { id: "divers", icon: "🧰", label: "Divers", sub: "Ateliers, emails & visuels" },
];
const RUBRIC_TYPES: Record<TabId, KitTypeId[]> = {
  actualites: ["tempsfort"],
  lancement: ["lancement"],
  divers: ["atelier", "email", "visuel"],
};
const STEP_ORDER = ["before", "dday", "after"] as const;

function toggle<T>(setter: Dispatch<SetStateAction<Set<T>>>, val: T) {
  setter((prev) => {
    const next = new Set(prev);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    return next;
  });
}

export default function KitsCommunicationPage() {
  const { lancementKits, animationItems, emailTopicKits, visuelKits } = useKitsStore();
  const { workshops } = useWorkshops();
  const { kits: newKitIds, ateliers: newAtelierIds } = useNewCatalogueItems();

  // Ensemble des "nouveautés" (kits + ateliers) tel que vu à l'instant. Comme on
  // ne marque "vu" qu'au démontage (cf. effet plus bas), cet ensemble reste
  // stable pendant la visite → les tags "Nouveau" s'affichent normalement.
  const newSet = useMemo(
    () => new Set([...newKitIds, ...newAtelierIds]),
    [newKitIds, newAtelierIds]
  );

  // Visiter kits-communication éteint la pastille "nouveaux kits" de la home :
  // on marque tous les kits actuellement chargés comme vus — mais seulement au
  // départ de la page, pour ne pas faire disparaître les tags pendant la visite.
  // (setSeenIds n'est pas un setState React : sûr à appeler dans un effet.)
  const allKitIdsRef = useRef<string[]>([]);
  useEffect(() => {
    allKitIdsRef.current = [
      ...lancementKits.map((k) => `lan:${k.id}`),
      ...animationItems.map((a) => `ani:${a.id}`),
      ...emailTopicKits.map((e) => `email:${e.id}`),
      ...visuelKits.map((v) => `vis:${v.id}`),
    ];
  }, [lancementKits, animationItems, emailTopicKits, visuelKits]);
  useEffect(() => {
    return () => {
      if (allKitIdsRef.current.length > 0) setSeenIds("kits", allKitIdsRef.current);
    };
  }, []);

  const [q, setQ] = useState("");
  const [types, setTypes] = useState<Set<KitTypeId>>(new Set());
  const [themesSel, setThemesSel] = useState<Set<string>>(new Set());
  const [auds, setAuds] = useState<Set<AudId>>(new Set());
  const [langs, setLangs] = useState<Set<LangId>>(new Set());
  const [sort, setSort] = useState<SortId>("relevance");
  const [tab, setTab] = useState<TabId>("actualites");
  const [activeCard, setActiveCard] = useState<ActiveCard | null>(null);

  // Changer de rubrique réinitialise les facettes : leurs valeurs (thème /
  // étape / type / public) vivent dans des espaces différents d'un onglet à
  // l'autre, donc une sélection d'un onglet n'a pas de sens dans un autre. La
  // recherche (q) et le tri restent, eux, partagés.
  const selectTab = (t: TabId) => {
    setTab(t);
    setTypes(new Set());
    setThemesSel(new Set());
    setAuds(new Set());
    setLangs(new Set());
  };

  const currentMonth = useMemo(() => new Date().getMonth() + 1, []);

  const cards = useMemo<KitCard[]>(() => {
    const isNew = (key: string) => newSet.has(key);
    const out: KitCard[] = [];

    for (const a of animationItems) {
      const monthIdx = allMonths.indexOf(a.month);
      const lang: LangId =
        a.languages.includes("FR") && a.languages.includes("EN")
          ? "both"
          : a.languages.includes("EN")
            ? "en"
            : "fr";
      out.push(
        makeCard({
          id: `ani:${a.id}`,
          type: "tempsfort",
          title: a.title,
          theme: a.type || "Temps fort",
          audiences: deriveAudiences(a.title),
          lang,
          month: monthIdx >= 0 ? monthIdx + 1 : null,
          isNew: isNew(`ani:${a.id}`),
          payload: { kind: "animation", data: a },
        })
      );
    }

    for (const w of workshops) {
      out.push(
        makeCard({
          id: `ws:${w.id}`,
          type: "atelier",
          title: w.title,
          theme: workshopThemeNameById[w.themeId] ?? "Atelier",
          audiences: deriveAudiences(w.title),
          lang: "both",
          month: null,
          isNew: isNew(w.id),
          payload: { kind: "workshop", workshop: w },
        })
      );
    }

    for (const e of emailTopicKits) {
      out.push(
        makeCard({
          id: `email:${e.id}`,
          type: "email",
          title: e.title,
          theme: topicLabel(e.topic),
          audiences: deriveAudiences(e.title),
          lang: e.language === "EN" ? "en" : "fr",
          month: null,
          isNew: isNew(`email:${e.id}`),
          payload: { kind: "email", data: e },
        })
      );
    }

    for (const k of lancementKits) {
      out.push(
        makeCard({
          id: `lan:${k.id}`,
          type: "lancement",
          title: k.title,
          theme: stepLabels[k.step] ?? "Lancement",
          audiences: deriveAudiences(k.title),
          lang: k.language === "EN" ? "en" : "fr",
          month: null,
          isNew: isNew(`lan:${k.id}`),
          payload: { kind: "lancement", data: k },
        })
      );
    }

    for (const v of visuelKits) {
      out.push(
        makeCard({
          id: `vis:${v.id}`,
          type: "visuel",
          title: v.title,
          theme: VISUEL_CATEGORIES.find((c) => c.id === v.category)?.label ?? v.category,
          audiences: ["tous"],
          lang: "both",
          month: null,
          isNew: isNew(`vis:${v.id}`),
          payload: { kind: "visuel", data: v },
        })
      );
    }

    return out;
  }, [animationItems, workshops, emailTopicKits, lancementKits, visuelKits, newSet]);

  // ── Base de la rubrique active (après recherche) ────────────────────────────
  // Drive les options/compteurs des filtres contextuels ET le compteur d'onglet.
  const rubricBase = useMemo(() => {
    const query = q.trim().toLowerCase();
    return cards.filter(
      (c) => RUBRIC_TYPES[tab].includes(c.type) && (!query || c.searchHay.includes(query))
    );
  }, [cards, tab, q]);

  // Compteur de chaque onglet = nombre de kits de la rubrique après recherche.
  const tabCounts = useMemo(() => {
    const query = q.trim().toLowerCase();
    const match = (c: KitCard) => !query || c.searchHay.includes(query);
    const out = {} as Record<TabId, number>;
    for (const t of TAB_META) {
      out[t.id] = cards.filter((c) => RUBRIC_TYPES[t.id].includes(c.type) && match(c)).length;
    }
    return out;
  }, [cards, q]);

  // ── Facettes contextuelles (mêmes dimensions, scopées à la rubrique) ─────────
  const typeFacet = useMemo(
    () =>
      TYPE_ORDER.filter((id) => RUBRIC_TYPES[tab].includes(id))
        .map((id) => ({
          id,
          label: `${TYPE_META[id].icon} ${TYPE_META[id].label}`,
          count: rubricBase.filter((c) => c.type === id).length,
        }))
        .filter((f) => f.count > 0),
    [rubricBase, tab]
  );
  const themeFacet = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of rubricBase) m.set(c.theme, (m.get(c.theme) ?? 0) + 1);
    return [...m.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "fr"))
      .map(([label, count]) => ({ label, count }));
  }, [rubricBase]);
  const audFacet = useMemo(
    () =>
      AUD_ORDER.map((id) => ({
        id,
        label: AUD_META[id],
        count: rubricBase.filter((c) => c.audiences.includes(id)).length,
      })).filter((f) => f.count > 0),
    [rubricBase]
  );
  const langFacet = useMemo(
    () =>
      LANG_ORDER.map((id) => ({
        id,
        label: LANG_META[id],
        count: rubricBase.filter((c) => c.lang === id).length,
      })).filter((f) => f.count > 0),
    [rubricBase]
  );
  // Étape (Lancement) — ordre logique before → dday → after, dérivé de .step
  // (le champ `theme` d'un kit de lancement EST déjà stepLabels[step]).
  const stepFacet = useMemo(
    () =>
      STEP_ORDER.map((s) => ({
        value: stepLabels[s],
        label: stepLabels[s],
        count: rubricBase.filter((c) => c.theme === stepLabels[s]).length,
      })).filter((f) => f.count > 0),
    [rubricBase]
  );

  // ── Filtrage + tri (rubrique active uniquement) ─────────────────────────────
  const visible = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = cards.filter((c) => {
      if (!RUBRIC_TYPES[tab].includes(c.type)) return false;
      if (types.size && !types.has(c.type)) return false;
      if (themesSel.size && !themesSel.has(c.theme)) return false;
      if (auds.size && !c.audiences.some((a) => auds.has(a))) return false;
      if (langs.size && !langs.has(c.lang)) return false;
      if (query && !c.searchHay.includes(query)) return false;
      return true;
    });
    const sorted = [...list];
    if (sort === "az") sorted.sort((x, y) => x.title.localeCompare(y.title, "fr"));
    else if (sort === "new") sorted.sort((x, y) => Number(y.isNew) - Number(x.isNew));
    else if (sort === "period")
      sorted.sort(
        (x, y) => (x.month ?? 99) - (y.month ?? 99) || x.title.localeCompare(y.title, "fr")
      );
    return sorted;
  }, [cards, tab, q, types, themesSel, auds, langs, sort]);

  const activeFacetCount = types.size + themesSel.size + auds.size + langs.size;
  const hasActiveFilters = activeFacetCount > 0 || !!q.trim();

  const resetFilters = () => {
    setQ("");
    setTypes(new Set());
    setThemesSel(new Set());
    setAuds(new Set());
    setLangs(new Set());
  };

  // ── Pastilles de filtres actifs ─────────────────────────────────────────────
  const pills: { key: string; label: string; onRemove: () => void }[] = [];
  if (q.trim()) pills.push({ key: "q", label: `« ${q.trim()} »`, onRemove: () => setQ("") });
  types.forEach((t) =>
    pills.push({ key: `t-${t}`, label: TYPE_META[t].label, onRemove: () => toggle(setTypes, t) })
  );
  themesSel.forEach((t) =>
    pills.push({ key: `th-${t}`, label: t, onRemove: () => toggle(setThemesSel, t) })
  );
  auds.forEach((a) =>
    pills.push({ key: `a-${a}`, label: AUD_META[a], onRemove: () => toggle(setAuds, a) })
  );
  langs.forEach((l) =>
    pills.push({ key: `l-${l}`, label: LANG_META[l], onRemove: () => toggle(setLangs, l) })
  );

  // ── Filtres contextuels (dropdowns compacts) ────────────────────────────────
  const renderFilterBar = () => (
    <div className="mt-[22px] flex flex-wrap items-center gap-[10px]">
      <span className="mr-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-muted-on-dark/80">
        Filtrer
      </span>

      {tab === "actualites" && (
        <>
          <FilterDropdown
            label="Thématique"
            options={themeFacet.map((f) => ({ value: f.label, label: f.label, count: f.count }))}
            isSelected={(v) => themesSel.has(v)}
            onToggle={(v) => toggle(setThemesSel, v)}
            selectedCount={themesSel.size}
          />
          <FilterDropdown
            label="Public"
            options={audFacet.map((f) => ({ value: f.id, label: f.label, count: f.count }))}
            isSelected={(v) => auds.has(v as AudId)}
            onToggle={(v) => toggle(setAuds, v as AudId)}
            selectedCount={auds.size}
          />
          <FilterDropdown
            label="Langue"
            options={langFacet.map((f) => ({ value: f.id, label: f.label, count: f.count }))}
            isSelected={(v) => langs.has(v as LangId)}
            onToggle={(v) => toggle(setLangs, v as LangId)}
            selectedCount={langs.size}
          />
        </>
      )}

      {tab === "lancement" && (
        <>
          <FilterDropdown
            label="Étape"
            options={stepFacet}
            isSelected={(v) => themesSel.has(v)}
            onToggle={(v) => toggle(setThemesSel, v)}
            selectedCount={themesSel.size}
          />
          <FilterDropdown
            label="Langue"
            options={langFacet.map((f) => ({ value: f.id, label: f.label, count: f.count }))}
            isSelected={(v) => langs.has(v as LangId)}
            onToggle={(v) => toggle(setLangs, v as LangId)}
            selectedCount={langs.size}
          />
        </>
      )}

      {tab === "divers" && (
        <>
          <FilterDropdown
            label="Type"
            options={typeFacet.map((f) => ({ value: f.id, label: f.label, count: f.count }))}
            isSelected={(v) => types.has(v as KitTypeId)}
            onToggle={(v) => toggle(setTypes, v as KitTypeId)}
            selectedCount={types.size}
          />
          <FilterDropdown
            label="Thématique"
            options={themeFacet.map((f) => ({ value: f.label, label: f.label, count: f.count }))}
            isSelected={(v) => themesSel.has(v)}
            onToggle={(v) => toggle(setThemesSel, v)}
            selectedCount={themesSel.size}
          />
          <FilterDropdown
            label="Public"
            options={audFacet.map((f) => ({ value: f.id, label: f.label, count: f.count }))}
            isSelected={(v) => auds.has(v as AudId)}
            onToggle={(v) => toggle(setAuds, v as AudId)}
            selectedCount={auds.size}
          />
          <FilterDropdown
            label="Langue"
            options={langFacet.map((f) => ({ value: f.id, label: f.label, count: f.count }))}
            isSelected={(v) => langs.has(v as LangId)}
            onToggle={(v) => toggle(setLangs, v as LangId)}
            selectedCount={langs.size}
          />
        </>
      )}

      {hasActiveFilters && (
        <button
          type="button"
          onClick={resetFilters}
          className="ml-auto text-[12.5px] font-semibold text-brand-accent transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60"
        >
          Réinitialiser
        </button>
      )}
    </div>
  );

  return (
    <div className="px-9 py-8">
      <div className="mx-auto max-w-[1280px]">
        <header className="mb-1">
          <p className="text-[11px] font-semibold uppercase tracking-[2.5px] text-brand-accent">
            Espace client
          </p>
          <h1 className="mt-3 text-[28px] font-semibold tracking-[-0.5px] text-brand-cream">
            Kits de communication
          </h1>
          <p className="mt-2 max-w-[560px] text-[14px] leading-relaxed text-brand-muted-on-dark">
            Tout ce que vous pouvez diffuser à vos équipes, au même endroit.
            Cherchez par besoin, par moment de l&apos;année ou par format.
          </p>
        </header>

        {/* Recherche */}
        <div className="mt-6">
          <div className="flex items-center gap-3 rounded-2xl border border-brand-border-dark bg-brand-surface px-5 py-4 transition focus-within:border-brand-accent/50 focus-within:ring-[3px] focus-within:ring-brand-accent/15">
            <SearchIcon />
            <input
              id="kit-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setQ("");
              }}
              placeholder="Rechercher : « burnout », « feedback », « onboarding manager »…"
              autoComplete="off"
              aria-label="Rechercher un kit"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-brand-cream placeholder:text-brand-muted-on-dark/70 focus:outline-none"
            />
            {q ? (
              <button
                type="button"
                onClick={() => setQ("")}
                aria-label="Effacer la recherche"
                className="grid h-6 w-6 place-items-center rounded-full text-brand-muted-on-dark hover:text-brand-cream"
              >
                ×
              </button>
            ) : (
              <kbd className="hidden rounded-md border border-brand-border-dark px-1.5 py-0.5 text-[11px] text-brand-muted-on-dark/70 sm:block">
                esc pour effacer
              </kbd>
            )}
          </div>
        </div>

        {/* Onglets — segmented nav (une seule rubrique affichée à la fois) */}
        <nav className="mt-7 flex flex-wrap gap-1 border-b border-brand-border-dark" aria-label="Rubriques">
          {TAB_META.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTab(t.id)}
                aria-pressed={active}
                className={`relative flex items-center gap-2.5 px-1.5 pb-4 pt-3 text-[15px] font-semibold transition-colors focus-visible:outline-none ${
                  active ? "text-brand-cream" : "text-brand-muted-on-dark hover:text-brand-cream"
                }`}
              >
                <span aria-hidden className="text-[16px]">
                  {t.icon}
                </span>
                <span className="flex flex-col text-left leading-[1.15]">
                  <span>{t.label}</span>
                  <span
                    className={`hidden text-[11px] font-medium sm:block ${
                      active ? "text-brand-accent/70" : "text-brand-muted-on-dark"
                    }`}
                  >
                    {t.sub}
                  </span>
                </span>
                <span
                  className={`min-w-[22px] rounded-full px-2 py-0.5 text-center text-[11px] font-bold ${
                    active
                      ? "bg-brand-accent/[0.18] text-brand-accent"
                      : "bg-brand-muted-on-dark/[0.14] text-brand-muted-on-dark"
                  }`}
                >
                  {tabCounts[t.id]}
                </span>
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-1.5 -bottom-px h-[2.5px] rounded bg-brand-accent"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Filtres contextuels compacts */}
        {renderFilterBar()}

        {/* Pastilles de filtres actifs */}
        {pills.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-2">
            {pills.map((p) => (
              <span
                key={p.key}
                className="inline-flex items-center gap-1.5 rounded-full border border-brand-accent/40 bg-brand-accent/15 py-1 pl-3 pr-1.5 text-[12.5px] font-medium text-brand-accent"
              >
                {p.label}
                <button
                  type="button"
                  onClick={p.onRemove}
                  aria-label={`Retirer le filtre ${p.label}`}
                  className="grid h-[18px] w-[18px] place-items-center rounded-full text-brand-accent hover:bg-brand-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Compteur de la rubrique + tri */}
        <div className="mb-4 mt-[18px] flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13.5px] text-brand-muted-on-dark">
            <b className="text-brand-cream">{visible.length}</b> kit
            {visible.length > 1 ? "s" : ""} dans cette rubrique
          </p>
          <label className="flex items-center gap-2 text-[13px] text-brand-muted-on-dark">
            Trier
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortId)}
              className="rounded-lg border border-brand-border-dark bg-brand-surface px-3 py-1.5 text-[13px] text-brand-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60"
            >
              <option value="relevance">Pertinence</option>
              <option value="new">Nouveautés d&apos;abord</option>
              <option value="az">A → Z</option>
              <option value="period">Par période</option>
            </select>
          </label>
        </div>

        {/* Panneau de la rubrique active */}
        {visible.length === 0 ? (
          <EmptyState onReset={resetFilters} query={q} />
        ) : tab === "actualites" ? (
          <TempsFortCalendar cards={visible} currentMonth={currentMonth} onOpen={setActiveCard} />
        ) : tab === "lancement" ? (
          <div className="space-y-8">
            {STEP_ORDER.map((step, i) => {
              const list = visible.filter(
                (c) => c.payload.kind === "lancement" && c.payload.data.step === step
              );
              if (list.length === 0) return null;
              return (
                <div key={step}>
                  <div className="mb-4 flex items-center gap-3">
                    <span className="grid h-[26px] w-[26px] place-items-center rounded-lg bg-[#e0b657]/15 text-[12px] font-bold text-[#e0b657]">
                      {i + 1}
                    </span>
                    <h3 className="text-[15px] font-semibold text-brand-cream">{stepLabels[step]}</h3>
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(248px,1fr))] gap-4">
                    {list.map((c) => (
                      <Card key={c.id} card={c} onOpen={() => setActiveCard(c.payload)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(248px,1fr))] gap-4">
            {visible.map((c) => (
              <Card key={c.id} card={c} onOpen={() => setActiveCard(c.payload)} />
            ))}
          </div>
        )}
      </div>

      {activeCard && <KitModal active={activeCard} onClose={() => setActiveCard(null)} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composants de présentation
// ─────────────────────────────────────────────────────────────────────────────

// Dropdown compact : bouton + popover de cases à cocher (remplace l'ancien rail
// FacetGroup/FacetOption). Réutilise FacetOption pour chaque option et la même
// dimension de filtre — aucune nouvelle donnée.
function FilterDropdown({
  label,
  options,
  isSelected,
  onToggle,
  selectedCount,
}: {
  label: string;
  options: { value: string; label: string; count: number }[];
  isSelected: (value: string) => boolean;
  onToggle: (value: string) => void;
  selectedCount: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  if (options.length === 0) return null;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`inline-flex items-center gap-2 rounded-[10px] border px-[13px] py-2 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60 ${
          selectedCount > 0
            ? "border-brand-accent/55 bg-brand-accent/[0.08] text-brand-cream"
            : "border-brand-border-dark bg-brand-surface text-brand-cream hover:border-brand-accent/40"
        }`}
      >
        <span>{label}</span>
        {selectedCount > 0 && (
          <span className="min-w-[18px] rounded-full bg-brand-accent px-1.5 text-center text-[10px] font-bold text-brand-dark">
            {selectedCount}
          </span>
        )}
        <svg
          className={`h-2 w-3 text-brand-muted-on-dark transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 12 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M1.5 1.5 6 6 10.5 1.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-30 min-w-[210px] rounded-xl border border-brand-border-dark bg-[#0d211c] p-1.5 shadow-[0_14px_40px_rgba(0,0,0,0.5)]">
          {options.map((o) => (
            <FacetOption
              key={o.value}
              checked={isSelected(o.value)}
              onChange={() => onToggle(o.value)}
              label={o.label}
              count={o.count}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FacetOption({
  checked,
  onChange,
  label,
  count,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  count: number;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] text-brand-muted-on-dark transition-colors hover:bg-white/[0.04] hover:text-brand-cream">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={onChange} />
      <span
        aria-hidden
        className={`grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border-[1.5px] transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand-accent/70 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-brand-dark ${
          checked
            ? "border-brand-accent bg-brand-accent text-brand-dark"
            : "border-brand-border-dark text-transparent"
        }`}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12 10 17 19 7" />
        </svg>
      </span>
      <span className={`flex-1 ${checked ? "font-medium text-brand-cream" : ""}`}>{label}</span>
      <span className="text-[11.5px] text-brand-muted-on-dark/70">{count}</span>
    </label>
  );
}

function Card({
  card,
  onOpen,
  hideMonth,
}: {
  card: KitCard;
  onOpen: () => void;
  hideMonth?: boolean;
}) {
  const meta = TYPE_META[card.type];
  const shownAuds = card.audiences.filter((a) => a !== "tous");
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border border-brand-border-dark bg-brand-surface p-[18px] text-left transition-all hover:-translate-y-0.5 hover:border-brand-accent/50 hover:shadow-[0_6px_24px_rgba(0,0,0,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10.5px] font-bold uppercase tracking-wide ${meta.badge}`}
        >
          <span aria-hidden>{meta.icon}</span>
          {meta.label}
        </span>
        {card.isNew && (
          <span className="rounded-md bg-brand-accent px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-brand-dark">
            Nouveau
          </span>
        )}
      </div>
      <h3 className="text-[13px] font-semibold leading-snug tracking-[-0.2px] text-brand-cream">
        {card.title}
      </h3>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        <span className="rounded-full border border-brand-border-dark/70 bg-brand-dark/50 px-2.5 py-1 text-[11px] text-brand-muted-on-dark">
          {card.theme}
        </span>
        {shownAuds.map((a) => (
          <span
            key={a}
            className="rounded-full border border-brand-border-dark/70 bg-brand-dark/50 px-2.5 py-1 text-[11px] text-brand-muted-on-dark/80"
          >
            {AUD_META[a]}
          </span>
        ))}
        <span className="text-[11px] text-brand-muted-on-dark/70">{langFlag(card.lang)}</span>
        {card.month && !hideMonth && (
          <span className="rounded-full border border-brand-border-dark/70 bg-brand-dark/50 px-2.5 py-1 text-[11px] text-brand-muted-on-dark/80">
            {monthName(card.month)}
          </span>
        )}
      </div>
      <span className="flex items-center gap-1.5 text-[13px] font-semibold text-brand-accent">
        Voir le contenu
        <svg
          className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Calendrier des temps forts (trimestre → mois)
// ─────────────────────────────────────────────────────────────────────────────

type CommQuarterId = "Q1" | "Q2" | "Q3" | "Q4";
type CommQuarter = { id: CommQuarterId; months: string[] };
const commQuarters: CommQuarter[] = [
  { id: "Q1", months: ["January", "February", "March"] },
  { id: "Q2", months: ["April", "May", "June"] },
  { id: "Q3", months: ["July", "August", "September"] },
  { id: "Q4", months: ["October", "November", "December"] },
];
type MonthStatus = "past" | "current" | "upcoming";

function monthStatusOf(month: string, curIdx: number): MonthStatus {
  const i = allMonths.indexOf(month);
  if (i < curIdx) return "past";
  if (i === curIdx) return "current";
  return "upcoming";
}
function quarterIdOfIdx(idx: number): CommQuarterId {
  if (idx <= 2) return "Q1";
  if (idx <= 5) return "Q2";
  if (idx <= 8) return "Q3";
  return "Q4";
}
function quarterStatusOf(q: CommQuarter, curIdx: number): "past" | "current" | "upcoming" {
  if (monthStatusOf(q.months[q.months.length - 1], curIdx) === "past") return "past";
  if (monthStatusOf(q.months[0], curIdx) === "upcoming") return "upcoming";
  return "current";
}
function commQuarterProgressOf(q: CommQuarter, curIdx: number): number {
  const s = quarterStatusOf(q, curIdx);
  if (s === "past") return 100;
  if (s === "upcoming") return 0;
  const startIdx = allMonths.indexOf(q.months[0]);
  return Math.round((curIdx - startIdx) * 33 + 15);
}
function TempsFortCalendar({
  cards,
  currentMonth,
  onOpen,
}: {
  cards: KitCard[];
  currentMonth: number;
  onOpen: (p: ActiveCard) => void;
}) {
  const curIdx = currentMonth - 1;
  const [activeQId, setActiveQId] = useState<CommQuarterId>(quarterIdOfIdx(curIdx));
  const quarter = commQuarters.find((q) => q.id === activeQId)!;

  const cardsOfMonth = (m: string) =>
    cards.filter((c) => c.month === allMonths.indexOf(m) + 1);
  const quarterCards = cards.filter(
    (c) => c.month !== null && quarter.months.includes(allMonths[c.month - 1])
  );
  const upcomingCount = quarterCards.filter(
    (c) => c.month !== null && monthStatusOf(allMonths[c.month - 1], curIdx) !== "past"
  ).length;
  const countOfQuarter = (q: CommQuarter) =>
    cards.filter((c) => c.month !== null && q.months.includes(allMonths[c.month - 1])).length;

  return (
    <section>
      {/* Légende des statuts de mois (mois en cours / à venir / passé) */}
      <div className="mb-[18px] flex flex-wrap gap-4 text-[11.5px] text-brand-muted-on-dark">
        <span className="inline-flex items-center gap-1.5">
          <i className="h-[11px] w-[11px] rounded-[3px] bg-brand-accent shadow-[0_0_8px_rgba(132,212,166,0.5)]" />
          Mois en cours
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="h-[11px] w-[11px] rounded-[3px] border-[1.5px] border-brand-blue-soft" />
          À venir
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="h-[11px] w-[11px] rounded-[3px] bg-brand-muted-on-dark/35" />
          Passé
        </span>
      </div>

      <div className="mb-7 grid grid-cols-2 gap-[10px] sm:grid-cols-4">
        {commQuarters.map((q) => (
          <QuarterTab
            key={q.id}
            quarter={q}
            curIdx={curIdx}
            isActive={q.id === activeQId}
            count={countOfQuarter(q)}
            onClick={() => setActiveQId(q.id)}
          />
        ))}
      </div>

      <div className="mb-[18px] flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-[14px] font-semibold tracking-[0.3px] text-brand-cream">
          Communications du trimestre <span className="text-brand-accent">·</span>{" "}
          <span className="font-medium text-brand-muted-on-dark">
            {quarter.months.map((m) => monthLabel[m] ?? m).join(" · ")} 2026
          </span>
        </div>
        <div className="text-[11px] uppercase tracking-[0.5px] text-brand-muted-on-dark/70">
          {quarterCards.length} kit{quarterCards.length > 1 ? "s" : ""} · {upcomingCount} à venir
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[14px] md:grid-cols-3">
        {quarter.months.map((month) => (
          <MonthColumn
            key={month}
            month={month}
            curIdx={curIdx}
            cards={cardsOfMonth(month)}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  );
}

function QuarterTab({
  quarter,
  curIdx,
  isActive,
  count,
  onClick,
}: {
  quarter: CommQuarter;
  curIdx: number;
  isActive: boolean;
  count: number;
  onClick: () => void;
}) {
  const status = quarterStatusOf(quarter, curIdx);
  const progress = commQuarterProgressOf(quarter, curIdx);
  const monthAbbrs = quarter.months.map((m) => (monthLabel[m] ?? m).slice(0, 3)).join(" · ");
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`rounded-[11px] border p-[14px_16px] text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60 ${
        status === "past" && !isActive
          ? "border-transparent opacity-60 hover:opacity-90"
          : isActive
            ? "border-brand-accent/30 bg-brand-accent/[0.07] shadow-[0_0_0_1px_rgba(132,212,166,0.15)]"
            : "border-transparent hover:bg-white/[0.03]"
      }`}
    >
      <div className="mb-[10px] flex items-center justify-between gap-2">
        <span className={`text-[11px] font-bold tracking-[0.6px] ${isActive ? "text-brand-accent" : "text-brand-muted-on-dark"}`}>
          {monthAbbrs}
        </span>
        <span className="rounded-full bg-brand-dark/60 px-1.5 py-0.5 text-[10px] font-semibold text-brand-muted-on-dark">
          {count}
        </span>
      </div>
      <div className="h-[3px] overflow-hidden rounded-[2px] bg-white/[0.05]">
        <div
          className={`h-full rounded-[2px] ${status === "past" ? "bg-brand-muted-on-dark/40" : "bg-gradient-to-r from-brand-teal-bright to-brand-accent"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </button>
  );
}

function MonthColumn({
  month,
  curIdx,
  cards,
  onOpen,
}: {
  month: string;
  curIdx: number;
  cards: KitCard[];
  onOpen: (p: ActiveCard) => void;
}) {
  const status = monthStatusOf(month, curIdx);
  const isCurrent = status === "current";
  return (
    <div
      className={`relative rounded-[14px] p-4 transition-colors ${
        isCurrent
          ? "border-[1.5px] border-brand-accent bg-[linear-gradient(180deg,rgba(132,212,166,0.10),rgba(132,212,166,0.03))] shadow-[0_0_0_4px_rgba(132,212,166,0.10),0_10px_30px_rgba(0,0,0,0.3)]"
          : status === "past"
            ? "border border-white/[0.04] bg-white/[0.012] opacity-60"
            : "border border-white/[0.04] bg-white/[0.012]"
      }`}
    >
      {/* Liseré vertical gauche — accentue le mois en cours */}
      {isCurrent && (
        <span
          aria-hidden
          className="absolute bottom-3.5 left-0 top-3.5 w-[3px] rounded-[2px] bg-brand-accent"
        />
      )}
      <div
        className={`mb-3 flex items-center justify-between border-b pb-3 ${
          isCurrent ? "border-brand-accent/20" : "border-white/5"
        }`}
      >
        <div className="flex items-center gap-[9px]">
          <h4 className={`text-[12px] font-bold uppercase tracking-[1.8px] ${status === "past" ? "text-brand-muted-on-dark/70" : "text-brand-cream"}`}>
            {monthLabel[month]}
          </h4>
          {isCurrent ? (
            <span className="rounded-[5px] bg-brand-accent px-[7px] py-[3px] text-[9px] font-bold uppercase tracking-[0.5px] text-brand-dark shadow-[0_0_12px_rgba(132,212,166,0.45)]">
              Ce mois-ci
            </span>
          ) : status === "upcoming" ? (
            <span className="rounded-[5px] border border-brand-blue-soft/40 px-1.5 py-[2px] text-[9px] font-bold uppercase tracking-[0.5px] text-brand-blue-soft">
              À venir
            </span>
          ) : (
            <span className="text-[9px] font-bold uppercase tracking-[0.5px] text-brand-muted-on-dark/60">
              Passé
            </span>
          )}
        </div>
        <span className="text-[10px] tracking-[0.5px] text-brand-muted-on-dark/70">
          {cards.length === 0 ? "—" : `${cards.length} kit${cards.length > 1 ? "s" : ""}`}
        </span>
      </div>
      {cards.length === 0 ? (
        <p className="py-5 text-center text-[11px] italic text-brand-muted-on-dark/70">
          Pas de communication programmée.
        </p>
      ) : (
        <div className="space-y-3">
          {cards.map((c) => (
            <Card key={c.id} card={c} hideMonth onOpen={() => onOpen(c.payload)} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ onReset, query }: { onReset: () => void; query: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-brand-border-dark bg-brand-surface/30 px-6 py-16 text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center text-brand-muted-on-dark/60">
        <svg
          width="46"
          height="46"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      </div>
      <p className="text-base font-medium text-brand-cream">
        {query.trim()
          ? `Aucun kit ne correspond à « ${query.trim()} »`
          : "Aucun kit ne correspond"}
      </p>
      <p className="mt-2 text-sm text-brand-muted-on-dark">
        Essayez d&apos;élargir vos filtres ou de modifier votre recherche.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-5 rounded-full border border-brand-accent/50 px-4 py-1.5 text-xs font-medium text-brand-accent transition-colors hover:bg-brand-accent hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60"
      >
        Réinitialiser les filtres
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modale (réutilise les corps existants, + corps "atelier" avec sélecteurs)
// ─────────────────────────────────────────────────────────────────────────────

function KitModal({ active, onClose }: { active: ActiveCard; onClose: () => void }) {
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
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-brand-muted-on-dark transition-colors hover:bg-brand-border-dark hover:text-brand-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60"
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

        {active.kind === "workshop" && <WorkshopModalBody workshop={active.workshop} />}

        {active.kind === "animation" && <AnimationModalBody item={active.data} />}

        {active.kind === "visuel" && <VisuelModalBody item={active.data} />}
      </div>
    </div>
  );
}

function WorkshopModalBody({ workshop }: { workshop: Workshop }) {
  const [kitType, setKitType] = useState<WorkshopKitType>("invitation");
  const [language, setLanguage] = useState<"FR" | "EN">("FR");
  const [copied, setCopied] = useState(false);

  const body = defaultWorkshopKitTemplate(workshop, kitType, language);
  const themeName = workshopThemeNameById[workshop.themeId] ?? "Atelier";
  const files = workshop.communicationKit ?? [];

  const copy = () => {
    void copyKitBody(body).then((ok) => {
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 pr-12">
        <span className="rounded-full bg-brand-accent/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand-accent">
          Kit atelier
        </span>
        <span className="rounded-full bg-brand-cream/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand-cream">
          {themeName}
        </span>
      </div>
      <h2 className="mt-3 text-2xl font-medium tracking-tight text-brand-cream">
        {workshop.title}
      </h2>
      {workshop.subtitle && (
        <p className="mt-1 text-sm text-brand-muted-on-dark">{workshop.subtitle}</p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {(["invitation", "relance", "post"] as WorkshopKitType[]).map((kt) => (
          <button
            key={kt}
            type="button"
            onClick={() => {
              setKitType(kt);
              setCopied(false);
            }}
            aria-pressed={kitType === kt}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60 ${
              kitType === kt
                ? "border-brand-accent bg-brand-accent/15 text-brand-accent"
                : "border-brand-border-dark text-brand-cream hover:bg-brand-dark/40"
            }`}
          >
            <span aria-hidden>{workshopKitIcons[kt]}</span>
            {workshopKitLabels[kt]}
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        {(["FR", "EN"] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => {
              setLanguage(l);
              setCopied(false);
            }}
            aria-pressed={language === l}
            className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60 ${
              language === l
                ? "border-brand-accent bg-brand-accent/15 text-brand-accent"
                : "border-brand-border-dark text-brand-cream hover:bg-brand-dark/40"
            }`}
          >
            {l === "FR" ? "🇫🇷 Français" : "🇬🇧 English"}
          </button>
        ))}
      </div>

      <h3 className="mt-6 mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
        Aperçu du contenu
      </h3>
      <RichText body={body} className="max-h-72 overflow-y-auto rounded-lg border border-brand-border-dark bg-brand-dark/40 p-4 text-sm leading-relaxed text-brand-cream" />
      <p className="mt-2 text-[11px] text-brand-muted-on-dark">
        Aperçu indicatif — adaptez les variables (prénoms, dates, liens) avant envoi.
      </p>

      {files.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
            Fichiers joints <span className="text-brand-muted-on-dark">({files.length})</span>
          </h3>
          <ul className="space-y-1.5">
            {files.map((f) => (
              <li
                key={f.id}
                className="flex items-center gap-3 rounded-lg border border-brand-border-dark bg-brand-dark/30 px-3 py-2"
              >
                <span className="text-brand-muted-on-dark">
                  {f.mimeType.startsWith("image/") ? <ImageIcon /> : <PdfIcon />}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-brand-cream">{f.name}</span>
                <button
                  type="button"
                  onClick={() => void openKitFile(f.path, f.name)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brand-accent/40 px-3 py-1 text-[11px] font-medium text-brand-accent transition-colors hover:bg-brand-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60"
                >
                  <DownloadIcon /> Télécharger
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-brand-border-dark pt-5">
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-accent px-4 py-2 text-xs font-medium text-brand-dark transition-colors hover:bg-brand-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60"
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

function VisuelModalBody({ item }: { item: VisuelKit }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void getKitFileUrl(item.path).then((u) => {
      if (alive) setPreviewUrl(u);
    });
    return () => {
      alive = false;
    };
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
      <h2 className="mt-3 text-2xl font-medium tracking-tight text-brand-cream">{item.title}</h2>

      <div className="mt-5 grid aspect-video w-full place-items-center overflow-hidden rounded-xl border border-brand-border-dark bg-brand-dark/40">
        {isImage && previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={item.title}
            className="max-h-full max-w-full object-contain p-4"
          />
        ) : (
          <span className="text-4xl opacity-60" aria-hidden>
            📄
          </span>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-brand-border-dark pt-5">
        <button
          type="button"
          onClick={() => void openKitFile(item.path, kitFileLabel(item.path) || item.title)}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-accent px-4 py-2 text-xs font-medium text-brand-dark transition-colors hover:bg-brand-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60"
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
    void copyKitBody(body).then((ok) => {
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    });
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
      <h2 className="mt-3 text-2xl font-medium tracking-tight text-brand-cream">{title}</h2>

      <h3 className="mt-6 mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
        Aperçu du contenu
      </h3>
      <RichText body={body} className="max-h-80 overflow-y-auto rounded-lg border border-brand-border-dark bg-brand-dark/40 p-4 text-sm leading-relaxed text-brand-cream" />
      <p className="mt-2 text-[11px] text-brand-muted-on-dark">
        Aperçu indicatif — adaptez les variables (prénoms, dates, liens) avant envoi.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-brand-border-dark pt-5">
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-accent px-4 py-2 text-xs font-medium text-brand-dark transition-colors hover:bg-brand-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60"
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
      <h2 className="mt-3 text-2xl font-medium tracking-tight text-brand-cream">{item.title}</h2>

      {item.landing && (
        <a
          href={item.landing}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-brand-border-dark bg-brand-dark/40 px-4 py-2.5 text-sm text-brand-cream transition-colors hover:border-brand-accent/50 hover:bg-brand-dark/70"
        >
          <LinkIcon />
          Voir la landing page
          <span className="text-[11px] text-brand-muted-on-dark">({new URL(item.landing).host})</span>
        </a>
      )}

      {item.body?.trim() && <CopyableTextBlock body={item.body.trim()} />}

      <div className="mt-6 space-y-5">
        <ResourceGroup title="Visuels FR" flag="🇫🇷" files={item.imagesFr} kind="image" />
        <ResourceGroup title="Visuels EN" flag="🇬🇧" files={item.imagesEn} kind="image" />
        <ResourceGroup title="PDF FR" flag="🇫🇷" files={item.pdfFr} kind="pdf" />
        <ResourceGroup title="PDF EN" flag="🇬🇧" files={item.pdfEn} kind="pdf" />
      </div>

      <p className="mt-6 border-t border-brand-border-dark pt-4 text-[11px] text-brand-muted-on-dark">
        Les fichiers sources sont hébergés dans Notion. La connexion à l&apos;export
        téléchargeable arrive prochainement — pour l&apos;instant les boutons listent les
        ressources disponibles.
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
              title={
                name.includes("/")
                  ? "Télécharger"
                  : "Fichier hérité (re-uploader depuis le catalogue)"
              }
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

// Reusable copy-to-clipboard block for the body field on animation kits.
function CopyableTextBlock({ body }: { body: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void copyKitBody(body).then((ok) => {
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    });
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
      <RichText body={body} className="max-h-60 overflow-y-auto rounded-lg border border-brand-border-dark bg-brand-dark/40 p-4 text-sm leading-relaxed text-brand-cream" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Templates par défaut (repris à l'identique de l'ancienne page)
// ─────────────────────────────────────────────────────────────────────────────

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
    dday: "C'est aujourd'hui ! teale est ouvert à toutes et tous dès maintenant.",
    after:
      "Cela fait quelques semaines que teale est disponible — voici quelques rappels pour profiter pleinement de la plateforme.",
  };
  const intro = stepIntro[k.step] ?? "Voici un nouveau message à diffuser à vos équipes.";

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

// ─────────────────────────────────────────────────────────────────────────────
// Icônes
// ─────────────────────────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-brand-muted-on-dark"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
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
