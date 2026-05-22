"use client";

import { useEffect, useMemo, useState, useRef, type ReactNode } from "react";
import { themes, type Workshop } from "@/app/(client)/catalogue-ateliers/data";
import { useWorkshops } from "@/lib/workshops-store";

// ─── helpers ────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function workshopHaystack(w: Workshop): string {
  return [w.title, w.subtitle ?? "", ...w.objectives, ...w.targetAudience].join(" ").toLowerCase();
}

const themeTagClass: Record<string, string> = {
  prevention:     "bg-[rgba(251,146,60,0.15)] text-[#fdba74]",
  stress:         "bg-[rgba(94,234,212,0.15)] text-[#5eead4]",
  epanouissement: "bg-[rgba(132,204,22,0.15)] text-[#bef264]",
  relations:      "bg-[rgba(125,211,252,0.15)] text-[#7dd3fc]",
  resilience:     "bg-[rgba(148,163,184,0.15)] text-[#cbd5e1]",
};
const themeEmojiBoxClass: Record<string, string> = {
  prevention:     "bg-[rgba(251,146,60,0.12)]",
  stress:         "bg-[rgba(94,234,212,0.1)]",
  epanouissement: "bg-[rgba(132,204,22,0.12)]",
  relations:      "bg-[rgba(125,211,252,0.12)]",
  resilience:     "bg-[rgba(148,163,184,0.12)]",
};
const themeTagLabel: Record<string, string> = {
  prevention:     "PRÉVENTION",
  stress:         "STRESS & ÉMOTIONS",
  epanouissement: "ÉPANOUISSEMENT",
  relations:      "RELATIONS",
  resilience:     "RÉSILIENCE",
};
const themeDisplayLabel: Record<string, string> = {
  prevention:     "Prévention",
  stress:         "Stress & émotions",
  epanouissement: "Épanouissement",
  relations:      "Relations",
  resilience:     "Résilience",
};
const themeEmoji: Record<string, string> = {
  prevention:     "🛡️",
  stress:         "🧘",
  epanouissement: "🌱",
  relations:      "🤝",
  resilience:     "🌳",
};

