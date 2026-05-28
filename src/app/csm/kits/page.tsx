"use client";

import { useEffect, useMemo, useState, useRef, type ReactNode } from "react";
import { useKitsStore, type LancementKit, type AnimationItem, type EmailTopicKit } from "@/lib/kits-store";
import { uploadKitFile } from "@/lib/storage";
import { useWorkshops, themes as workshopThemes, type Workshop } from "@/lib/workshops-store";

// ─── constants ───────────────────────────────────────────────────────────────

const TODAY_MONTH = "May";

const allMonths = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const _currentIdx = allMonths.indexOf(TODAY_MONTH);

const monthLabel: Record<string, string> = {
  January: "Janvier", February: "Février", March: "Mars", April: "Avril",
  May: "Mai", June: "Juin", July: "Juillet", August: "Août",
  September: "Septembre", October: "Octobre", November: "Novembre", December: "Décembre",
};

const stepLabels: Record<string, string> = {
  before: "Avant le lancement",
  dday: "Jour J",
  after: "Après le lancement",
};

const stepOrder = ["before", "dday", "after"];

type Step = "before" | "dday" | "after";
type EmailLanguage = "FR" | "EN";

type CommQuarterId = "Q1" | "Q2" | "Q3" | "Q4";
type CommQuarter = { id: CommQuarterId; months: string[] };

const commQuarters: CommQuarter[] = [
  { id: "Q1", months: ["January", "February", "March"] },
  { id: "Q2", months: ["April", "May", "June"] },
  { id: "Q3", months: ["July", "August", "September"] },
  { id: "Q4", months: ["October", "November", "December"] },
];

const DEFAULT_QUARTER_ID: CommQuarterId = (() => {
  const idx = allMonths.indexOf(TODAY_MONTH);
  if (idx <= 2) return "Q1";
  if (idx <= 5) return "Q2";
  if (idx <= 8) return "Q3";
  return "Q4";
})();

type MonthStatus = "past" | "current" | "upcoming";

function monthStatus(month: string): MonthStatus {
  const idx = allMonths.indexOf(month);
  if (idx < _currentIdx) return "past";
  if (idx === _currentIdx) return "current";
  return "upcoming";
}

function quarterStatus(q: CommQuarter): "past" | "current" | "upcoming" {
  if (monthStatus(q.months[q.months.length - 1]) === "past") return "past";
  if (monthStatus(q.months[0]) === "upcoming") return "upcoming";
  return "current";
}

function commQuarterProgress(q: CommQuarter): number {
  const qs = quarterStatus(q);
  if (qs === "past") return 100;
  if (qs === "upcoming") return 0;
  const todayIdx = allMonths.indexOf(TODAY_MONTH);
  const startIdx = allMonths.indexOf(q.months[0]);
  return Math.round((todayIdx - startIdx) * 33 + 15);
}

