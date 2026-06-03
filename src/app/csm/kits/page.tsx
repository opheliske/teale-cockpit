"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  useKitsStore,
  type LancementKit,
  type AnimationItem,
  type EmailTopicKit,
  type VisuelKit,
} from "@/lib/kits-store";
import { VISUEL_CATEGORIES, type VisuelCategory } from "@/app/(client)/kits-communication/data";
import { uploadKitFile, getKitFileUrl, kitFileLabel, openKitFile } from "@/lib/storage";
import { useWorkshops, themes as workshopThemes, type Workshop } from "@/lib/workshops-store";
import { setSeenIds } from "@/lib/catalogue-read-state";
import { useNewCatalogueItems } from "@/lib/use-new-catalogue-items";

// ─────────────────────────────────────────────────────────────────────────────
// Cette page reprend EXACTEMENT l'UX de la page client (grille unique à facettes,
// collections, recherche, tri, état vide) — voir (client)/kits-communication —
// en y greffant le CRUD CSM : ajout / édition / suppression des kits via le
// slide-over, la confirmation de suppression et le détail (lecture seule +
// bouton Éditer). Les ateliers restent en lecture seule (gérés dans le
// Catalogue d'ateliers).
// ─────────────────────────────────────────────────────────────────────────────

// ─── normalisation (identique au client) ─────────────────────────────────────

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

type EditingKind = "lancement" | "animation" | "email" | "visuel";

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
  month: number | null;
  isNew: boolean;
  payload: ActiveCard;
  editKind: EditingKind | null; // null = lecture seule (ateliers)
  rawId: string;
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
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const monthLabel: Record<string, string> = {
  January: "Janvier", February: "Février", March: "Mars", April: "Avril",
  May: "Mai", June: "Juin", July: "Juillet", August: "Août",
  September: "Septembre", October: "Octobre", November: "Novembre", December: "Décembre",
};

function monthName(n: number): string {
  return monthLabel[allMonths[n - 1]] ?? "";
}

const EMAIL_TOPICS = [
  "ABILITY TO COPE",
  "WORK-LIFE BALANCE",
  "COHESION",
  "STRESS MANAGEMENT",
  "RECOGNITION",
  "EMOTION REGULATION",
  "VALUE ALIGNMENT",
  "PHYSICAL WELL-BEING AND STRESS",
] as const;

function topicLabel(topic: string): string {
  switch (topic) {
    case "ABILITY TO COPE": return "Capacité à faire face";
    case "WORK-LIFE BALANCE": return "Équilibre pro / perso";
    case "COHESION": return "Cohésion";
    case "STRESS MANAGEMENT": return "Gestion du stress";
    case "RECOGNITION": return "Reconnaissance";
    case "EMOTION REGULATION": return "Régulation des émotions";
    case "VALUE ALIGNMENT": return "Alignement des valeurs";
    case "PHYSICAL WELL-BEING AND STRESS": return "Bien-être physique";
    default: return topic;
  }
}

// Public dérivé du titre par mots-clés (pas de champ structuré). Défaut "tous".
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

type CollectionId = "all" | "new" | "month" | "managers" | "lancement";
type SortId = "relevance" | "new" | "az" | "period";

function toggle<T>(setter: Dispatch<SetStateAction<Set<T>>>, val: T) {
  setter((prev) => {
    const next = new Set(prev);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    return next;
  });
}

// ─── form types (repris de l'ancienne page CSM) ───────────────────────────────

type Step = "before" | "dday" | "after";
type EmailLanguage = "FR" | "EN";

interface VisuelForm {
  title: string;
  category: VisuelCategory;
  path: string;
  mimeType: string;
}

const EMPTY_VISUEL: VisuelForm = { title: "", category: "logo", path: "", mimeType: "" };

function visuelToForm(v: VisuelKit): VisuelForm {
  return { title: v.title, category: v.category, path: v.path, mimeType: v.mimeType };
}

function formToVisuel(f: VisuelForm, existingId?: string): VisuelKit {
  return {
    id: existingId ?? "vis-" + Date.now().toString(36),
    title: f.title.trim(),
    category: f.category,
    path: f.path,
    mimeType: f.mimeType,
  };
}

interface LancementForm {
  title: string;
  step: Step;
  language: EmailLanguage;
  body: string;
}

interface AnimationForm {
  title: string;
  month: string;
  type: string;
  status: string;
  landing: string;
  languageFR: boolean;
  languageEN: boolean;
  imagesFrText: string;
  imagesEnText: string;
  pdfFrText: string;
  pdfEnText: string;
  body: string;
}

interface EmailForm {
  title: string;
  topic: string;
  language: EmailLanguage;
  body: string;
}

const EMPTY_LANCEMENT: LancementForm = { title: "", step: "before", language: "FR", body: "" };

const EMPTY_ANIMATION: AnimationForm = {
  title: "", month: "January", type: "Playlist", status: "Upcoming / À venir",
  landing: "", languageFR: true, languageEN: false,
  imagesFrText: "", imagesEnText: "", pdfFrText: "", pdfEnText: "", body: "",
};

const EMPTY_EMAIL: EmailForm = { title: "", topic: "ABILITY TO COPE", language: "FR", body: "" };

function lancementToForm(k: LancementKit): LancementForm {
  return { title: k.title, step: k.step, language: k.language, body: k.body ?? "" };
}

function animationToForm(a: AnimationItem): AnimationForm {
  return {
    title: a.title,
    month: a.month,
    type: a.type,
    status: a.status,
    landing: a.landing ?? "",
    languageFR: a.languages.includes("FR"),
    languageEN: a.languages.includes("EN"),
    imagesFrText: a.imagesFr.join("\n"),
    imagesEnText: a.imagesEn.join("\n"),
    pdfFrText: a.pdfFr.join("\n"),
    pdfEnText: a.pdfEn.join("\n"),
    body: a.body ?? "",
  };
}

function emailToForm(e: EmailTopicKit): EmailForm {
  return { title: e.title, topic: e.topic, language: e.language, body: e.body ?? "" };
}