function pickEmoji(w: Workshop): string {
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

// ─── types ───────────────────────────────────────────────────────────────────

interface FormState {
  title: string;
  subtitle: string;
  themeId: string;
  alreadyAnimated: boolean;
  objectivesText: string;    // one per line
  targetAudienceText: string; // one per line
  programme: { title: string; itemsText: string }[];
}

const EMPTY_FORM: FormState = {
  title: "",
  subtitle: "",
  themeId: "prevention",
  alreadyAnimated: false,
  objectivesText: "",
  targetAudienceText: "",
  programme: [{ title: "", itemsText: "" }],
};

function workshopToForm(w: Workshop): FormState {
  return {
    title: w.title,
    subtitle: w.subtitle ?? "",
    themeId: w.themeId,
    alreadyAnimated: w.alreadyAnimated ?? false,
    objectivesText: w.objectives.join("\n"),
    targetAudienceText: w.targetAudience.join("\n"),
    programme: w.programme.map((s) => ({
      title: s.title,
      itemsText: s.items?.join("\n") ?? "",
    })),
  };
}

function formToWorkshop(form: FormState, existingId?: string): Workshop {
  const title = form.title.trim();
  return {
    id: existingId ?? slugify(title) + "-" + Date.now().toString(36),
    title,
    subtitle: form.subtitle.trim() || undefined,
    themeId: form.themeId,
    alreadyAnimated: form.alreadyAnimated || undefined,
    objectives: form.objectivesText.split("\n").map((s) => s.trim()).filter(Boolean),
    targetAudience: form.targetAudienceText.split("\n").map((s) => s.trim()).filter(Boolean),
    programme: form.programme
      .filter((s) => s.title.trim())
      .map((s) => ({
        title: s.title.trim(),
        items: s.itemsText.split("\n").map((x) => x.trim()).filter(Boolean).length > 0
          ? s.itemsText.split("\n").map((x) => x.trim()).filter(Boolean)
          : undefined,
      })),
  };
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function CsmCataloguePage() {
  const { workshops, addWorkshop, updateWorkshop, deleteWorkshop } = useWorkshops();

  const [search, setSearch] = useState("");
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);

  // modal state
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  // delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // detail preview
  const [previewId, setPreviewId] = useState<string | null>(null);

  const totalWorkshops = workshops.length;

  const filtered = useMemo(() => {
    return workshops.filter((w) => {
      if (activeThemeId && w.themeId !== activeThemeId) return false;
      if (search.trim() && !workshopHaystack(w).includes(search.toLowerCase())) return false;
      return true;
    });
  }, [workshops, search, activeThemeId]);

  const noFilters = !search.trim() && !activeThemeId;
  const previewWorkshop = previewId ? workshops.find((w) => w.id === previewId) ?? null : null;

  function openNew() {
    setForm(EMPTY_FORM);
    setFormError("");
    setEditingId("new");
  }

  function openEdit(w: Workshop) {
    setForm(workshopToForm(w));
    setFormError("");
    setEditingId(w.id);
  }

  function closeModal() {
    setEditingId(null);
    setFormError("");
  }

  function handleSubmit() {
    if (!form.title.trim()) { setFormError("Le titre est obligatoire."); return; }
    if (!form.objectivesText.trim()) { setFormError("Au moins un objectif est requis."); return; }
    if (form.programme.every((s) => !s.title.trim())) { setFormError("Au moins une étape du programme est requise."); return; }
    if (!form.targetAudienceText.trim()) { setFormError("Au moins une cible est requise."); return; }

    if (editingId === "new") {
      addWorkshop(formToWorkshop(form));
    } else if (editingId) {
      updateWorkshop(formToWorkshop(form, editingId));
    }
    closeModal();
  }

  function handleDelete(id: string) {
    deleteWorkshop(id);
    setConfirmDeleteId(null);
  }

  return (
    <div className="px-9 py-8">
      <div className="mx-auto max-w-[1280px]">

        {/* HEADER */}
        <div className="mb-[22px] flex items-start justify-between gap-6">
          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[2.5px] text-[#84d4a6]">
              Espace CSM
            </p>
            <h1 className="text-[28px] font-semibold tracking-[-0.4px] text-brand-cream">
              Catalogue d&apos;ateliers
            </h1>
            <p className="mt-1.5 max-w-[560px] text-[13px] leading-relaxed text-[#94a8a0]">
              Gérez le catalogue partagé avec les clients. Chaque modification est visible immédiatement côté vue client.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <StatBox value={totalWorkshops} label="Ateliers" />
            <button
              type="button"
              onClick={openNew}
              className="ml-2 flex items-center gap-2 rounded-[10px] bg-[#5eead4] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#84d4a6]"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
              Nouvel atelier
            </button>
          </div>
        </div>

        {/* SEARCH */}
        <div className="mb-4 flex items-center gap-3 rounded-[14px] border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-[14px_16px]">
          <div className="relative flex flex-1 items-center">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-[14px] text-[#6b7c75]" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un atelier, un thème, un mot-clé..."
              className="w-full rounded-[10px] border border-[rgba(255,255,255,0.05)] bg-black/25 py-[11px] pl-[38px] pr-[14px] text-[13px] text-[#e8f5ef] placeholder:text-[#6b7c75] focus:border-[rgba(94,234,212,0.4)] focus:outline-none"
            />
          </div>
          <span className="text-[11px] text-[#94a8a0]">
            {filtered.length} atelier{filtered.length !== 1 ? "s" : ""}
            {!noFilters && " (filtrés)"}
          </span>
        </div>

        {/* FILTER ROW: THÈME */}
        <div className="flex flex-wrap items-center gap-2 px-0.5 py-1">
          <span className="min-w-[60px] text-[10px] font-bold uppercase tracking-[1.5px] text-[#6b7c75]">THÈME</span>
          <Chip active={activeThemeId === null} onClick={() => setActiveThemeId(null)} count={totalWorkshops}>Tous</Chip>
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

        {/* GRID */}
        <div className="mt-5">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)] px-6 py-16 text-center">
              <p className="text-base font-medium text-[#e8f5ef]">
                {search.trim() ? `Aucun atelier pour « ${search.trim()} »` : "Aucun atelier pour ces filtres"}
              </p>
              <button
                type="button"
                onClick={() => { setSearch(""); setActiveThemeId(null); }}
                className="mt-5 rounded-full border border-[rgba(94,234,212,0.4)] px-4 py-1.5 text-xs font-medium text-[#84d4a6] transition-colors hover:bg-[rgba(94,234,212,0.1)]"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filtered.map((w) => (
                <AdminCard
                  key={w.id}
                  workshop={w}
                  onEdit={() => openEdit(w)}
                  onDelete={() => setConfirmDeleteId(w.id)}
                  onPreview={() => setPreviewId(w.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {editingId !== null && (
        <WorkshopFormModal
          form={form}
          setForm={setForm}
          error={formError}
          isNew={editingId === "new"}
          onSubmit={handleSubmit}
          onClose={closeModal}
        />
      )}

      {/* PREVIEW MODAL */}
      {previewWorkshop && (
        <PreviewModal workshop={previewWorkshop} onClose={() => setPreviewId(null)} />
      )}

      {/* DELETE CONFIRM */}
      {confirmDeleteId && (() => {
        const w = workshops.find((x) => x.id === confirmDeleteId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)}>
            <div className="w-full max-w-sm rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0a1f18] p-7" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-base font-semibold text-[#e8f5ef]">Supprimer l&apos;atelier ?</h2>
              <p className="mt-2 text-[13px] text-[#94a8a0]">
                <span className="font-medium text-[#e8f5ef]">{w?.title}</span> sera définitivement supprimé du catalogue et de la vue client.
              </p>
              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => setConfirmDeleteId(null)} className="flex-1 rounded-[9px] border border-[rgba(255,255,255,0.08)] py-2.5 text-[13px] font-medium text-[#94a8a0] hover:text-[#e8f5ef]">
                  Annuler
                </button>
                <button type="button" onClick={() => handleDelete(confirmDeleteId)} className="flex-1 rounded-[9px] bg-[#ef4444] py-2.5 text-[13px] font-semibold text-white hover:bg-[#dc2626]">
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── admin card ──────────────────────────────────────────────────────────────

function AdminCard({
  workshop,
  onEdit,
  onDelete,
  onPreview,
}: {
  workshop: Workshop;
  onEdit: () => void;
  onDelete: () => void;
  onPreview: () => void;
}) {
  const emoji = pickEmoji(workshop);
  const emojiBoxClass = themeEmojiBoxClass[workshop.themeId] ?? "bg-[rgba(255,255,255,0.04)]";
  const tagClass = themeTagClass[workshop.themeId] ?? "bg-[rgba(255,255,255,0.05)] text-[#94a8a0]";
  const tagLabel = themeTagLabel[workshop.themeId] ?? workshop.themeId.toUpperCase();

  return (
    <div className="flex flex-col rounded-[13px] border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-[14px] transition-all hover:border-[rgba(94,234,212,0.25)] hover:bg-[rgba(255,255,255,0.035)]">
      {/* top */}
      <div className="mb-2.5 flex items-start justify-between">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-[22px] ${emojiBoxClass}`} aria-hidden>
          {emoji}
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            title="Aperçu"
            onClick={onPreview}
            className="grid h-7 w-7 place-items-center rounded-[7px] border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.03)] text-[#94a8a0] transition-all hover:border-[rgba(94,234,212,0.25)] hover:text-[#5eead4]"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
          <button
            type="button"
            title="Modifier"
            onClick={onEdit}
            className="grid h-8 w-8 place-items-center rounded-[7px] border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.03)] text-[#94a8a0] transition-all hover:border-[rgba(94,234,212,0.3)] hover:text-[#84d4a6]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button
            type="button"
            title="Supprimer"
            onClick={onDelete}
            className="grid h-7 w-7 place-items-center rounded-[7px] border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.03)] text-[#94a8a0] transition-all hover:border-[rgba(239,68,68,0.3)] hover:text-[#ef4444]"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* tags */}
      <div className="mb-2 flex flex-wrap gap-[5px]">
        <span className={`rounded-[4px] px-[7px] py-[3px] text-[9px] font-bold tracking-[0.5px] ${tagClass}`}>{tagLabel}</span>
        {workshop.subtitle && (
          <span className="rounded-[4px] bg-[rgba(96,165,250,0.15)] px-[7px] py-[3px] text-[9px] font-bold tracking-[0.5px] text-[#93c5fd]">
            {workshop.subtitle.toUpperCase()}
          </span>
        )}
      </div>

      {/* title */}
      <div className="mb-[6px] line-clamp-2 min-h-[36px] text-[13px] font-semibold leading-[1.35] text-[#e8f5ef]">
        {workshop.title}
      </div>

      {/* first objective */}
      <div className="mb-3 line-clamp-2 flex-1 text-[11px] leading-[1.45] text-[#94a8a0]">
        {workshop.objectives[0]}
      </div>

      {/* footer */}
      <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.04)] pt-2.5 text-[11px] text-[#6b7c75]">
        <span className="text-[11px] text-[#6b7c75]">{workshop.programme.length} étape{workshop.programme.length !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}

// ─── add / edit form modal ───────────────────────────────────────────────────

function WorkshopFormModal({
  form,
  setForm,
  error,
  isNew,
  onSubmit,
  onClose,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  error: string;
  isNew: boolean;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setStep(idx: number, key: "title" | "itemsText", value: string) {
    setForm((f) => {
      const steps = f.programme.map((s, i) => i === idx ? { ...s, [key]: value } : s);
      return { ...f, programme: steps };
    });
  }

  function addStep() {
    setForm((f) => ({ ...f, programme: [...f.programme, { title: "", itemsText: "" }] }));
  }

  function removeStep(idx: number) {
    setForm((f) => ({ ...f, programme: f.programme.filter((_, i) => i !== idx) }));
  }

  const INPUT = "w-full rounded-[9px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] placeholder:text-[#6b7c75] focus:border-[rgba(94,234,212,0.4)] focus:outline-none";
  const TEXTAREA = `${INPUT} resize-none`;
  const LABEL = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[#94a8a0]";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-[560px] flex-col border-l border-[rgba(255,255,255,0.07)] bg-[#0b1e18]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[rgba(255,255,255,0.06)] px-6 py-4">
          <div>
            <h2 className="text-[16px] font-semibold text-[#e8f5ef]">
              {isNew ? "Nouvel atelier" : "Modifier l'atelier"}
            </h2>
            <p className="mt-0.5 text-[12px] text-[#94a8a0]">
              Visible immédiatement dans la vue client
            </p>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-[#94a8a0] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#e8f5ef]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M6 18 18 6" />
            </svg>
          </button>
        </div>

        {/* body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Title + Subtitle */}
          <div className="grid grid-cols-[1fr_1fr] gap-3">
            <div className="col-span-2">
              <label className={LABEL}>Titre *</label>
              <input className={INPUT} value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="Ex: Comprendre la résilience" />
            </div>
            <div className="col-span-2">
              <label className={LABEL}>Sous-titre <span className="text-[#6b7c75] normal-case font-normal">— optionnel</span></label>
              <input className={INPUT} value={form.subtitle} onChange={(e) => setField("subtitle", e.target.value)} placeholder="Ex: Parentalité, Sommeil…" />
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className={LABEL}>Thème *</label>
            <select
              className={`${INPUT} [color-scheme:dark]`}
              value={form.themeId}
              onChange={(e) => setField("themeId", e.target.value)}
            >
              {themes.map((t) => (
                <option key={t.id} value={t.id}>{themeDisplayLabel[t.id] ?? t.name}</option>
              ))}
            </select>
          </div>

          {/* Objectives */}
          <div>
            <label className={LABEL}>Objectifs * <span className="text-[#6b7c75] normal-case font-normal">— un par ligne</span></label>
            <textarea
              className={TEXTAREA}
              rows={3}
              value={form.objectivesText}
              onChange={(e) => setField("objectivesText", e.target.value)}
              placeholder={"Comprendre les mécanismes du stress\nSavoir utiliser des techniques de régulation"}
            />
          </div>

          {/* Programme */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className={LABEL}>Programme * <span className="text-[#6b7c75] normal-case font-normal">— étapes</span></label>
              <button type="button" onClick={addStep} className="flex items-center gap-1 text-[11px] font-semibold text-[#84d4a6] hover:text-[#a8e895]">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14"/></svg>
                Ajouter une étape
              </button>
            </div>
            <div className="space-y-3">
              {form.programme.map((step, idx) => (
                <div key={idx} className="rounded-[9px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(94,234,212,0.15)] text-[9px] font-bold text-[#84d4a6]">{idx + 1}</span>
                    <input
                      className={`${INPUT} flex-1 py-2 text-[13px]`}
                      value={step.title}
                      onChange={(e) => setStep(idx, "title", e.target.value)}
                      placeholder="Titre de l'étape"
                    />
                    {form.programme.length > 1 && (
                      <button type="button" onClick={() => removeStep(idx)} className="shrink-0 text-[#6b7c75] hover:text-[#ef4444]">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M18 6 6 18M6 6l12 12"/></svg>
                      </button>
                    )}
                  </div>
                  <textarea
                    className={`${TEXTAREA} text-[12px]`}
                    rows={2}
                    value={step.itemsText}
                    onChange={(e) => setStep(idx, "itemsText", e.target.value)}
                    placeholder={"Sous-points optionnels\nun par ligne"}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Target audience */}
          <div>
            <label className={LABEL}>Public cible * <span className="text-[#6b7c75] normal-case font-normal">— un par ligne</span></label>
            <textarea
              className={TEXTAREA}
              rows={3}
              value={form.targetAudienceText}
              onChange={(e) => setField("targetAudienceText", e.target.value)}
              placeholder={"Les données teale montrent un score de stress élevé.\nVous souhaitez donner des outils concrets à vos collaborateurs."}
            />
          </div>

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
            {isNew ? "Créer l'atelier" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── preview modal (read-only) ────────────────────────────────────────────────

function PreviewModal({ workshop, onClose }: { workshop: Workshop; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const tagClass = themeTagClass[workshop.themeId] ?? "bg-[rgba(255,255,255,0.05)] text-[#94a8a0]";
  const tagLabel = themeTagLabel[workshop.themeId] ?? workshop.themeId.toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-6 backdrop-blur-sm sm:p-10" onClick={onClose} role="dialog" aria-modal="true">
      <div className="relative w-full max-w-2xl rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0a1f18] p-7 sm:p-8" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label="Fermer" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-[#94a8a0] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[#e8f5ef]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M6 18 18 6" /></svg>
        </button>

        <div className="flex flex-wrap items-center gap-2 pr-12">
          <span className={`rounded-[4px] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tagClass}`}>{tagLabel}</span>
          {workshop.subtitle && <span className="text-[10px] uppercase tracking-wider text-[#94a8a0]">· {workshop.subtitle}</span>}
        </div>

        <h2 className="mt-3 text-2xl font-medium tracking-tight text-[#e8f5ef]">{workshop.title}</h2>

        <div className="mt-6 space-y-6">
          <ModalBlock title="Objectifs">
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#e8f5ef]">
              {workshop.objectives.map((o, i) => <li key={i}>{o}</li>)}
            </ul>
          </ModalBlock>
          <ModalBlock title="Programme">
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
          </ModalBlock>
          <ModalBlock title="Pour qui ?">
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#94a8a0]">
              {workshop.targetAudience.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </ModalBlock>
        </div>
      </div>
    </div>
  );
}

// ─── shared sub-components ────────────────────────────────────────────────────

function StatBox({ value, label, color }: { value: number; label: string; color?: "green" | "amber" }) {
  return (
    <div className="min-w-[90px] rounded-[11px] border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.025)] px-[16px] py-3">
      <div className={`text-[22px] font-bold tabular-nums leading-none ${color === "green" ? "text-[#5eead4]" : color === "amber" ? "text-[#fdba74]" : "text-[#e8f5ef]"}`}>
        {value}
      </div>
      <div className="mt-[5px] text-[10px] uppercase tracking-[1px] text-[#94a8a0]">{label}</div>
    </div>
  );
}

function Chip({ active, onClick, count, children }: { active: boolean; onClick: () => void; count?: number; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-[8px] border px-3 py-[7px] text-[12px] font-medium transition-all ${
        active
          ? "border-[rgba(94,234,212,0.35)] bg-[rgba(94,234,212,0.12)] text-[#84d4a6]"
          : "border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] text-[#c1d4cc] hover:border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.06)]"
      }`}
    >
      {children}
      {count !== undefined && (
        <span className={`rounded-[4px] px-[6px] py-[1px] text-[10px] font-bold ${active ? "bg-[rgba(94,234,212,0.2)] text-[#84d4a6]" : "bg-[rgba(255,255,255,0.06)] text-[#94a8a0]"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function ModalBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#5eead4]">{title}</h3>
      {children}
    </section>
  );
}