function cleanTitle(title: string): string {
  return title.replace(/^[^\p{L}\p{N}]+/u, "").trim();
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

const workshopThemeNameById = Object.fromEntries(
  workshopThemes.map((t) => [t.id, t.name])
);

// ─── tab types ────────────────────────────────────────────────────────────────

type ThemeId = "lancement" | "animation" | "emails" | "kits-ateliers";

// ─── form types ───────────────────────────────────────────────────────────────

type EditingKind = "lancement" | "animation" | "email";

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

const EMPTY_LANCEMENT: LancementForm = {
  title: "", step: "before", language: "FR", body: "",
};

const EMPTY_ANIMATION: AnimationForm = {
  title: "", month: "January", type: "Playlist", status: "Upcoming / À venir",
  landing: "", languageFR: true, languageEN: false,
  imagesFrText: "", imagesEnText: "", pdfFrText: "", pdfEnText: "", body: "",
};

const EMPTY_EMAIL: EmailForm = {
  title: "", topic: "ABILITY TO COPE", language: "FR", body: "",
};

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

export default function CsmKitsPage() {
  const {
    lancementKits, animationItems, emailTopicKits,
    addLancementKit, updateLancementKit, deleteLancementKit,
    addAnimationItem, updateAnimationItem, deleteAnimationItem,
    addEmailTopicKit, updateEmailTopicKit, deleteEmailTopicKit,
  } = useKitsStore();
  const { workshops } = useWorkshops();

  const [search, setSearch] = useState("");
  const [activeTheme, setActiveTheme] = useState<ThemeId>("animation");
  const [activeLanguage, setActiveLanguage] = useState<"FR" | "EN">("FR");

  // slide-over form
  const [editingKind, setEditingKind] = useState<EditingKind | null>(null);
  // Pre-generated id for a kit being created — so uploads can target a stable
  // path before the kit is actually saved.
  const [kitDraftId, setKitDraftId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [lancementForm, setLancementForm] = useState<LancementForm>(EMPTY_LANCEMENT);
  const [animationForm, setAnimationForm] = useState<AnimationForm>(EMPTY_ANIMATION);
  const [emailForm, setEmailForm] = useState<EmailForm>(EMPTY_EMAIL);
  const [formError, setFormError] = useState("");

  // delete confirm
  const [confirmDelete, setConfirmDelete] = useState<{ kind: EditingKind; id: string } | null>(null);

  // detail viewer — opened by clicking a kit card, read-only
  const [viewingKit, setViewingKit] = useState<{ kind: EditingKind; id: string } | null>(null);
  const openView = (kind: EditingKind, id: string) => setViewingKit({ kind, id });
  const closeView = () => setViewingKit(null);

  const lower = search.trim().toLowerCase();

  const themes = useMemo(() => [
    { id: "animation" as ThemeId, name: "Temps forts mensuels", icon: "📅", count: animationItems.length },
    { id: "kits-ateliers" as ThemeId, name: "Kits par atelier", icon: "🎓", count: workshops.length },
    { id: "emails" as ThemeId, name: "Emails par thématique", icon: "💌", count: emailTopicKits.length },
    { id: "lancement" as ThemeId, name: "Kit de lancement", icon: "🚀", count: lancementKits.length },
  ], [animationItems.length, workshops.length, emailTopicKits.length, lancementKits.length]);

  const filteredLancement = useMemo(
    () => lancementKits.filter((k) =>
      (!lower || k.title.toLowerCase().includes(lower) || stepLabels[k.step].toLowerCase().includes(lower)) &&
      activeTheme === "lancement" && k.language === activeLanguage
    ),
    [lower, activeTheme, activeLanguage, lancementKits]
  );

  const filteredAnimation = useMemo(
    () => animationItems.filter((a) =>
      (!lower || a.title.toLowerCase().includes(lower) || a.month.toLowerCase().includes(lower) || a.type.toLowerCase().includes(lower)) &&
      activeTheme === "animation" && a.languages.includes(activeLanguage)
    ),
    [lower, activeTheme, activeLanguage, animationItems]
  );

  const filteredEmails = useMemo(
    () => emailTopicKits.filter((e) =>
      (!lower || e.title.toLowerCase().includes(lower) || topicLabel(e.topic).toLowerCase().includes(lower)) &&
      activeTheme === "emails" && e.language === activeLanguage
    ),
    [lower, activeTheme, activeLanguage, emailTopicKits]
  );

  const filteredWorkshops = useMemo(
    () => activeTheme !== "kits-ateliers" ? [] : workshops.filter((w) =>
      !lower || w.title.toLowerCase().includes(lower) ||
      (workshopThemeNameById[w.themeId]?.toLowerCase().includes(lower) ?? false)
    ),
    [lower, activeTheme, workshops]
  );

  const totalVisible =
    filteredLancement.length + filteredAnimation.length +
    filteredEmails.length + filteredWorkshops.length;

  const hasActiveFilters = !!lower || activeTheme !== "animation" || activeLanguage !== "FR";

  const resetFilters = () => {
    setSearch("");
    setActiveTheme("animation");
    setActiveLanguage("FR");
  };

  const totalKits = animationItems.length + emailTopicKits.length + lancementKits.length + workshops.length;
  const newInMay = animationItems.filter((a) => a.month === TODAY_MONTH).length;

  // open form helpers
  function openNew(kind: EditingKind) {
    setEditingKind(kind);
    setEditingId("new");
    setFormError("");
    const prefix = kind === "lancement" ? "lan" : kind === "animation" ? "ani" : "email";
    setKitDraftId(`${prefix}-${Date.now().toString(36)}`);
    if (kind === "lancement") setLancementForm(EMPTY_LANCEMENT);
    if (kind === "animation") setAnimationForm(EMPTY_ANIMATION);
    if (kind === "email") setEmailForm(EMPTY_EMAIL);
  }

  function openEdit(kind: EditingKind, id: string) {
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
      const item = formToAnimation(
        animationForm,
        editingId === "new" ? kitDraftId ?? undefined : editingId!,
      );
      if (editingId === "new") addAnimationItem(item); else updateAnimationItem(item);
    } else if (editingKind === "email") {
      if (!emailForm.title.trim()) { setFormError("Le titre est obligatoire."); return; }
      const item = formToEmail(emailForm, editingId === "new" ? undefined : editingId!);
      if (editingId === "new") addEmailTopicKit(item); else updateEmailTopicKit(item);
    }
    closeForm();
  }

  function handleDelete() {
    if (!confirmDelete) return;
    const { kind, id } = confirmDelete;
    if (kind === "lancement") deleteLancementKit(id);
    else if (kind === "animation") deleteAnimationItem(id);
    else if (kind === "email") deleteEmailTopicKit(id);
    setConfirmDelete(null);
  }

  function getDeleteTitle(): string {
    if (!confirmDelete) return "";
    const { kind, id } = confirmDelete;
    if (kind === "lancement") return lancementKits.find((k) => k.id === id)?.title ?? "";
    if (kind === "animation") return animationItems.find((a) => a.id === id)?.title ?? "";
    if (kind === "email") return emailTopicKits.find((e) => e.id === id)?.title ?? "";
    return "";
  }

  return (
    <div className="px-9 py-8">
      <div className="mx-auto max-w-[1280px]">

        {/* HEADER */}
        <header className="mb-9 grid items-end gap-10 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[2.5px] text-[#84d4a6]">
              Espace CSM
            </p>
            <h1 className="mt-3 text-[28px] font-semibold tracking-[-0.5px] text-brand-cream">
              Kits de communication
            </h1>
            <p className="text-[13px] leading-relaxed text-[#94a8a0]">
              Gérez la bibliothèque de kits de communication partagée avec les clients. Chaque modification est visible immédiatement côté client.
            </p>
          </div>
          <div className="flex gap-3">
            <StatPill value={totalKits} label="Kits disponibles" accent />
            <StatPill value={newInMay} label="Nouveaux en mai" />
          </div>
        </header>

        {/* SEARCH + FILTERS */}
        <div className="rounded-3xl border border-brand-border-dark bg-brand-surface p-5 sm:p-6">
          <div className="flex items-center gap-3 rounded-full bg-brand-dark px-5 py-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-muted-on-dark" aria-hidden>
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
              <button type="button" onClick={() => setSearch("")} aria-label="Effacer la recherche" className="grid h-6 w-6 place-items-center rounded-full text-brand-muted-on-dark hover:text-brand-cream">×</button>
            )}
          </div>
          <div className="mt-4 space-y-3">
            <FilterLine label="Vue">
              {themes.map((t) => (
                <PillFilter key={t.id} selected={activeTheme === t.id} onClick={() => setActiveTheme(t.id)} count={t.count} purple>
                  <span className="mr-1.5">{t.icon}</span>{t.name}
                </PillFilter>
              ))}
            </FilterLine>
            <FilterLine label="Langue">
              <PillFilter selected={activeLanguage === "FR"} onClick={() => setActiveLanguage("FR")} purple>🇫🇷 Français</PillFilter>
              <PillFilter selected={activeLanguage === "EN"} onClick={() => setActiveLanguage("EN")} purple>🇬🇧 English</PillFilter>
            </FilterLine>
          </div>
        </div>

        {/* COUNT LINE */}
        <div className="mt-5 mb-6 flex items-center justify-between gap-3 text-[13px] text-brand-muted-on-dark">
          <span>
            {totalVisible === 0 ? "Aucun résultat" : `${totalVisible} kit${totalVisible > 1 ? "s" : ""} affiché${totalVisible > 1 ? "s" : ""}`}
          </span>
          {hasActiveFilters && (
            <button type="button" onClick={resetFilters} className="text-[#84d4a6] transition-colors hover:underline">
              Réinitialiser les filtres
            </button>
          )}
        </div>

        {/* CONTENT */}
        {activeTheme === "kits-ateliers" && totalVisible === 0 ? (
          <EmptyState onReset={resetFilters} query={search} />
        ) : (
          <div className="space-y-12">
            {activeTheme === "animation" && filteredAnimation.length > 0 && (
              <AdminAnimationSection
                items={filteredAnimation}
                onAdd={() => openNew("animation")}
                onEdit={(id) => openEdit("animation", id)}
                onDelete={(id) => setConfirmDelete({ kind: "animation", id })}
                onOpenDetail={(id) => openView("animation", id)}
              />
            )}
            {activeTheme === "animation" && filteredAnimation.length === 0 && (
              <div className="flex items-center justify-between">
                <EmptyState onReset={resetFilters} query={search} />
                <button type="button" onClick={() => openNew("animation")} className="ml-4 flex shrink-0 items-center gap-2 rounded-[10px] bg-[#5eead4] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#84d4a6]">
                  <PlusIcon /> Ajouter
                </button>
              </div>
            )}
            {activeTheme === "kits-ateliers" && (
              <AdminWorkshopKitsSection workshops={filteredWorkshops} />
            )}
            {activeTheme === "emails" && filteredEmails.length > 0 && (
              <AdminEmailsSection
                items={filteredEmails}
                onAdd={() => openNew("email")}
                onEdit={(id) => openEdit("email", id)}
                onDelete={(id) => setConfirmDelete({ kind: "email", id })}
                onOpenDetail={(id) => openView("email", id)}
              />
            )}
            {activeTheme === "emails" && filteredEmails.length === 0 && (
              <div className="flex items-center justify-between">
                <EmptyState onReset={resetFilters} query={search} />
                <button type="button" onClick={() => openNew("email")} className="ml-4 flex shrink-0 items-center gap-2 rounded-[10px] bg-[#5eead4] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#84d4a6]">
                  <PlusIcon /> Ajouter
                </button>
              </div>
            )}
            {activeTheme === "lancement" && filteredLancement.length > 0 && (
              <AdminLancementSection
                items={filteredLancement}
                onAdd={() => openNew("lancement")}
                onEdit={(id) => openEdit("lancement", id)}
                onDelete={(id) => setConfirmDelete({ kind: "lancement", id })}
                onOpenDetail={(id) => openView("lancement", id)}
              />
            )}
            {activeTheme === "lancement" && filteredLancement.length === 0 && (
              <div className="flex items-center justify-between">
                <EmptyState onReset={resetFilters} query={search} />
                <button type="button" onClick={() => openNew("lancement")} className="ml-4 flex shrink-0 items-center gap-2 rounded-[10px] bg-[#5eead4] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#84d4a6]">
                  <PlusIcon /> Ajouter
                </button>
              </div>
            )}
          </div>
        )}
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
          error={formError}
          onSubmit={handleSubmit}
          onClose={closeForm}
        />
      )}

      {/* DELETE CONFIRM */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0a1f18] p-7" onClick={(e) => e.stopPropagation()}>
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
      {viewingKit && (
        <KitDetailModal
          viewing={viewingKit}
          lancementKits={lancementKits}
          animationItems={animationItems}
          emailTopicKits={emailTopicKits}
          onClose={closeView}
          onEdit={() => {
            const { kind, id } = viewingKit;
            closeView();
            openEdit(kind, id);
          }}
        />
      )}
    </div>
  );
}