// id généré pour un brouillon (upload avant enregistrement). Défini au niveau
// module : la règle react-hooks/purity ne flague Date.now() que dans le corps
// d'un composant/hook, pas dans une fonction module-scope.
function genDraftId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}`;
}

function formToLancement(f: LancementForm, existingId?: string): LancementKit {
  return {
    id: existingId ?? "lan-" + Date.now().toString(36),
    title: f.title.trim(),
    step: f.step,
    language: f.language,
    body: f.body.trim() || undefined,
  };
}

function formToAnimation(f: AnimationForm, existingId?: string): AnimationItem {
  const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
  const languages: string[] = [];
  if (f.languageFR) languages.push("FR");
  if (f.languageEN) languages.push("EN");
  return {
    id: existingId ?? "ani-" + Date.now().toString(36),
    title: f.title.trim(),
    month: f.month,
    type: f.type,
    status: f.status,
    landing: f.landing.trim() || undefined,
    languages,
    imagesFr: lines(f.imagesFrText),
    imagesEn: lines(f.imagesEnText),
    pdfFr: lines(f.pdfFrText),
    pdfEn: lines(f.pdfEnText),
    body: f.body.trim() || undefined,
  };
}

function formToEmail(f: EmailForm, existingId?: string): EmailTopicKit {
  return {
    id: existingId ?? "emt-" + Date.now().toString(36),
    title: f.title.trim(),
    topic: f.topic,
    language: f.language,
    body: f.body.trim() || undefined,
  };
}

// ─── main page ────────────────────────────────────────────────────────────────

const ADD_KINDS: { kind: EditingKind; label: string; icon: string }[] = [
  { kind: "animation", label: "Temps fort", icon: "📅" },
  { kind: "email", label: "Email", icon: "💌" },
  { kind: "lancement", label: "Lancement", icon: "🚀" },
  { kind: "visuel", label: "Visuel", icon: "🎨" },
];

export default function CsmKitsPage() {
  const {
    lancementKits, animationItems, emailTopicKits, visuelKits,
    addLancementKit, updateLancementKit, deleteLancementKit,
    addAnimationItem, updateAnimationItem, deleteAnimationItem,
    addEmailTopicKit, updateEmailTopicKit, deleteEmailTopicKit,
    addVisuelKit, updateVisuelKit, deleteVisuelKit,
  } = useKitsStore();
  const { workshops } = useWorkshops();
  const { kits: newKitIds, ateliers: newAtelierIds } = useNewCatalogueItems();

  // Ensemble des "nouveautés" — stable pendant la visite car on ne marque "vu"
  // qu'au démontage (cf. plus bas), pour garder les tags "Nouveau" visibles.
  const newSet = useMemo(
    () => new Set([...newKitIds, ...newAtelierIds]),
    [newKitIds, newAtelierIds]
  );

  // Visiter /csm/kits éteint la pastille "nouveaux kits" sur la home CSM — mais
  // au départ de la page seulement, pour ne pas masquer les tags pendant la
  // visite. (setSeenIds n'est pas un setState React : sûr en effet.)
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
  const [collection, setCollection] = useState<CollectionId>("all");
  const [types, setTypes] = useState<Set<KitTypeId>>(new Set());
  const [themesSel, setThemesSel] = useState<Set<string>>(new Set());
  const [auds, setAuds] = useState<Set<AudId>>(new Set());
  const [langs, setLangs] = useState<Set<LangId>>(new Set());
  const [sort, setSort] = useState<SortId>("relevance");
  const [railOpen, setRailOpen] = useState(false);

  // slide-over form
  const [editingKind, setEditingKind] = useState<EditingKind | null>(null);
  const [kitDraftId, setKitDraftId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [lancementForm, setLancementForm] = useState<LancementForm>(EMPTY_LANCEMENT);
  const [animationForm, setAnimationForm] = useState<AnimationForm>(EMPTY_ANIMATION);
  const [emailForm, setEmailForm] = useState<EmailForm>(EMPTY_EMAIL);
  const [visuelForm, setVisuelForm] = useState<VisuelForm>(EMPTY_VISUEL);
  const [formError, setFormError] = useState("");

  // delete confirm + detail viewer
  const [confirmDelete, setConfirmDelete] = useState<{ kind: EditingKind; id: string } | null>(null);
  const [viewing, setViewing] = useState<KitCard | null>(null);

  // "Ajouter un kit" menu
  const [addOpen, setAddOpen] = useState(false);
  const addRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!addOpen) return;
    const onDown = (e: MouseEvent) => {
      if (addRef.current && !addRef.current.contains(e.target as Node)) setAddOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [addOpen]);

  const currentMonth = useMemo(() => new Date().getMonth() + 1, []);
  const currentMonthName = monthName(currentMonth);

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
          editKind: "animation",
          rawId: a.id,
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
          editKind: null, // géré dans le Catalogue d'ateliers
          rawId: w.id,
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
          editKind: "email",
          rawId: e.id,
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
          editKind: "lancement",
          rawId: k.id,
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
          editKind: "visuel",
          rawId: v.id,
        })
      );
    }

    return out;
  }, [animationItems, workshops, emailTopicKits, lancementKits, visuelKits, newSet]);

  // ── facettes ────────────────────────────────────────────────────────────────
  const typeFacet = useMemo(
    () =>
      TYPE_ORDER.map((id) => ({
        id,
        label: `${TYPE_META[id].icon} ${TYPE_META[id].label}`,
        count: cards.filter((c) => c.type === id).length,
      })).filter((f) => f.count > 0),
    [cards]
  );
  const themeFacet = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cards) m.set(c.theme, (m.get(c.theme) ?? 0) + 1);
    return [...m.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "fr"))
      .map(([label, count]) => ({ label, count }));
  }, [cards]);
  const audFacet = useMemo(
    () =>
      AUD_ORDER.map((id) => ({
        id,
        label: AUD_META[id],
        count: cards.filter((c) => c.audiences.includes(id)).length,
      })).filter((f) => f.count > 0),
    [cards]
  );
  const langFacet = useMemo(
    () =>
      LANG_ORDER.map((id) => ({
        id,
        label: LANG_META[id],
        count: cards.filter((c) => c.lang === id).length,
      })).filter((f) => f.count > 0),
    [cards]
  );

  const collectionCount = (id: CollectionId): number => {
    switch (id) {
      case "new":
        return cards.filter((c) => c.isNew).length;
      case "month":
        return cards.filter((c) => c.month === currentMonth).length;
      case "managers":
        return cards.filter((c) => c.audiences.includes("managers")).length;
      case "lancement":
        return cards.filter((c) => c.type === "lancement").length;
      default:
        return cards.length;
    }
  };

  const collections: { id: CollectionId; icon: string; label: string }[] = [
    { id: "all", icon: "🗂️", label: "Tous les kits" },
    { id: "new", icon: "✨", label: "Nouveautés" },
    { id: "month", icon: "📍", label: `Ce mois-ci · ${currentMonthName}` },
    { id: "managers", icon: "🧭", label: "Pour managers" },
    { id: "lancement", icon: "🚀", label: "Lancement teale" },
  ];

  // ── filtrage + tri ────────────────────────────────────────────────────────
  const visible = useMemo(() => {
    const query = q.trim().toLowerCase();
    const matchesCollection = (c: KitCard) => {
      switch (collection) {
        case "new":
          return c.isNew;
        case "month":
          return c.month === currentMonth;
        case "managers":
          return c.audiences.includes("managers");
        case "lancement":
          return c.type === "lancement";
        default:
          return true;
      }
    };
    const list = cards.filter((c) => {
      if (!matchesCollection(c)) return false;
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
  }, [cards, q, collection, types, themesSel, auds, langs, sort, currentMonth]);

  const activeFacetCount = types.size + themesSel.size + auds.size + langs.size;
  const hasActiveFilters = activeFacetCount > 0 || !!q.trim() || collection !== "all";

  const resetFilters = () => {
    setQ("");
    setCollection("all");
    setTypes(new Set());
    setThemesSel(new Set());
    setAuds(new Set());
    setLangs(new Set());
  };

  // ── pastilles actives ───────────────────────────────────────────────────────
  const collectionLabel = (id: CollectionId) =>
    collections.find((c) => c.id === id)?.label ?? "";
  const pills: { key: string; label: string; onRemove: () => void }[] = [];
  if (q.trim()) pills.push({ key: "q", label: `« ${q.trim()} »`, onRemove: () => setQ("") });
  if (collection !== "all")
    pills.push({
      key: "col",
      label: collectionLabel(collection),
      onRemove: () => setCollection("all"),
    });
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

  // ── CRUD ──────────────────────────────────────────────────────────────────
  function openNew(kind: EditingKind) {
    setAddOpen(false);
    setEditingKind(kind);
    setEditingId("new");
    setFormError("");
    const prefix =
      kind === "lancement" ? "lan" : kind === "animation" ? "ani" : kind === "email" ? "email" : "vis";
    setKitDraftId(genDraftId(prefix));
    if (kind === "lancement") setLancementForm(EMPTY_LANCEMENT);
    if (kind === "animation") setAnimationForm(EMPTY_ANIMATION);
    if (kind === "email") setEmailForm(EMPTY_EMAIL);
    if (kind === "visuel") setVisuelForm(EMPTY_VISUEL);
  }

  function openEdit(kind: EditingKind, id: string) {
    setViewing(null);
    setEditingKind(kind);
    setEditingId(id);
    setFormError("");
    if (kind === "lancement") {
      const item = lancementKits.find((k) => k.id === id);
      if (item) setLancementForm(lancementToForm(item));
    } else if (kind === "animation") {
      const item = animationItems.find((a) => a.id === id);
      if (item) setAnimationForm(animationToForm(item));
    } else if (kind === "email") {
      const item = emailTopicKits.find((e) => e.id === id);
      if (item) setEmailForm(emailToForm(item));
    } else if (kind === "visuel") {
      const item = visuelKits.find((v) => v.id === id);
      if (item) setVisuelForm(visuelToForm(item));
    }
  }

  function closeForm() {
    setEditingKind(null);
    setEditingId(null);
    setFormError("");
  }

  function handleSubmit() {
    if (editingKind === "lancement") {
      if (!lancementForm.title.trim()) { setFormError("Le titre est obligatoire."); return; }
      const item = formToLancement(lancementForm, editingId === "new" ? undefined : editingId!);
      if (editingId === "new") addLancementKit(item); else updateLancementKit(item);
    } else if (editingKind === "animation") {
      if (!animationForm.title.trim()) { setFormError("Le titre est obligatoire."); return; }
      const item = formToAnimation(animationForm, editingId === "new" ? kitDraftId ?? undefined : editingId!);
      if (editingId === "new") addAnimationItem(item); else updateAnimationItem(item);
    } else if (editingKind === "email") {
      if (!emailForm.title.trim()) { setFormError("Le titre est obligatoire."); return; }
      const item = formToEmail(emailForm, editingId === "new" ? undefined : editingId!);
      if (editingId === "new") addEmailTopicKit(item); else updateEmailTopicKit(item);
    } else if (editingKind === "visuel") {
      if (!visuelForm.title.trim()) { setFormError("Le titre est obligatoire."); return; }
      if (!visuelForm.path) { setFormError("Uploadez un fichier avant d'enregistrer."); return; }
      const item = formToVisuel(visuelForm, editingId === "new" ? kitDraftId ?? undefined : editingId!);
      if (editingId === "new") addVisuelKit(item); else updateVisuelKit(item);
    }
    closeForm();
  }

  function handleDelete() {
    if (!confirmDelete) return;
    const { kind, id } = confirmDelete;
    if (kind === "lancement") deleteLancementKit(id);
    else if (kind === "animation") deleteAnimationItem(id);
    else if (kind === "email") deleteEmailTopicKit(id);
    else if (kind === "visuel") deleteVisuelKit(id);
    setConfirmDelete(null);
  }

  function getDeleteTitle(): string {
    if (!confirmDelete) return "";
    const { kind, id } = confirmDelete;
    if (kind === "lancement") return lancementKits.find((k) => k.id === id)?.title ?? "";
    if (kind === "animation") return animationItems.find((a) => a.id === id)?.title ?? "";
    if (kind === "email") return emailTopicKits.find((e) => e.id === id)?.title ?? "";
    if (kind === "visuel") return visuelKits.find((v) => v.id === id)?.title ?? "";
    return "";
  }

  const renderCard = (c: KitCard) => (
    <Card
      key={c.id}
      card={c}
      onOpen={() => setViewing(c)}
      onEdit={c.editKind ? () => openEdit(c.editKind!, c.rawId) : undefined}
      onDelete={c.editKind ? () => setConfirmDelete({ kind: c.editKind!, id: c.rawId }) : undefined}
    />
  );

  // Les temps forts vont dans la section calendrier (en haut) ; les autres kits
  // dans la grille en dessous.
  const tempsfortCards = useMemo(() => visible.filter((c) => c.type === "tempsfort"), [visible]);
  const otherCards = useMemo(() => visible.filter((c) => c.type !== "tempsfort"), [visible]);

  const renderRail = () => (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted-on-dark">
          Filtres
        </span>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-[12px] font-semibold text-brand-accent transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60"
          >
            Réinitialiser
          </button>
        )}
      </div>
      <FacetGroup title="Type">
        {typeFacet.map((f) => (
          <FacetOption key={f.id} checked={types.has(f.id)} onChange={() => toggle(setTypes, f.id)} label={f.label} count={f.count} />
        ))}
      </FacetGroup>
      <FacetGroup title="Thématique">
        {themeFacet.map((f) => (
          <FacetOption key={f.label} checked={themesSel.has(f.label)} onChange={() => toggle(setThemesSel, f.label)} label={f.label} count={f.count} />
        ))}
      </FacetGroup>
      <FacetGroup title="Public">
        {audFacet.map((f) => (
          <FacetOption key={f.id} checked={auds.has(f.id)} onChange={() => toggle(setAuds, f.id)} label={f.label} count={f.count} />
        ))}
      </FacetGroup>
      <FacetGroup title="Langue">
        {langFacet.map((f) => (
          <FacetOption key={f.id} checked={langs.has(f.id)} onChange={() => toggle(setLangs, f.id)} label={f.label} count={f.count} />
        ))}
      </FacetGroup>
    </div>
  );

  return (
    <div className="px-9 py-8">
      <div className="mx-auto max-w-[1280px]">
        <header className="mb-1">
          <p className="text-[11px] font-semibold uppercase tracking-[2.5px] text-brand-accent">
            Espace CSM
          </p>
          <h1 className="mt-3 text-[28px] font-semibold tracking-[-0.5px] text-brand-cream">
            Kits de communication
          </h1>
          <p className="mt-2 max-w-[560px] text-[14px] leading-relaxed text-brand-muted-on-dark">
            Gérez la bibliothèque partagée avec les clients. Chaque ajout, modification
            ou suppression est visible immédiatement côté client.
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

        {/* Collections */}
        <div className="mt-4 flex flex-wrap gap-2.5">
          {collections.map((col) => {
            const on = collection === col.id;
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => setCollection(col.id)}
                aria-pressed={on}
                className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60 ${
                  on
                    ? "border-brand-accent bg-brand-accent/15 text-brand-accent"
                    : "border-brand-border-dark bg-brand-surface text-brand-cream hover:border-brand-accent/40 hover:bg-brand-surface/70"
                }`}
              >
                <span aria-hidden>{col.icon}</span>
                {col.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    on ? "bg-brand-accent/20 text-brand-accent" : "bg-brand-dark/60 text-brand-muted-on-dark"
                  }`}
                >
                  {collectionCount(col.id)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Corps : rail + résultats */}
        <div className="mt-7 lg:flex lg:items-start lg:gap-8">
          <aside className="hidden w-[236px] shrink-0 lg:sticky lg:top-6 lg:block" aria-label="Filtres">
            {renderRail()}
          </aside>

          <section className="min-w-0 flex-1">
            {/* Bascule filtres mobile */}
            <div className="mb-4 lg:hidden">
              <button
                type="button"
                onClick={() => setRailOpen((o) => !o)}
                aria-expanded={railOpen}
                aria-controls="kit-facets-mobile"
                className="inline-flex items-center gap-2 rounded-xl border border-brand-border-dark bg-brand-surface px-4 py-2 text-[13px] font-medium text-brand-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60"
              >
                <FilterIcon />
                Filtres
                {activeFacetCount > 0 && (
                  <span className="rounded-full bg-brand-accent/20 px-2 py-0.5 text-[11px] text-brand-accent">
                    {activeFacetCount}
                  </span>
                )}
              </button>
              {railOpen && (
                <div id="kit-facets-mobile" className="mt-3 rounded-2xl border border-brand-border-dark bg-brand-surface/50 p-4">
                  {renderRail()}
                </div>
              )}
            </div>

            {/* Barre résultats + Ajouter */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[14px] text-brand-muted-on-dark">
                <b className="text-brand-cream">{visible.length}</b> kit{visible.length > 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-3">
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
                <div className="relative" ref={addRef}>
                  <button
                    type="button"
                    onClick={() => setAddOpen((o) => !o)}
                    aria-expanded={addOpen}
                    aria-haspopup="menu"
                    className="inline-flex items-center gap-2 rounded-[10px] bg-[#5eead4] px-4 py-2 text-[13px] font-semibold text-[#06140f] transition-colors hover:bg-[#84d4a6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60"
                  >
                    <PlusIcon /> Ajouter un kit
                  </button>
                  {addOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-brand-border-dark bg-[#0b1e18] py-1 shadow-xl"
                    >
                      {ADD_KINDS.map((k) => (
                        <button
                          key={k.kind}
                          type="button"
                          role="menuitem"
                          onClick={() => openNew(k.kind)}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] text-brand-cream transition-colors hover:bg-brand-accent/10 hover:text-brand-accent"
                        >
                          <span aria-hidden>{k.icon}</span>
                          {k.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Pastilles actives */}
            {pills.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
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

            {/* Calendrier des temps forts + grille des autres kits / état vide */}
            {visible.length === 0 ? (
              <EmptyState onReset={resetFilters} query={q} />
            ) : (
              <div className="space-y-10">
                {tempsfortCards.length > 0 && (
                  <TempsFortCalendar
                    cards={tempsfortCards}
                    currentMonth={currentMonth}
                    onOpen={(c) => setViewing(c)}
                    onEdit={(c) => openEdit(c.editKind!, c.rawId)}
                    onDelete={(c) => setConfirmDelete({ kind: c.editKind!, id: c.rawId })}
                  />
                )}
                {otherCards.length > 0 && (
                  <section>
                    {tempsfortCards.length > 0 && (
                      <h2 className="mb-4 text-[13px] font-bold uppercase tracking-[0.12em] text-brand-muted-on-dark">
                        Autres kits
                      </h2>
                    )}
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(248px,1fr))] gap-4">
                      {otherCards.map(renderCard)}
                    </div>
                  </section>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* SLIDE-OVER FORM */}
      {editingKind !== null && editingId !== null && (
        <KitsFormSlideOver
          kind={editingKind}
          isNew={editingId === "new"}
          kitId={editingId === "new" ? kitDraftId ?? "" : editingId}
          lancementForm={lancementForm}
          setLancementForm={setLancementForm}
          animationForm={animationForm}
          setAnimationForm={setAnimationForm}
          emailForm={emailForm}
          setEmailForm={setEmailForm}
          visuelForm={visuelForm}
          setVisuelForm={setVisuelForm}
          error={formError}
          onSubmit={handleSubmit}
          onClose={closeForm}
        />
      )}

      {/* DELETE CONFIRM */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="my-4 max-h-[calc(100vh-2rem)] w-full max-w-sm overflow-y-auto rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0a1f18] p-7" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-[#e8f5ef]">Supprimer ce kit ?</h2>
            <p className="mt-2 text-[13px] text-[#94a8a0]">
              <span className="font-medium text-[#e8f5ef]">{getDeleteTitle()}</span>{" "}
              sera définitivement supprimé et ne sera plus visible côté client.
            </p>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setConfirmDelete(null)} className="flex-1 rounded-[9px] border border-[rgba(255,255,255,0.08)] py-2.5 text-[13px] font-medium text-[#94a8a0] hover:text-[#e8f5ef]">
                Annuler
              </button>
              <button type="button" onClick={handleDelete} className="flex-1 rounded-[9px] bg-[#ef4444] py-2.5 text-[13px] font-semibold text-white hover:bg-[#dc2626]">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KIT DETAIL VIEWER */}
      {viewing && (
        <KitDetailModal
          card={viewing}
          onClose={() => setViewing(null)}
          onEdit={
            viewing.editKind
              ? () => {
                  const { editKind, rawId } = viewing;
                  setViewing(null);
                  openEdit(editKind!, rawId);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composants de présentation (grille / facettes — identiques au client)
// ─────────────────────────────────────────────────────────────────────────────

function FacetGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-brand-border-dark/60 py-4 last:border-0">
      <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted-on-dark/80">
        {title}
      </h4>
      <div>{children}</div>
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
    <label className="flex cursor-pointer items-center gap-2.5 py-1.5 text-[13.5px] text-brand-muted-on-dark transition-colors hover:text-brand-cream">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={onChange} />
      <span
        aria-hidden
        className={`grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border-[1.5px] transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand-accent/70 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-brand-dark ${
          checked ? "border-brand-accent bg-brand-accent text-brand-dark" : "border-brand-border-dark text-transparent"
        }`}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
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
  onEdit,
  onDelete,
}: {
  card: KitCard;
  onOpen: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const meta = TYPE_META[card.type];
  const shownAuds = card.audiences.filter((a) => a !== "tous");
  const editable = !!onEdit;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="group relative flex h-full cursor-pointer flex-col gap-3 overflow-hidden rounded-2xl border border-brand-border-dark bg-brand-surface p-[18px] text-left transition-all hover:-translate-y-0.5 hover:border-brand-accent/50 hover:shadow-[0_6px_24px_rgba(0,0,0,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60"
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10.5px] font-bold uppercase tracking-wide ${meta.badge}`}>
          <span aria-hidden>{meta.icon}</span>
          {meta.label}
        </span>
        {card.isNew && (
          <span className="rounded-md bg-brand-accent px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-brand-dark">
            Nouveau
          </span>
        )}
      </div>
      <h3 className="text-[15px] font-semibold leading-snug tracking-[-0.2px] text-brand-cream">{card.title}</h3>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        <span className="rounded-full border border-brand-border-dark/70 bg-brand-dark/50 px-2.5 py-1 text-[11px] text-brand-muted-on-dark">{card.theme}</span>
        {shownAuds.map((a) => (
          <span key={a} className="rounded-full border border-brand-border-dark/70 bg-brand-dark/50 px-2.5 py-1 text-[11px] text-brand-muted-on-dark/80">
            {AUD_META[a]}
          </span>
        ))}
        <span className="text-[11px] text-brand-muted-on-dark/70">{langFlag(card.lang)}</span>
        {card.month && (
          <span className="rounded-full border border-brand-border-dark/70 bg-brand-dark/50 px-2.5 py-1 text-[11px] text-brand-muted-on-dark/80">
            {monthName(card.month)}
          </span>
        )}
      </div>
      {editable ? (
        <div className="mt-1 flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onEdit}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[8px] border border-brand-border-dark bg-brand-dark/40 py-2 text-[12px] font-semibold text-brand-muted-on-dark transition-colors hover:border-brand-accent/40 hover:text-brand-accent"
          >
            <PencilIcon /> Éditer
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Supprimer"
            className="grid w-9 shrink-0 place-items-center rounded-[8px] border border-brand-border-dark bg-brand-dark/40 text-brand-muted-on-dark transition-colors hover:border-[#ef4444]/40 hover:text-[#ef4444]"
          >
            <TrashIcon />
          </button>
        </div>
      ) : (
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-brand-accent">
          Voir le contenu
          <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      )}
    </div>
  );
}