// ─── section components ───────────────────────────────────────────────────────

function AdminAnimationSection({
  items,
  onAdd,
  onEdit,
  onDelete,
  onOpenDetail,
}: {
  items: AnimationItem[];
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenDetail: (id: string) => void;
}) {
  const [activeQId, setActiveQId] = useState<CommQuarterId>(DEFAULT_QUARTER_ID);
  const quarter = commQuarters.find((q) => q.id === activeQId)!;
  const quarterItems = items.filter((i) => quarter.months.includes(i.month));
  const upcomingCount = quarterItems.filter((i) => monthStatus(i.month) !== "past").length;

  const nextItem = useMemo<AnimationItem | null>(() => {
    for (const month of quarter.months) {
      if (monthStatus(month) !== "past") {
        const found = items.find((i) => i.month === month);
        if (found) return found;
      }
    }
    return null;
  }, [items, quarter]);

  return (
    <section>
      <div className="mb-5 flex items-start justify-between gap-4">
        <header>
          <h2 className="flex items-center gap-3 text-2xl font-medium tracking-tight text-brand-cream">
            <span aria-hidden>📅</span>
            Calendrier annuel
          </h2>
          <p className="mt-1.5 ml-1 text-sm text-brand-muted-on-dark">
            Gérez les temps forts mensuels visibles par les clients.
          </p>
        </header>
        <button type="button" onClick={onAdd} className="flex shrink-0 items-center gap-2 rounded-[10px] bg-[#5eead4] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#84d4a6]">
          <PlusIcon /> Ajouter
        </button>
      </div>

      <div className="mb-7 grid grid-cols-4 gap-[10px]">
        {commQuarters.map((q) => (
          <QuarterTabComm key={q.id} quarter={q} isActive={q.id === activeQId} onClick={() => setActiveQId(q.id)} />
        ))}
      </div>

      <div className="mb-[18px] flex items-baseline justify-between">
        <div className="text-[14px] font-semibold tracking-[0.3px] text-[#e8f5ef]">
          Communications du trimestre <span className="text-[#84d4a6]">·</span>{" "}
          <span className="font-medium text-[#94a8a0]">{activeQId} 2026</span>
        </div>
        <div className="text-[11px] uppercase tracking-[0.5px] text-[#6b7c75]">
          {quarterItems.length} kit{quarterItems.length > 1 ? "s" : ""} · {upcomingCount} à venir
        </div>
      </div>

      <div className="grid grid-cols-3 gap-[14px]">
        {quarter.months.map((month) => (
          <AdminMonthColumnComm
            key={month}
            month={month}
            items={items.filter((i) => i.month === month)}
            nextItem={nextItem}
            onEdit={onEdit}
            onDelete={onDelete}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>
    </section>
  );
}

function AdminMonthColumnComm({
  month,
  items,
  nextItem,
  onEdit,
  onDelete,
  onOpenDetail,
}: {
  month: string;
  items: AnimationItem[];
  nextItem: AnimationItem | null;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenDetail: (id: string) => void;
}) {
  const status = monthStatus(month);
  const doneCount = items.filter((i) => monthStatus(i.month) === "past").length;
  const upcomingCount = items.length - doneCount;

  return (
    <div className={`rounded-[13px] border p-[18px] transition-colors ${status === "current" ? "border-[rgba(94,234,212,0.15)] bg-[rgba(94,234,212,0.035)]" : "border-white/[0.04] bg-white/[0.012]"}`}>
      <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-[9px]">
          <h4 className={`text-[12px] font-bold uppercase tracking-[1.8px] ${status === "past" ? "text-[#6b7c75]" : "text-[#e8f5ef]"}`}>
            {monthLabel[month]}
          </h4>
          {status === "current" && (
            <span className="rounded-[4px] bg-[#84d4a6] px-[7px] py-[3px] text-[9px] font-bold tracking-[0.5px] text-white">
              En cours
            </span>
          )}
        </div>
        <span className="text-[10px] tracking-[0.5px] text-[#6b7c75]">
          {items.length === 0 ? "—" : doneCount > 0 && upcomingCount === 0 ? `${doneCount} fait${doneCount > 1 ? "s" : ""}` : upcomingCount > 0 ? `${upcomingCount} à venir` : "—"}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="py-5 text-center text-[11px] italic text-[#6b7c75]">Pas de communication programmée.</p>
      ) : (
        <ul className="space-y-0">
          {items.map((item) => (
            <AdminCommEventRow
              key={item.id}
              item={item}
              isNext={item === nextItem}
              onEdit={() => onEdit(item.id)}
              onDelete={() => onDelete(item.id)}
              onOpenDetail={() => onOpenDetail(item.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function AdminCommEventRow({
  item,
  isNext,
  onEdit,
  onDelete,
  onOpenDetail,
}: {
  item: AnimationItem;
  isNext: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onOpenDetail: () => void;
}) {
  const isDone = monthStatus(item.month) === "past";
  const isLetsTalk = item.type === "Let's talk";

  return (
    <li className="relative">
      {isNext && (
        <span className="absolute -top-2 right-2.5 z-10 rounded-[4px] bg-[#84d4a6] px-[7px] py-[3px] text-[9px] font-bold tracking-[0.5px] text-white">
          Prochain
        </span>
      )}
      <div
        role="button"
        tabIndex={0}
        onClick={onOpenDetail}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenDetail(); } }}
        className={`group mb-2.5 flex w-full cursor-pointer gap-2.5 rounded-[10px] border p-3 text-left transition-all ${isDone ? "border-transparent opacity-[0.38] hover:opacity-50" : isNext ? "border-[rgba(94,234,212,0.18)] bg-[rgba(94,234,212,0.05)] hover:border-[rgba(94,234,212,0.35)]" : "border-transparent hover:border-white/10 hover:bg-white/[0.04]"}`}
      >
        <div className="w-9 shrink-0 pt-0.5 text-center text-xl leading-none">
          {isLetsTalk ? "📺" : "🎵"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className={`rounded-[4px] px-[7px] py-[3px] text-[9px] font-bold tracking-[0.5px] ${isLetsTalk ? "bg-[rgba(244,168,154,0.2)] text-[#f4a89a]" : "bg-[rgba(94,234,212,0.15)] text-[#84d4a6]"}`}>
              {isLetsTalk ? "LET'S TALK" : "PLAYLIST"}
            </span>
            <span className={`ml-auto flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full text-[9px] ${isDone ? "bg-[rgba(94,234,212,0.2)] text-[#84d4a6]" : "border-[1.5px] border-white/15"}`} aria-hidden>
              {isDone ? "✓" : ""}
            </span>
          </div>
          <div className={`mb-1 text-[13px] font-medium leading-snug ${isDone ? "text-[#6b7c75] line-through" : "text-[#e8f5ef]"}`}>
            {cleanTitle(item.title)}
          </div>
          <div className="text-[10px] text-[#6b7c75]">
            {item.languages.map((l) => (l === "FR" ? "🇫🇷" : "🇬🇧")).join(" ")}
            {item.languages.length === 2 && " · FR / EN"}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-1 pl-1">
          <button type="button" title="Modifier" onClick={(e) => { e.stopPropagation(); onEdit(); }} className="grid h-7 w-7 place-items-center rounded-[6px] border border-[rgba(255,255,255,0.05)] text-[#94a8a0] transition-all hover:border-[rgba(94,234,212,0.3)] hover:text-[#84d4a6]">
            <PencilIcon />
          </button>
          <button type="button" title="Supprimer" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="grid h-7 w-7 place-items-center rounded-[6px] border border-[rgba(255,255,255,0.05)] text-[#94a8a0] transition-all hover:border-[rgba(239,68,68,0.3)] hover:text-[#ef4444]">
            <TrashIcon />
          </button>
        </div>
      </div>
    </li>
  );
}

function AdminLancementSection({
  items,
  onAdd,
  onEdit,
  onDelete,
  onOpenDetail,
}: {
  items: LancementKit[];
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenDetail: (id: string) => void;
}) {
  const grouped: Record<string, LancementKit[]> = {};
  for (const k of items) {
    (grouped[k.step] ||= []).push(k);
  }

  return (
    <section>
      <div className="mb-5 flex items-start justify-between gap-4">
        <header>
          <h2 className="flex items-center gap-2 text-xl font-medium text-brand-cream">
            <span aria-hidden>🚀</span> Lancement
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-brand-muted-on-dark">
            Tous les contenus pour réussir l&apos;annonce et l&apos;activation de teale.
          </p>
        </header>
        <button type="button" onClick={onAdd} className="flex shrink-0 items-center gap-2 rounded-[10px] bg-[#5eead4] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#84d4a6]">
          <PlusIcon /> Ajouter
        </button>
      </div>
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
                  <AdminTextKitCard
                    key={k.id}
                    title={k.title}
                    chip={k.language}
                    chipStyle="bg-brand-cream/10 text-brand-cream"
                    onEdit={() => onEdit(k.id)}
                    onDelete={() => onDelete(k.id)}
                    onOpenDetail={() => onOpenDetail(k.id)}
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

function AdminEmailsSection({
  items,
  onAdd,
  onEdit,
  onDelete,
  onOpenDetail,
}: {
  items: EmailTopicKit[];
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenDetail: (id: string) => void;
}) {
  const grouped: Record<string, EmailTopicKit[]> = {};
  for (const k of items) {
    (grouped[k.topic] ||= []).push(k);
  }

  return (
    <section>
      <div className="mb-5 flex items-start justify-between gap-4">
        <header>
          <h2 className="flex items-center gap-2 text-xl font-medium text-brand-cream">
            <span aria-hidden>💌</span> Emails par thématique
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-brand-muted-on-dark">
            Modèles d&apos;emails classés par thématique de santé mentale.
          </p>
        </header>
        <button type="button" onClick={onAdd} className="flex shrink-0 items-center gap-2 rounded-[10px] bg-[#5eead4] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#84d4a6]">
          <PlusIcon /> Ajouter
        </button>
      </div>
      <div className="space-y-6">
        {Object.entries(grouped).map(([topic, topicItems]) => (
          <div key={topic}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-muted-on-dark">
              {topicLabel(topic)}
            </h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {topicItems.map((k) => (
                <AdminTextKitCard
                  key={k.id}
                  title={k.title}
                  chip={k.language}
                  chipStyle="bg-brand-cream/10 text-brand-cream"
                  onEdit={() => onEdit(k.id)}
                  onDelete={() => onDelete(k.id)}
                  onOpenDetail={() => onOpenDetail(k.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AdminWorkshopKitsSection({ workshops: items }: { workshops: Workshop[] }) {
  const grouped: Record<string, Workshop[]> = {};
  for (const w of items) {
    (grouped[w.themeId] ||= []).push(w);
  }

  return (
    <section>
      <div className="mb-5">
        <h2 className="flex items-center gap-2 text-xl font-medium text-brand-cream">
          <span aria-hidden>🎓</span> Kits par atelier collectif
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-brand-muted-on-dark">
          Vue en lecture seule — gérez les ateliers depuis le{" "}
          <a href="/csm/catalogue" className="text-[#84d4a6] underline hover:text-[#a8e895]">
            Catalogue d&apos;ateliers
          </a>.
        </p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-brand-border-dark bg-brand-surface/30 px-6 py-12 text-center text-sm text-brand-muted-on-dark">
          Aucun atelier ne correspond à ces filtres.
        </p>
      ) : (
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
                    <div key={w.id} className="flex items-center gap-4 rounded-xl border border-brand-border-dark bg-brand-surface p-4">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-medium leading-snug text-brand-cream">{w.title}</h4>
                        {w.subtitle && (
                          <p className="mt-0.5 text-[11px] uppercase tracking-wider text-brand-muted-on-dark">{w.subtitle}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-[11px] text-brand-muted-on-dark">⏱ {w.duration}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ─── admin text kit card ──────────────────────────────────────────────────────

function AdminTextKitCard({
  title,
  chip,
  chipStyle,
  onEdit,
  onDelete,
  onOpenDetail,
}: {
  title: string;
  chip: string;
  chipStyle: string;
  onEdit: () => void;
  onDelete: () => void;
  onOpenDetail: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpenDetail}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenDetail(); } }}
      className="group relative flex h-full cursor-pointer flex-col justify-between rounded-xl border border-transparent bg-brand-surface p-4 text-left transition-colors hover:border-[rgba(94,234,212,0.3)] hover:bg-[rgba(94,234,212,0.04)]"
    >
      <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button type="button" title="Modifier" onClick={(e) => { e.stopPropagation(); onEdit(); }} className="grid h-7 w-7 place-items-center rounded-[6px] border border-[rgba(255,255,255,0.07)] bg-brand-dark text-[#94a8a0] transition-all hover:border-[rgba(94,234,212,0.4)] hover:text-[#84d4a6]">
          <PencilIcon />
        </button>
        <button type="button" title="Supprimer" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="grid h-7 w-7 place-items-center rounded-[6px] border border-[rgba(255,255,255,0.07)] bg-brand-dark text-[#94a8a0] transition-all hover:border-[rgba(239,68,68,0.3)] hover:text-[#ef4444]">
          <TrashIcon />
        </button>
      </div>
      <div className="pr-14">
        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${chipStyle}`}>
          {chip}
        </span>
        <h4 className="mt-2 text-sm font-medium leading-snug text-brand-cream">{title}</h4>
      </div>
      <span className="mt-3 inline-flex items-center gap-1 text-xs text-[#84d4a6]">
        Voir le contenu →
      </span>
    </div>
  );
}

// ─── quarter tab (purple accents) ─────────────────────────────────────────────

function QuarterTabComm({
  quarter,
  isActive,
  onClick,
}: {
  quarter: CommQuarter;
  isActive: boolean;
  onClick: () => void;
}) {
  const status = quarterStatus(quarter);
  const progress = commQuarterProgress(quarter);
  const monthAbbrs = quarter.months.map((m) => (monthLabel[m] ?? m).slice(0, 3)).join(" · ");

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[11px] border p-[14px_16px] text-left transition-all ${
        status === "past"
          ? "border-transparent opacity-50 hover:opacity-80"
          : isActive
            ? "border-[rgba(94,234,212,0.3)] bg-[rgba(94,234,212,0.07)] shadow-[0_0_0_1px_rgba(94,234,212,0.15),0_8px_28px_-10px_rgba(94,234,212,0.5)]"
            : "border-transparent hover:bg-white/[0.03]"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className={`text-[11px] font-bold tracking-[1px] ${isActive ? "text-[#84d4a6]" : "text-[#94a8a0]"}`}>
          {quarter.id}
        </span>
        <span className={`text-[9px] uppercase tracking-[0.5px] ${isActive ? "rounded-[4px] bg-[#84d4a6] px-[7px] py-[3px] font-bold text-white" : "text-[#6b7c75]"}`}>
          {status === "past" ? "Passé" : status === "current" ? "Maintenant" : "À venir"}
        </span>
      </div>
      <div className="mb-[10px] text-[10px] tracking-[0.3px] text-[#6b7c75]">{monthAbbrs}</div>
      <div className="h-[3px] overflow-hidden rounded-[2px] bg-white/[0.05]">
        <div
          className={`h-full rounded-[2px] ${status === "past" ? "bg-[rgba(148,168,160,0.4)]" : "bg-gradient-to-r from-[#5eead4] to-[#84d4a6]"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </button>
  );
}

// ─── form slide-over ──────────────────────────────────────────────────────────

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
  error,
  onSubmit,
  onClose,
}: {
  kind: EditingKind;
  isNew: boolean;
  kitId: string;
  lancementForm: LancementForm;
  setLancementForm: React.Dispatch<React.SetStateAction<LancementForm>>;
  animationForm: AnimationForm;
  setAnimationForm: React.Dispatch<React.SetStateAction<AnimationForm>>;
  emailForm: EmailForm;
  setEmailForm: React.Dispatch<React.SetStateAction<EmailForm>>;
  error: string;
  onSubmit: () => void;
  onClose: () => void;
}) {
  // Upload helper for the animation form file lists. Appends the stored path
  // to the matching textarea (one path per line — the form parses lines).
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

  const titleLabel = kind === "lancement" ? "Kit de lancement" : kind === "animation" ? "Temps fort mensuel" : "Email thématique";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="flex h-full w-full max-w-[560px] flex-col border-l border-[rgba(255,255,255,0.07)] bg-[#0b1e18]" onClick={(e) => e.stopPropagation()}>
        {/* header */}
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

        {/* body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

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
                <label className={LABEL}>Contenu à copier par le client <span className="text-[#6b7c75] normal-case font-normal">— optionnel</span></label>
                <textarea
                  className={TEXTAREA}
                  rows={10}
                  value={lancementForm.body}
                  onChange={(e) => setLancementForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder="Texte de l'email tel qu'il sera proposé au client (sujet, corps, variables…). Laissé vide : le client voit le modèle auto-généré."
                />
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
                <label className={LABEL}>Lien landing <span className="text-[#6b7c75] normal-case font-normal">— optionnel</span></label>
                <input className={INPUT} type="url" value={animationForm.landing} onChange={(e) => setAnimationForm((f) => ({ ...f, landing: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <label className={LABEL}>Visuels FR <span className="text-[#6b7c75] normal-case font-normal">— uploadez les fichiers (chemin par ligne)</span></label>
                <textarea className={TEXTAREA} rows={3} value={animationForm.imagesFrText} onChange={(e) => setAnimationForm((f) => ({ ...f, imagesFrText: e.target.value }))} placeholder="Cliquez sur « Uploader un fichier » ci-dessous" />
                <label className="mt-1 inline-flex cursor-pointer items-center gap-1 text-[10px] font-semibold text-[#5eead4] hover:text-[#84d4a6]">
                  📤 Uploader un fichier
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { void handleKitUpload(f, "imagesFrText"); e.target.value = ""; } }} />
                </label>
              </div>
              <div>
                <label className={LABEL}>Visuels EN <span className="text-[#6b7c75] normal-case font-normal">— uploadez les fichiers (chemin par ligne)</span></label>
                <textarea className={TEXTAREA} rows={3} value={animationForm.imagesEnText} onChange={(e) => setAnimationForm((f) => ({ ...f, imagesEnText: e.target.value }))} placeholder="Cliquez sur « Uploader un fichier » ci-dessous" />
                <label className="mt-1 inline-flex cursor-pointer items-center gap-1 text-[10px] font-semibold text-[#5eead4] hover:text-[#84d4a6]">
                  📤 Uploader un fichier
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { void handleKitUpload(f, "imagesEnText"); e.target.value = ""; } }} />
                </label>
              </div>
              <div>
                <label className={LABEL}>PDF FR <span className="text-[#6b7c75] normal-case font-normal">— uploadez les fichiers (chemin par ligne)</span></label>
                <textarea className={TEXTAREA} rows={2} value={animationForm.pdfFrText} onChange={(e) => setAnimationForm((f) => ({ ...f, pdfFrText: e.target.value }))} placeholder="Cliquez sur « Uploader un fichier » ci-dessous" />
                <label className="mt-1 inline-flex cursor-pointer items-center gap-1 text-[10px] font-semibold text-[#5eead4] hover:text-[#84d4a6]">
                  📤 Uploader un fichier
                  <input type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { void handleKitUpload(f, "pdfFrText"); e.target.value = ""; } }} />
                </label>
              </div>
              <div>
                <label className={LABEL}>PDF EN <span className="text-[#6b7c75] normal-case font-normal">— uploadez les fichiers (chemin par ligne)</span></label>
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
                <label className={LABEL}>Contenu à copier par le client <span className="text-[#6b7c75] normal-case font-normal">— optionnel</span></label>
                <textarea
                  className={TEXTAREA}
                  rows={8}
                  value={animationForm.body}
                  onChange={(e) => setAnimationForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder="Texte d'accompagnement (description, suggestions de post Slack/Teams, légende…) que le client pourra copier-coller depuis son espace."
                />
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
                <label className={LABEL}>Contenu à copier par le client <span className="text-[#6b7c75] normal-case font-normal">— optionnel</span></label>
                <textarea
                  className={TEXTAREA}
                  rows={10}
                  value={emailForm.body}
                  onChange={(e) => setEmailForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder="Texte de l'email tel qu'il sera proposé au client. Laissé vide : le client voit le modèle auto-généré."
                />
              </div>
            </>
          )}

          {error && (
            <p className="rounded-[8px] bg-[rgba(239,68,68,0.1)] px-3 py-2 text-[12px] font-medium text-[#fca5a5]">
              {error}
            </p>
          )}
        </div>

        {/* footer */}
        <div className="shrink-0 border-t border-[rgba(255,255,255,0.06)] px-6 py-4 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-[9px] border border-[rgba(255,255,255,0.08)] py-2.5 text-[13px] font-medium text-[#94a8a0] hover:text-[#e8f5ef]">
            Annuler
          </button>
          <button type="button" onClick={onSubmit} className="flex-1 rounded-[9px] bg-[#5eead4] py-2.5 text-[13px] font-semibold text-white hover:bg-[#84d4a6]">
            {isNew ? "Créer" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── shared components ────────────────────────────────────────────────────────

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
      <div className={`text-3xl font-medium leading-none ${accent ? "text-[#84d4a6]" : "text-brand-cream"}`}>
        {value}
      </div>
      <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-brand-muted-on-dark">
        {label}
      </div>
    </div>
  );
}

function FilterLine({ label, children }: { label: string; children: ReactNode }) {
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
  purple,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  count?: number;
  purple?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] transition-colors ${
        selected
          ? purple
            ? "border-[rgba(94,234,212,0.5)] bg-[rgba(94,234,212,0.15)] text-[#84d4a6]"
            : "border-brand-green-bright/50 bg-brand-green-bright/15 text-brand-green-bright"
          : "border-brand-border-dark text-brand-cream hover:bg-brand-surface"
      }`}
    >
      {children}
      {count !== undefined && (
        <span className={`rounded-full px-1.5 py-0.5 text-[11px] ${selected ? (purple ? "bg-[rgba(94,234,212,0.25)] text-[#84d4a6]" : "bg-brand-green-bright/25 text-brand-green-bright") : "bg-white/5 text-brand-muted-on-dark"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function EmptyState({ onReset, query }: { onReset: () => void; query: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-brand-border-dark bg-brand-surface/30 px-6 py-16 text-center">
      <p className="text-base font-medium text-brand-cream">
        {query.trim() ? `Aucun kit ne correspond à « ${query.trim()} »` : "Aucun kit pour ces filtres"}
      </p>
      <p className="mt-2 text-sm text-brand-muted-on-dark">
        Essayez d&apos;élargir votre recherche ou de changer de thématique.
      </p>
      <button type="button" onClick={onReset} className="mt-5 rounded-full border border-[rgba(94,234,212,0.5)] px-4 py-1.5 text-xs font-medium text-[#84d4a6] transition-colors hover:bg-[rgba(94,234,212,0.1)]">
        Réinitialiser
      </button>
    </div>
  );
}

// ─── icons ────────────────────────────────────────────────────────────────────

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
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}

// ─── kit detail modal (read-only viewer) ──────────────────────────────────────

function isAssetUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

function KitDetailModal({
  viewing,
  lancementKits,
  animationItems,
  emailTopicKits,
  onClose,
  onEdit,
}: {
  viewing: { kind: EditingKind; id: string };
  lancementKits: LancementKit[];
  animationItems: AnimationItem[];
  emailTopicKits: EmailTopicKit[];
  onClose: () => void;
  onEdit: () => void;
}) {
  let kindLabel = "";
  let title = "";
  let body: React.ReactNode = null;

  if (viewing.kind === "animation") {
    const item = animationItems.find((a) => a.id === viewing.id);
    if (!item) return null;
    kindLabel = item.type === "Let's talk" ? "Let's Talk" : "Playlist";
    title = item.title;
    body = <AnimationDetailBody item={item} />;
  } else if (viewing.kind === "lancement") {
    const item = lancementKits.find((k) => k.id === viewing.id);
    if (!item) return null;
    kindLabel = "Kit de lancement";
    title = item.title;
    body = <LancementDetailBody item={item} />;
  } else if (viewing.kind === "email") {
    const item = emailTopicKits.find((e) => e.id === viewing.id);
    if (!item) return null;
    kindLabel = "Email — " + topicLabel(item.topic);
    title = item.title;
    body = <EmailDetailBody item={item} />;
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center sm:p-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[680px] overflow-hidden rounded-2xl border border-[rgba(94,234,212,0.18)] bg-[#0a1f18] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[rgba(255,255,255,0.06)] px-6 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[1.6px] text-[#84d4a6]">{kindLabel}</p>
            <h2 className="mt-1 text-[17px] font-semibold leading-snug text-[#e8f5ef]">{title}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 rounded-[8px] border border-[rgba(94,234,212,0.3)] bg-[rgba(94,234,212,0.06)] px-3 py-1.5 text-[12px] font-semibold text-[#84d4a6] transition-colors hover:bg-[rgba(94,234,212,0.12)]"
            >
              <PencilIcon /> Modifier
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="grid h-8 w-8 place-items-center rounded-[8px] bg-[rgba(255,255,255,0.05)] text-[16px] text-[#94a8a0] transition-colors hover:bg-[rgba(255,255,255,0.08)] hover:text-[#e8f5ef]"
            >
              ×
            </button>
          </div>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{body}</div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
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
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[1.2px]" style={{ color: accent }}>
        {label}
      </p>
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
        Pas encore de contenu écrit. Côté client, un modèle auto-généré est
        affiché en attendant. Clique sur « Modifier » pour rédiger le texte
        que le client copiera-collera.
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
          value={item.languages.length > 0
            ? item.languages.map((l) => (l === "FR" ? "🇫🇷 FR" : "🇬🇧 EN")).join(" · ")
            : "—"}
        />
        {item.landing && (
          <DetailRow
            label="Landing"
            value={<a href={item.landing} target="_blank" rel="noopener noreferrer" className="text-[#5eead4] hover:underline">{item.landing} ↗</a>}
          />
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