function EmptyState({ onReset, query }: { onReset: () => void; query: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-brand-border-dark bg-brand-surface/30 px-6 py-16 text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center text-brand-muted-on-dark/60">
        <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      </div>
      <p className="text-base font-medium text-brand-cream">
        {query.trim() ? `Aucun kit ne correspond à « ${query.trim()} »` : "Aucun kit ne correspond"}
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
// Calendrier des temps forts (trimestre → mois) — version CSM (édition/suppr.)
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
function cleanTitle(t: string): string {
  return t.replace(/^[^\p{L}\p{N}]+/u, "").trim();
}
function animOf(card: KitCard): AnimationItem | null {
  return card.payload.kind === "animation" ? card.payload.data : null;
}

function TempsFortCalendar({
  cards,
  currentMonth,
  onOpen,
  onEdit,
  onDelete,
}: {
  cards: KitCard[];
  currentMonth: number;
  onOpen: (c: KitCard) => void;
  onEdit: (c: KitCard) => void;
  onDelete: (c: KitCard) => void;
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

  const nextCardId = useMemo(() => {
    for (const m of quarter.months) {
      if (monthStatusOf(m, curIdx) !== "past") {
        const found = quarterCards.find((c) => c.month === allMonths.indexOf(m) + 1);
        if (found) return found.id;
      }
    }
    return null;
  }, [quarterCards, quarter, curIdx]);

  return (
    <section>
      <header className="mb-5">
        <h2 className="flex items-center gap-3 text-[22px] font-medium tracking-tight text-brand-cream">
          <span aria-hidden>📅</span>
          Temps forts du calendrier
        </h2>
        <p className="ml-1 mt-1.5 text-sm text-brand-muted-on-dark">
          Les communications mensuelles partagées avec les clients, trimestre par trimestre.
        </p>
      </header>

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
            nextCardId={nextCardId}
            onOpen={onOpen}
            onEdit={onEdit}
            onDelete={onDelete}
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
  nextCardId,
  onOpen,
  onEdit,
  onDelete,
}: {
  month: string;
  curIdx: number;
  cards: KitCard[];
  nextCardId: string | null;
  onOpen: (c: KitCard) => void;
  onEdit: (c: KitCard) => void;
  onDelete: (c: KitCard) => void;
}) {
  const status = monthStatusOf(month, curIdx);
  return (
    <div
      className={`rounded-[13px] border p-[18px] transition-colors ${
        status === "current"
          ? "border-brand-accent/15 bg-brand-accent/[0.04]"
          : "border-white/[0.04] bg-white/[0.012]"
      }`}
    >
      <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-[9px]">
          <h4 className={`text-[12px] font-bold uppercase tracking-[1.8px] ${status === "past" ? "text-brand-muted-on-dark/70" : "text-brand-cream"}`}>
            {monthLabel[month]}
          </h4>
          {status === "current" && (
            <span className="rounded-[4px] bg-brand-accent px-[7px] py-[3px] text-[9px] font-bold tracking-[0.5px] text-brand-dark">
              En cours
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
        <ul className="space-y-0">
          {cards.map((c) => (
            <CommEventRow
              key={c.id}
              card={c}
              curIdx={curIdx}
              isNext={c.id === nextCardId}
              onOpen={() => onOpen(c)}
              onEdit={() => onEdit(c)}
              onDelete={() => onDelete(c)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CommEventRow({
  card,
  curIdx,
  isNext,
  onOpen,
  onEdit,
  onDelete,
}: {
  card: KitCard;
  curIdx: number;
  isNext: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const a = animOf(card);
  const isDone =
    card.month !== null && monthStatusOf(allMonths[card.month - 1], curIdx) === "past";
  const isLetsTalk = a?.type === "Let's talk";
  return (
    <li className="relative">
      {isNext && (
        <span className="absolute -top-2 right-2.5 z-10 rounded-[4px] bg-brand-accent px-[7px] py-[3px] text-[9px] font-bold tracking-[0.5px] text-brand-dark">
          Prochain
        </span>
      )}
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
        className={`group mb-2.5 flex w-full cursor-pointer gap-2.5 rounded-[10px] border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60 ${
          isDone
            ? "border-transparent opacity-[0.5] hover:opacity-80"
            : isNext
              ? "border-brand-accent/20 bg-brand-accent/5"
              : "border-transparent hover:border-white/10 hover:bg-white/[0.04]"
        }`}
      >
        <div className="w-9 shrink-0 pt-0.5 text-center text-xl leading-none">
          {isLetsTalk ? "📺" : "🎵"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-1.5">
            <span
              className={`rounded-[4px] px-[7px] py-[3px] text-[9px] font-bold tracking-[0.5px] ${
                isLetsTalk ? "bg-brand-salmon/20 text-brand-salmon" : "bg-brand-accent/15 text-brand-accent"
              }`}
            >
              {isLetsTalk ? "LET'S TALK" : "PLAYLIST"}
            </span>
            {card.isNew && (
              <span className="rounded-[4px] bg-brand-accent px-[6px] py-[2px] text-[8.5px] font-bold uppercase tracking-[0.4px] text-brand-dark">
                Nouveau
              </span>
            )}
          </div>
          <div className={`mb-1 text-[13px] font-medium leading-snug ${isDone ? "text-brand-muted-on-dark/70 line-through" : "text-brand-cream"}`}>
            {cleanTitle(card.title)}
          </div>
          <div className="text-[10px] text-brand-muted-on-dark/70">{langFlag(card.lang)}</div>
        </div>
        <div className="flex shrink-0 flex-col gap-1 pl-1">
          <button
            type="button"
            title="Modifier"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="grid h-7 w-7 place-items-center rounded-[6px] border border-white/[0.05] text-brand-muted-on-dark transition-all hover:border-brand-accent/30 hover:text-brand-accent"
          >
            <PencilIcon />
          </button>
          <button
            type="button"
            title="Supprimer"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="grid h-7 w-7 place-items-center rounded-[6px] border border-white/[0.05] text-brand-muted-on-dark transition-all hover:border-[#ef4444]/30 hover:text-[#ef4444]"
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Slide-over form (repris de l'ancienne page CSM)
// ─────────────────────────────────────────────────────────────────────────────

function KitsFormSlideOver({
  kind,
  isNew,
  kitId,
  lancementForm,
  setLancementForm,
  animationForm,
  setAnimationForm,
  emailForm,
  setEmailForm,
  visuelForm,
  setVisuelForm,
  error,
  onSubmit,
  onClose,
}: {
  kind: EditingKind;
  isNew: boolean;
  kitId: string;
  lancementForm: LancementForm;
  setLancementForm: Dispatch<SetStateAction<LancementForm>>;
  animationForm: AnimationForm;
  setAnimationForm: Dispatch<SetStateAction<AnimationForm>>;
  emailForm: EmailForm;
  setEmailForm: Dispatch<SetStateAction<EmailForm>>;
  visuelForm: VisuelForm;
  setVisuelForm: Dispatch<SetStateAction<VisuelForm>>;
  error: string;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const [uploadError, setUploadError] = useState("");
  const handleKitUpload = async (
    file: File,
    field: "imagesFrText" | "imagesEnText" | "pdfFrText" | "pdfEnText",
  ) => {
    setUploadError("");
    const { path, error: err } = await uploadKitFile("animation", kitId, file);
    if (err || !path) {
      setUploadError(err ?? "Échec de l'envoi du fichier.");
      return;
    }
    setAnimationForm((f) => ({
      ...f,
      [field]: f[field] ? `${f[field]}\n${path}` : path,
    }));
  };
  const handleVisuelUpload = async (file: File) => {
    setUploadError("");
    const { path, error: err } = await uploadKitFile("visuels", kitId, file);
    if (err || !path) {
      setUploadError(err ?? "Échec de l'envoi du fichier.");
      return;
    }
    setVisuelForm((f) => ({ ...f, path, mimeType: file.type || "application/octet-stream" }));
  };
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const INPUT = "w-full rounded-[9px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] placeholder:text-[#6b7c75] focus:border-[rgba(94,234,212,0.4)] focus:outline-none [color-scheme:dark]";
  const TEXTAREA = `${INPUT} resize-none`;
  const LABEL = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[#94a8a0]";

  const titleLabel =
    kind === "lancement" ? "Kit de lancement"
    : kind === "animation" ? "Temps fort mensuel"
    : kind === "email" ? "Email thématique"
    : "Visuel teale";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="flex h-full w-full max-w-[560px] flex-col border-l border-[rgba(255,255,255,0.07)] bg-[#0b1e18]" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-[rgba(255,255,255,0.06)] px-6 py-4">
          <div>
            <h2 className="text-[16px] font-semibold text-[#e8f5ef]">
              {isNew ? `Nouveau — ${titleLabel}` : `Modifier — ${titleLabel}`}
            </h2>
            <p className="mt-0.5 text-[12px] text-[#94a8a0]">Visible immédiatement dans la vue client</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-[#94a8a0] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#e8f5ef]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M6 18 18 6" /></svg>
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {kind === "lancement" && (
            <>
              <div>
                <label className={LABEL}>Titre *</label>
                <input className={INPUT} value={lancementForm.title} onChange={(e) => setLancementForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ex: Email pré-onboarding - collaborateurs" />
              </div>
              <div>
                <label className={LABEL}>Étape *</label>
                <select className={`${INPUT} field-select`} value={lancementForm.step} onChange={(e) => setLancementForm((f) => ({ ...f, step: e.target.value as Step }))}>
                  <option value="before">Avant le lancement</option>
                  <option value="dday">Jour J</option>
                  <option value="after">Après le lancement</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Langue *</label>
                <select className={`${INPUT} field-select`} value={lancementForm.language} onChange={(e) => setLancementForm((f) => ({ ...f, language: e.target.value as EmailLanguage }))}>
                  <option value="FR">FR — Français</option>
                  <option value="EN">EN — English</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Contenu à copier par le client <span className="font-normal normal-case text-[#6b7c75]">— optionnel</span></label>
                <textarea className={TEXTAREA} rows={10} value={lancementForm.body} onChange={(e) => setLancementForm((f) => ({ ...f, body: e.target.value }))} placeholder="Texte de l'email tel qu'il sera proposé au client (sujet, corps, variables…). Laissé vide : le client voit le modèle auto-généré." />
              </div>
            </>
          )}

          {kind === "animation" && (
            <>
              <div>
                <label className={LABEL}>Titre *</label>
                <input className={INPUT} value={animationForm.title} onChange={(e) => setAnimationForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ex: Gérer son stress financier" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Mois *</label>
                  <select className={`${INPUT} field-select`} value={animationForm.month} onChange={(e) => setAnimationForm((f) => ({ ...f, month: e.target.value }))}>
                    {allMonths.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Type *</label>
                  <select className={`${INPUT} field-select`} value={animationForm.type} onChange={(e) => setAnimationForm((f) => ({ ...f, type: e.target.value }))}>
                    <option value="Playlist">Playlist</option>
                    <option value="Let's talk">Let&apos;s talk</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={LABEL}>Statut *</label>
                <select className={`${INPUT} field-select`} value={animationForm.status} onChange={(e) => setAnimationForm((f) => ({ ...f, status: e.target.value }))}>
                  <option value="Archive">Archive</option>
                  <option value="Current / En ce moment">Current / En ce moment</option>
                  <option value="Upcoming / À venir">Upcoming / À venir</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Langues *</label>
                <div className="flex gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#c1d4cc]">
                    <input type="checkbox" checked={animationForm.languageFR} onChange={(e) => setAnimationForm((f) => ({ ...f, languageFR: e.target.checked }))} className="h-4 w-4 cursor-pointer rounded accent-[#84d4a6]" />
                    🇫🇷 FR
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#c1d4cc]">
                    <input type="checkbox" checked={animationForm.languageEN} onChange={(e) => setAnimationForm((f) => ({ ...f, languageEN: e.target.checked }))} className="h-4 w-4 cursor-pointer rounded accent-[#84d4a6]" />
                    🇬🇧 EN
                  </label>
                </div>
              </div>
              <div>
                <label className={LABEL}>Lien landing <span className="font-normal normal-case text-[#6b7c75]">— optionnel</span></label>
                <input className={INPUT} type="url" value={animationForm.landing} onChange={(e) => setAnimationForm((f) => ({ ...f, landing: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <label className={LABEL}>Visuels FR <span className="font-normal normal-case text-[#6b7c75]">— uploadez les fichiers (chemin par ligne)</span></label>
                <textarea className={TEXTAREA} rows={3} value={animationForm.imagesFrText} onChange={(e) => setAnimationForm((f) => ({ ...f, imagesFrText: e.target.value }))} placeholder="Cliquez sur « Uploader un fichier » ci-dessous" />
                <label className="mt-1 inline-flex cursor-pointer items-center gap-1 text-[10px] font-semibold text-[#5eead4] hover:text-[#84d4a6]">
                  📤 Uploader un fichier
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { void handleKitUpload(f, "imagesFrText"); e.target.value = ""; } }} />
                </label>
              </div>
              <div>
                <label className={LABEL}>Visuels EN <span className="font-normal normal-case text-[#6b7c75]">— uploadez les fichiers (chemin par ligne)</span></label>
                <textarea className={TEXTAREA} rows={3} value={animationForm.imagesEnText} onChange={(e) => setAnimationForm((f) => ({ ...f, imagesEnText: e.target.value }))} placeholder="Cliquez sur « Uploader un fichier » ci-dessous" />
                <label className="mt-1 inline-flex cursor-pointer items-center gap-1 text-[10px] font-semibold text-[#5eead4] hover:text-[#84d4a6]">
                  📤 Uploader un fichier
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { void handleKitUpload(f, "imagesEnText"); e.target.value = ""; } }} />
                </label>
              </div>
              <div>
                <label className={LABEL}>PDF FR <span className="font-normal normal-case text-[#6b7c75]">— uploadez les fichiers (chemin par ligne)</span></label>
                <textarea className={TEXTAREA} rows={2} value={animationForm.pdfFrText} onChange={(e) => setAnimationForm((f) => ({ ...f, pdfFrText: e.target.value }))} placeholder="Cliquez sur « Uploader un fichier » ci-dessous" />
                <label className="mt-1 inline-flex cursor-pointer items-center gap-1 text-[10px] font-semibold text-[#5eead4] hover:text-[#84d4a6]">
                  📤 Uploader un fichier
                  <input type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { void handleKitUpload(f, "pdfFrText"); e.target.value = ""; } }} />
                </label>
              </div>
              <div>
                <label className={LABEL}>PDF EN <span className="font-normal normal-case text-[#6b7c75]">— uploadez les fichiers (chemin par ligne)</span></label>
                <textarea className={TEXTAREA} rows={2} value={animationForm.pdfEnText} onChange={(e) => setAnimationForm((f) => ({ ...f, pdfEnText: e.target.value }))} placeholder="Cliquez sur « Uploader un fichier » ci-dessous" />
                <label className="mt-1 inline-flex cursor-pointer items-center gap-1 text-[10px] font-semibold text-[#5eead4] hover:text-[#84d4a6]">
                  📤 Uploader un fichier
                  <input type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { void handleKitUpload(f, "pdfEnText"); e.target.value = ""; } }} />
                </label>
              </div>
              {uploadError && (
                <p className="rounded-[8px] bg-[rgba(239,68,68,0.1)] px-3 py-2 text-[11px] text-[#fca5a5]">{uploadError}</p>
              )}
              <div>
                <label className={LABEL}>Contenu à copier par le client <span className="font-normal normal-case text-[#6b7c75]">— optionnel</span></label>
                <textarea className={TEXTAREA} rows={8} value={animationForm.body} onChange={(e) => setAnimationForm((f) => ({ ...f, body: e.target.value }))} placeholder="Texte d'accompagnement (description, suggestions de post Slack/Teams, légende…) que le client pourra copier-coller depuis son espace." />
              </div>
            </>
          )}

          {kind === "email" && (
            <>
              <div>
                <label className={LABEL}>Titre *</label>
                <input className={INPUT} value={emailForm.title} onChange={(e) => setEmailForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ex: Les clés pour gérer son stress" />
              </div>
              <div>
                <label className={LABEL}>Thématique *</label>
                <select className={`${INPUT} field-select`} value={emailForm.topic} onChange={(e) => setEmailForm((f) => ({ ...f, topic: e.target.value }))}>
                  {EMAIL_TOPICS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL}>Langue *</label>
                <select className={`${INPUT} field-select`} value={emailForm.language} onChange={(e) => setEmailForm((f) => ({ ...f, language: e.target.value as EmailLanguage }))}>
                  <option value="FR">FR — Français</option>
                  <option value="EN">EN — English</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Contenu à copier par le client <span className="font-normal normal-case text-[#6b7c75]">— optionnel</span></label>
                <textarea className={TEXTAREA} rows={10} value={emailForm.body} onChange={(e) => setEmailForm((f) => ({ ...f, body: e.target.value }))} placeholder="Texte de l'email tel qu'il sera proposé au client. Laissé vide : le client voit le modèle auto-généré." />
              </div>
            </>
          )}

          {kind === "visuel" && (
            <>
              <div>
                <label className={LABEL}>Titre *</label>
                <input className={INPUT} value={visuelForm.title} onChange={(e) => setVisuelForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ex: Logo teale fond clair" />
              </div>
              <div>
                <label className={LABEL}>Catégorie *</label>
                <select className={`${INPUT} field-select`} value={visuelForm.category} onChange={(e) => setVisuelForm((f) => ({ ...f, category: e.target.value as VisuelCategory }))}>
                  {VISUEL_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL}>Fichier *</label>
                <label className="flex cursor-pointer items-center gap-2 rounded-[10px] border border-dashed border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-[12px] text-[#94a8a0] hover:border-[rgba(94,234,212,0.4)] hover:text-[#e8f5ef]">
                  📤 {visuelForm.path ? "Remplacer le fichier" : "Uploader un fichier"}
                  <input type="file" accept="image/*,.svg,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { void handleVisuelUpload(f); e.target.value = ""; } }} />
                </label>
                {visuelForm.path && (
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-[8px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-3 py-2 text-[12px] text-[#c1d4cc]">
                    <span className="min-w-0 flex-1 truncate">📎 {kitFileLabel(visuelForm.path)}</span>
                    <button type="button" onClick={() => void openKitFile(visuelForm.path, kitFileLabel(visuelForm.path) || visuelForm.title)} className="shrink-0 text-[11px] font-semibold text-[#5eead4] hover:text-[#84d4a6]">Aperçu</button>
                  </div>
                )}
              </div>
              {uploadError && (
                <p className="rounded-[8px] bg-[rgba(239,68,68,0.1)] px-3 py-2 text-[12px] font-medium text-[#fca5a5]">{uploadError}</p>
              )}
            </>
          )}

          {error && (
            <p className="rounded-[8px] bg-[rgba(239,68,68,0.1)] px-3 py-2 text-[12px] font-medium text-[#fca5a5]">{error}</p>
          )}
        </div>

        <div className="flex shrink-0 gap-3 border-t border-[rgba(255,255,255,0.06)] px-6 py-4">
          <button type="button" onClick={onClose} className="flex-1 rounded-[9px] border border-[rgba(255,255,255,0.08)] py-2.5 text-[13px] font-medium text-[#94a8a0] hover:text-[#e8f5ef]">
            Annuler
          </button>
          <button type="button" onClick={onSubmit} className="flex-1 rounded-[9px] bg-[#5eead4] py-2.5 text-[13px] font-semibold text-[#06140f] hover:bg-[#84d4a6]">
            {isNew ? "Créer" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Détail (lecture seule) — un corps par type
// ─────────────────────────────────────────────────────────────────────────────

function isAssetUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

function KitDetailModal({
  card,
  onClose,
  onEdit,
}: {
  card: KitCard;
  onClose: () => void;
  onEdit?: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const p = card.payload;
  let kindLabel = "";
  let title = "";
  let body: ReactNode = null;

  if (p.kind === "animation") {
    kindLabel = p.data.type === "Let's talk" ? "Let's Talk" : "Playlist";
    title = p.data.title;
    body = <AnimationDetailBody item={p.data} />;
  } else if (p.kind === "lancement") {
    kindLabel = "Kit de lancement";
    title = p.data.title;
    body = <LancementDetailBody item={p.data} />;
  } else if (p.kind === "email") {
    kindLabel = "Email — " + topicLabel(p.data.topic);
    title = p.data.title;
    body = <EmailDetailBody item={p.data} />;
  } else if (p.kind === "visuel") {
    kindLabel = "Visuel — " + (VISUEL_CATEGORIES.find((c) => c.id === p.data.category)?.label ?? p.data.category);
    title = p.data.title;
    body = <VisuelDetailBody item={p.data} />;
  } else {
    kindLabel = "Kit atelier";
    title = p.workshop.title;
    body = <WorkshopDetailBody workshop={p.workshop} />;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center sm:p-8" onClick={onClose}>
      <div className="w-full max-w-[680px] overflow-hidden rounded-2xl border border-[rgba(94,234,212,0.18)] bg-[#0a1f18] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-[rgba(255,255,255,0.06)] px-6 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[1.6px] text-[#84d4a6]">{kindLabel}</p>
            <h2 className="mt-1 text-[17px] font-semibold leading-snug text-[#e8f5ef]">{title}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onEdit && (
              <button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-[8px] border border-[rgba(94,234,212,0.3)] bg-[rgba(94,234,212,0.06)] px-3 py-1.5 text-[12px] font-semibold text-[#84d4a6] transition-colors hover:bg-[rgba(94,234,212,0.12)]">
                <PencilIcon /> Modifier
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Fermer" className="grid h-8 w-8 place-items-center rounded-[8px] bg-[rgba(255,255,255,0.05)] text-[16px] text-[#94a8a0] transition-colors hover:bg-[rgba(255,255,255,0.08)] hover:text-[#e8f5ef]">
              ×
            </button>
          </div>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{body}</div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-[rgba(255,255,255,0.04)] py-2.5 last:border-b-0">
      <span className="w-28 shrink-0 text-[10px] font-bold uppercase tracking-[1.2px] text-[#6b7c75]">{label}</span>
      <span className="min-w-0 flex-1 text-[13px] text-[#e8f5ef]">{value}</span>
    </div>
  );
}

function AssetList({ label, items, accent }: { label: string; items: string[]; accent: string }) {
  if (!items || items.length === 0) {
    return (
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[1.2px] text-[#6b7c75]">{label}</p>
        <p className="text-[12px] italic text-[#6b7c75]">— aucun fichier</p>
      </div>
    );
  }
  const images = items.filter((s) => isAssetUrl(s) && /\.(png|jpe?g|webp|gif)$/i.test(s));
  const links = items.filter((s) => isAssetUrl(s) && !/\.(png|jpe?g|webp|gif)$/i.test(s));
  const filenames = items.filter((s) => !isAssetUrl(s));

  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[1.2px]" style={{ color: accent }}>{label}</p>
      {images.length > 0 && (
        <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.map((src) => (
            <a key={src} href={src} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-[8px] border border-[rgba(255,255,255,0.06)] transition-all hover:border-[rgba(94,234,212,0.4)]">
              {/* eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, no Next image loader configured for this bucket */}
              <img src={src} alt="" loading="lazy" className="h-28 w-full object-cover" />
            </a>
          ))}
        </div>
      )}
      {links.length > 0 && (
        <ul className="mb-2 space-y-1">
          {links.map((href) => (
            <li key={href}>
              <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[12px] text-[#5eead4] hover:underline">
                📄 {href.split("/").pop()}
              </a>
            </li>
          ))}
        </ul>
      )}
      {filenames.length > 0 && (
        <ul className="space-y-1 text-[12px] text-[#94a8a0]">
          {filenames.map((fn) => (
            <li key={fn} className="flex items-center gap-1.5">
              <span aria-hidden>📎</span>
              <span className="truncate">{fn}</span>
              <span className="ml-1 rounded-full bg-[rgba(255,181,71,0.12)] px-1.5 py-0.5 text-[9px] font-semibold text-[#FFB547]">non uploadé</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BodyPreview({ body }: { body?: string }) {
  if (!body || !body.trim()) {
    return (
      <div className="rounded-[10px] border border-dashed border-[#1a3530] bg-[rgba(255,255,255,0.02)] p-4 text-[12px] italic leading-relaxed text-[#6b7c75]">
        Pas encore de contenu écrit. Côté client, un modèle auto-généré est affiché
        en attendant. Clique sur « Modifier » pour rédiger le texte que le client
        copiera-collera.
      </div>
    );
  }
  return (
    <div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-[10px] border border-[rgba(94,234,212,0.18)] bg-[rgba(94,234,212,0.04)] p-4 text-[13px] leading-relaxed text-[#e8f5ef]">
      {body}
    </div>
  );
}

function AnimationDetailBody({ item }: { item: AnimationItem }) {
  const monthLbl = monthLabel[item.month] ?? item.month ?? "—";
  return (
    <div className="space-y-5">
      <div>
        <DetailRow label="Mois" value={monthLbl} />
        <DetailRow label="Type" value={item.type || "—"} />
        <DetailRow label="Statut" value={item.status || "—"} />
        <DetailRow
          label="Langues"
          value={item.languages.length > 0 ? item.languages.map((l) => (l === "FR" ? "🇫🇷 FR" : "🇬🇧 EN")).join(" · ") : "—"}
        />
        {item.landing && (
          <DetailRow label="Landing" value={<a href={item.landing} target="_blank" rel="noopener noreferrer" className="text-[#5eead4] hover:underline">{item.landing} ↗</a>} />
        )}
      </div>
      <div className="border-t border-[rgba(255,255,255,0.06)] pt-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[1.2px] text-[#84d4a6]">Contenu à copier (client)</p>
        <BodyPreview body={item.body} />
      </div>
      <div className="space-y-4 border-t border-[rgba(255,255,255,0.06)] pt-4">
        <AssetList label="🇫🇷 Images FR" items={item.imagesFr} accent="#84d4a6" />
        <AssetList label="🇬🇧 Images EN" items={item.imagesEn} accent="#84d4a6" />
        <AssetList label="🇫🇷 PDF FR" items={item.pdfFr} accent="#94a8a0" />
        <AssetList label="🇬🇧 PDF EN" items={item.pdfEn} accent="#94a8a0" />
      </div>
    </div>
  );
}

function LancementDetailBody({ item }: { item: LancementKit }) {
  return (
    <div className="space-y-4">
      <div>
        <DetailRow label="Étape" value={stepLabels[item.step] ?? item.step} />
        <DetailRow label="Langue" value={item.language === "FR" ? "🇫🇷 Français" : "🇬🇧 English"} />
      </div>
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[1.2px] text-[#84d4a6]">Contenu à copier (client)</p>
        <BodyPreview body={item.body} />
      </div>
    </div>
  );
}

function EmailDetailBody({ item }: { item: EmailTopicKit }) {
  return (
    <div className="space-y-4">
      <div>
        <DetailRow label="Thématique" value={topicLabel(item.topic)} />
        <DetailRow label="Langue" value={item.language === "FR" ? "🇫🇷 Français" : "🇬🇧 English"} />
      </div>
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[1.2px] text-[#84d4a6]">Contenu à copier (client)</p>
        <BodyPreview body={item.body} />
      </div>
    </div>
  );
}

function VisuelDetailBody({ item }: { item: VisuelKit }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void getKitFileUrl(item.path).then((u) => { if (alive) setPreviewUrl(u); });
    return () => { alive = false; };
  }, [item.path]);
  const isImage = item.mimeType.startsWith("image/");
  return (
    <div className="space-y-4">
      <DetailRow label="Fichier" value={kitFileLabel(item.path) || item.path} />
      <div className="grid aspect-video w-full place-items-center overflow-hidden rounded-xl border border-[rgba(255,255,255,0.06)] bg-brand-dark/40">
        {isImage && previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt={item.title} className="max-h-full max-w-full object-contain p-4" />
        ) : (
          <span className="text-4xl opacity-60" aria-hidden>📄</span>
        )}
      </div>
      <div className="flex justify-end">
        <button type="button" onClick={() => void openKitFile(item.path, kitFileLabel(item.path) || item.title)} className="inline-flex items-center gap-1.5 rounded-full bg-[#5eead4] px-4 py-2 text-xs font-medium text-[#06140f] transition-colors hover:bg-[#84d4a6]">
          <DownloadIcon /> Télécharger
        </button>
      </div>
    </div>
  );
}

function WorkshopDetailBody({ workshop }: { workshop: Workshop }) {
  const [kitType, setKitType] = useState<WorkshopKitType>("invitation");
  const [language, setLanguage] = useState<"FR" | "EN">("FR");
  const [copied, setCopied] = useState(false);
  const body = defaultWorkshopKitTemplate(workshop, kitType, language);
  const files = workshop.communicationKit ?? [];
  const copy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(body).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    }
  };
  return (
    <div className="space-y-4">
      <p className="rounded-[10px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-3 py-2.5 text-[12px] text-[#94a8a0]">
        Atelier en lecture seule — gérez-le depuis le{" "}
        <a href="/csm/catalogue" className="text-[#84d4a6] underline hover:text-[#a8e895]">Catalogue d&apos;ateliers</a>.
      </p>
      <div className="flex flex-wrap gap-2">
        {(["invitation", "relance", "post"] as WorkshopKitType[]).map((kt) => (
          <button
            key={kt}
            type="button"
            onClick={() => { setKitType(kt); setCopied(false); }}
            aria-pressed={kitType === kt}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
              kitType === kt ? "border-[#84d4a6] bg-[rgba(94,234,212,0.12)] text-[#84d4a6]" : "border-[rgba(255,255,255,0.1)] text-[#c1d4cc] hover:bg-white/[0.04]"
            }`}
          >
            <span aria-hidden>{workshopKitIcons[kt]}</span>
            {workshopKitLabels[kt]}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {(["FR", "EN"] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => { setLanguage(l); setCopied(false); }}
            aria-pressed={language === l}
            className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
              language === l ? "border-[#84d4a6] bg-[rgba(94,234,212,0.12)] text-[#84d4a6]" : "border-[rgba(255,255,255,0.1)] text-[#c1d4cc] hover:bg-white/[0.04]"
            }`}
          >
            {l === "FR" ? "🇫🇷 Français" : "🇬🇧 English"}
          </button>
        ))}
      </div>
      <div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-[10px] border border-[rgba(94,234,212,0.18)] bg-[rgba(94,234,212,0.04)] p-4 text-[13px] leading-relaxed text-[#e8f5ef]">
        {body}
      </div>
      {files.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[1.2px] text-[#84d4a6]">Fichiers joints ({files.length})</p>
          <ul className="space-y-1.5">
            {files.map((f) => (
              <li key={f.id} className="flex items-center gap-3 rounded-lg border border-[rgba(255,255,255,0.06)] bg-brand-dark/30 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-[13px] text-[#e8f5ef]">{f.name}</span>
                <button type="button" onClick={() => void openKitFile(f.path, f.name)} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[rgba(94,234,212,0.4)] px-3 py-1 text-[11px] font-medium text-[#84d4a6] transition-colors hover:bg-[rgba(94,234,212,0.1)]">
                  <DownloadIcon /> Télécharger
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex justify-end">
        <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-full bg-[#5eead4] px-4 py-2 text-xs font-medium text-[#06140f] transition-colors hover:bg-[#84d4a6]">
          {copied ? "Copié" : "Copier le texte"}
        </button>
      </div>
    </div>
  );
}

function defaultWorkshopKitTemplate(w: Workshop, kit: WorkshopKitType, lang: "FR" | "EN"): string {
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

// ─── icons ────────────────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-brand-muted-on-dark" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 5h16M7 12h10M10 19h4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}
