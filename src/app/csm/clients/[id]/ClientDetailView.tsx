"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, notFound } from "next/navigation";
import Link from "next/link";
import { impersonationStore } from "@/lib/impersonation-store";
import { type PlanItem, type PlanItemFile, type PlanItemType, type Note, type PrioAction, type HistoryEvent, type ContractFormule, type ProduitTeale, type Statut } from "@/lib/clients-data";
import { csmClientsStore, toClient, toClientDetail } from "@/lib/csm-clients-store";
import { useCsmProfiles } from "@/lib/use-csm-profiles";
import ClientDetailSkeleton from "./ClientDetailSkeleton";
import { clientActionsStore } from "@/lib/client-actions-store";
import { notesStore } from "@/lib/notes-store";
import { useWorkshops, themes as workshopThemes } from "@/lib/workshops-store";
import { useKitsStore } from "@/lib/kits-store";

// Unified item shape consumed by the "Ajouter au plan" modal.
type CatalogItem = {
  id: string;
  icon: string;
  title: string;
  description: string;
  category: string;
  duration?: string;
};
import { planStore, type StoredPlanItem } from "@/lib/plan-store";
import { docsStore, type StoredDocument, type StoredDocumentFile } from "@/lib/docs-store";
import { uploadClientFile, openClientFile } from "@/lib/storage";
import { csmEventsStore, parseFrDateWeekday } from "@/lib/csm-events-store";
import { healthStore, type HealthEntry, type HealthStatut } from "@/lib/health-store";
import { targetsStore, type TargetLabel, LABEL_COLORS } from "@/lib/targets-store";
import { commentsStore, type PlanComment } from "@/lib/comments-store";
import { buildPlanQuarters } from "@/lib/plan-quarters";

// ─── Color helpers ────────────────────────────────────────────────────────────

const HISTORY_CONFIG: Record<string, { label: string; dot: string; bg: string; color: string }> = {
  atelier:        { label: "Atelier",        dot: "#c4b5fd", bg: "rgba(196,181,253,0.12)", color: "#c4b5fd" },
  qbr:            { label: "QBR",            dot: "#93c5fd", bg: "rgba(96,165,250,0.12)",  color: "#93c5fd" },
  csm:            { label: "Point CSM",      dot: "#5eead4", bg: "rgba(94,234,212,0.10)",  color: "#5eead4" },
  kit:            { label: "Kit comm",       dot: "#a8e895", bg: "rgba(168,232,149,0.10)", color: "#a8e895" },
  decision:       { label: "Décision",       dot: "#dced63", bg: "rgba(220,236,99,0.10)",  color: "#dced63" },
  renouvellement: { label: "Renouvellement", dot: "#84d4a6", bg: "rgba(132,212,166,0.15)", color: "#84d4a6" },
  alerte:         { label: "Alerte",         dot: "#E6AA99", bg: "rgba(230,170,153,0.12)", color: "#E6AA99" },
  onboarding:     { label: "Onboarding",     dot: "#fde047", bg: "rgba(253,224,71,0.10)",  color: "#fde047" },
};

const NOTE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  csm:      { label: "Point CSM",  bg: "rgba(94,234,212,0.10)",  color: "#5eead4" },
  decision: { label: "Décision",   bg: "rgba(220,236,99,0.10)",  color: "#dced63" },
  qbr:      { label: "QBR prep",   bg: "rgba(96,165,250,0.12)",  color: "#93c5fd" },
  alert:    { label: "À surveiller",bg: "rgba(230,170,153,0.15)","color": "#E6AA99" },
  atelier:  { label: "Atelier",    bg: "rgba(196,181,253,0.12)", color: "#c4b5fd" },
};

const TAG_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  green: { bg: "rgba(168,232,149,0.15)", color: "#a8e895", dot: "#a8e895" },
  blue:  { bg: "rgba(143,182,199,0.18)", color: "#8fb6c7", dot: "#8fb6c7" },
  amber: { bg: "rgba(253,224,71,0.15)",  color: "#fde047", dot: "#fde047" },
  red:   { bg: "rgba(230,170,153,0.15)", color: "#E6AA99", dot: "#E6AA99" },
};

const PLAN_ITEM_DEFAULT_ICONS: Record<string, string> = {
  atelier: "🎓", kit: "📢", csm: "📞", qbr: "📊", custom: "⚡",
};

const CHIP_TYPE_MAP: Record<string, "atelier" | "kit" | "csm" | "custom"> = {
  "🎓 Atelier": "atelier", "📢 Kit": "kit", "📞 Point CSM": "csm", "⚡ Custom": "custom",
};

const PLAN_STYLE: Record<string, { border: string; bg: string; hoverBg: string }> = {
  atelier: { border: "#c4b5fd", bg: "rgba(196,181,253,0.05)", hoverBg: "rgba(196,181,253,0.10)" },
  kit:     { border: "#5eead4", bg: "rgba(94,234,212,0.04)",  hoverBg: "rgba(94,234,212,0.09)" },
  csm:     { border: "#fde047", bg: "rgba(253,224,71,0.04)",  hoverBg: "rgba(253,224,71,0.09)" },
  qbr:     { border: "#93c5fd", bg: "rgba(96,165,250,0.05)",  hoverBg: "rgba(96,165,250,0.10)" },
  custom:  { border: "#dced63", bg: "rgba(220,236,99,0.05)",  hoverBg: "rgba(220,236,99,0.10)" },
};


// ─── Sub-components ───────────────────────────────────────────────────────────

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼";
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "📊";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "📊";
  return "📎";
}

function PlanItemRow({ item, onToggle, onEdit, labels = [], assignedTargets = [] }: {
  item: PlanItem;
  onToggle: () => void;
  onEdit?: () => void;
  labels?: TargetLabel[];
  assignedTargets?: string[];
}) {
  const s = PLAN_STYLE[item.type];
  const hasExtra = !item.done && (item.detail || (item.files && item.files.length > 0));
  const assigned = labels.filter((l) => assignedTargets.includes(l.id));

  return (
    <li
      onClick={onEdit}
      className={`group relative flex items-start gap-2 rounded-[10px] px-[11px] py-[10px] transition-colors ${onEdit ? "cursor-pointer hover:brightness-110" : ""}`}
      style={{ borderLeft: `2.5px solid ${s.border}`, backgroundColor: s.bg }}
    >
      <span className="mt-[1px] w-[18px] shrink-0 text-center text-sm">{item.icon}</span>
      <div className="min-w-0 flex-1">
        <div className={`text-[13px] font-medium leading-snug ${item.done ? "line-through text-[#94a8a0]" : "text-[#e8f5ef]"}`}>
          {item.title}
        </div>
        {!item.done && item.meta && <div className="mt-0.5 text-[11px] text-[#94a8a0]">{item.meta}</div>}
        {assigned.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {assigned.map((l) => (
              <span key={l.id} className="rounded-[4px] px-[6px] py-[2px] text-[10px] font-semibold" style={{ background: l.color + "22", color: l.color, border: `1px solid ${l.color}44` }}>
                {l.name}
              </span>
            ))}
          </div>
        )}
        {hasExtra && (
          <div className="mt-1.5 space-y-1.5">
            {item.detail && (
              <p className="text-[11px] leading-[1.5] text-[rgba(232,245,239,0.6)]">{item.detail}</p>
            )}
            {item.files && item.files.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {item.files.map((f) => (
                  <button key={f.id} type="button"
                    onClick={(e) => { e.stopPropagation(); void openClientFile(f.path, f.name); }}
                    className="inline-flex items-center gap-1 rounded-[6px] px-2 py-[3px] text-[10px] transition-colors"
                    style={{ background: "rgba(220,237,99,0.10)", color: "#dced63", border: "1px solid rgba(220,237,99,0.2)" }}>
                    <span>{getFileIcon(f.mimeType)}</span>
                    <span className="max-w-[120px] truncate">{f.name}</span>
                    <span className="opacity-60">{f.sizeLabel}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className={`mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all text-[11px] font-bold ${
          item.done
            ? "border-[#a8e895] bg-[#a8e895] text-[#06241d]"
            : "border-[rgba(255,255,255,0.18)] bg-transparent text-transparent hover:border-[#84d4a6] hover:text-[#84d4a6]"
        }`}
      >
        ✓
      </button>
    </li>
  );
}

function NoteCard({ note, onDelete, onOpenEdit }: { note: Note; onDelete: () => void; onOpenEdit: () => void }) {
  const cfg = NOTE_CONFIG[note.type];
  return (
    <article className={`group flex min-h-[200px] flex-col gap-2.5 rounded-[14px] border p-[18px] transition-colors ${note.alert ? "border-[rgba(230,170,153,0.30)] bg-[rgba(230,170,153,0.04)]" : "border-[#1a3530] bg-[rgba(14,37,32,0.45)] hover:border-[rgba(94,234,212,0.25)]"}`}>
      <div className="flex items-center gap-2">
        <span className="rounded-[5px] px-[9px] py-1 text-[10px] font-bold uppercase tracking-[0.9px]" style={{ backgroundColor: cfg.bg, color: cfg.color }}>{cfg.label}</span>
        <span className="text-[11px] text-[#94a8a0]">{note.date}</span>
        <div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button onClick={onOpenEdit} className="rounded-[6px] px-1.5 py-0.5 text-[14px] text-[#94a8a0] transition-colors hover:bg-[#1a3530] hover:text-[#e8f5ef]" aria-label="Modifier">✏</button>
          <button onClick={onDelete} className="rounded-[6px] px-1.5 py-0.5 text-[14px] text-[#94a8a0] transition-colors hover:bg-[rgba(230,170,153,0.1)] hover:text-[#E6AA99]" aria-label="Supprimer">×</button>
        </div>
      </div>
      <p className="flex-1 text-[13px] leading-[1.55] text-[#e8f5ef]">{note.text}</p>
    </article>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const SECTIONS = ["big-picture", "actions", "plan", "notes", "documents"] as const;
type Section = typeof SECTIONS[number];
const SECTION_LABELS: Record<Section, string> = {
  "big-picture": "Big picture",
  actions: "Actions",
  plan: "One-year plan",
  notes: "Notes",
  documents: "Documents",
};


const STATUT_CONFIG: Record<Statut, { label: string; bg: string; color: string; dot: string }> = {
  "SAIN":      { label: "Sain",      bg: "rgba(168,232,149,0.18)", color: "#a8e895", dot: "#a8e895" },
  "VIGILANCE": { label: "Vigilance", bg: "rgba(253,224,71,0.15)",  color: "#fde047", dot: "#fde047" },
  "À RISQUE":  { label: "À risque",  bg: "rgba(230,170,153,0.18)", color: "#E6AA99", dot: "#E6AA99" },
};

const FORMULE_STYLE: Record<ContractFormule, { bg: string; color: string }> = {
  "holistique":       { bg: "rgba(94,234,212,0.15)",  color: "#5eead4" },
  "digital + tokens": { bg: "rgba(96,165,250,0.15)",  color: "#93c5fd" },
  "digital only":     { bg: "rgba(253,224,71,0.12)",  color: "#fde047" },
};

const PRODUIT_STYLE: Record<ProduitTeale, { bg: string; color: string }> = {
  "Joy":                { bg: "rgba(168,232,149,0.15)", color: "#a8e895" },
  "Dashboard RH":       { bg: "rgba(94,234,212,0.12)",  color: "#5eead4" },
  "Pulse":              { bg: "rgba(196,181,253,0.12)", color: "#c4b5fd" },
  "Call d'orientation": { bg: "rgba(96,165,250,0.12)",  color: "#93c5fd" },
  "Ligne d'écoute":     { bg: "rgba(253,224,71,0.10)",  color: "#fde047" },
  "Assistante sociale": { bg: "rgba(230,170,153,0.12)", color: "#E6AA99" },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}

const FR_MONTH_NAMES = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];


function planItemMonthKey(
  item: PlanItem,
  qMonths: Array<{ key: string; label: string; num: number }>,
): string {
  // Explicit month wins — set when the item is added from a month card.
  if (item.month != null) {
    const byNum = qMonths.find((qm) => qm.num === item.month);
    if (byNum) return byNum.key;
  }
  const meta = item.meta ?? "";
  let m = meta.match(/(?:\d+|fin)\s+(janv|fév|févr?|mars|avr|mai|juin|juil|ao[uû]t|sept|oct|nov|déc)/i);
  if (!m) m = meta.match(/(?<!\w)(janv|fév|févr?|mars|avr|mai|juin|juil|ao[uû]t|sept|oct|nov|déc)(?!\w)/i);
  if (m) {
    const raw = (m[1] ?? "").toLowerCase();
    const norm = raw === "aout" ? "août" : raw.startsWith("févr") ? "fév" : raw;
    if (qMonths.some((qm) => qm.key === norm)) return norm;
  }
  // Fallback: first month of the quarter — same default as the client view,
  // so an item with no resolvable month is placed identically on both sides.
  return qMonths[0].key;
}

const FR_MONTH_ABBR_NUM: Record<string, number> = {
  janv: 0, fév: 1, mars: 2, avr: 3, mai: 4, juin: 5,
  juil: 6, août: 7, sept: 8, oct: 9, nov: 10, déc: 11,
};

// Best-effort month (0-11) parsed from a plan item's meta text. Used to
// back-fill `month` on legacy items that were stored before it existed.
function monthFromMeta(meta: string): number | undefined {
  const m = meta?.match(/(janv|févr?|mars|avr|mai|juin|juil|ao[uû]t|sept|oct|nov|déc)/i);
  if (!m) return undefined;
  let raw = m[1].toLowerCase();
  if (raw === "aout") raw = "août";
  if (raw.startsWith("fév")) raw = "fév";
  return FR_MONTH_ABBR_NUM[raw];
}

function formatDateFr(isoDate: string): string {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${parseInt(day)} ${FR_MONTH_NAMES[parseInt(month) - 1]} ${year}`;
}

const FR_MONTH_FULL_TO_NUM: Record<string, string> = {
  "janvier": "01", "février": "02", "mars": "03", "avril": "04",
  "mai": "05", "juin": "06", "juillet": "07", "août": "08",
  "septembre": "09", "octobre": "10", "novembre": "11", "décembre": "12",
};

function frDateToIso(frDate: string): string {
  const parts = frDate.trim().split(/\s+/);
  if (parts.length < 3) return "";
  const day = parts[0].padStart(2, "0");
  const month = FR_MONTH_FULL_TO_NUM[parts[1]?.toLowerCase() ?? ""] ?? "";
  const year = parts[2];
  if (!month || !year) return "";
  return `${year}-${month}-${day}`;
}

const DOC_TYPE_COLORS: Record<string, string> = {
  Stratégie: "bg-[rgba(94,234,212,0.12)] text-[#5eead4]",
  QBR:       "bg-[rgba(230,170,153,0.15)] text-[#E6AA99]",
  Bilan:     "bg-[rgba(168,232,149,0.12)] text-[#a8e895]",
  Guide:     "bg-[rgba(255,255,255,0.06)] text-[#e8f5ef]",
  Rapport:   "bg-[rgba(196,181,253,0.12)] text-[#c4b5fd]",
  Présentation: "bg-[rgba(253,224,71,0.10)] text-[#fde047]",
};

type LocalDetail = {
  collab: number;
  arr: number;
  ownerCsmId: string | null;
  formule: ContractFormule;
  contractStart: string;
  contractEnd: string;
  churnNotice: string;
  dernierPoint: string;
  rdvParCollab: number;
  nombreTokens: number;
  atelierTotal: number;
  atelierRemaining: number;
  produits: ProduitTeale[];
};

// Converts a persisted plan item back to the editable PlanItem shape.
function storedToPlanItem(s: StoredPlanItem): PlanItem {
  return {
    id: s.id,
    type: s.type,
    icon: s.icon,
    title: s.title,
    meta: s.meta,
    done: s.done,
    month: s.month ?? monthFromMeta(s.meta),
    deckCreated: s.deckCreated,
    impact: s.impact,
    responsable: s.responsable,
    detail: s.detail,
    files: s.files,
    targets: s.targets,
  };
}

// Rebuilds the current-year per-quarter plan from the saved plan_state items,
// so the CSM plan tab reloads exactly what was persisted instead of a static
// base. Next-year items (year === "next") are excluded here.
function buildPlanBase(items: StoredPlanItem[]) {
  const cur = items.filter((i) => i.year !== "next");
  return {
    planQ1: cur.filter((i) => i.quarter === "Q1").map(storedToPlanItem),
    planQ2Done: cur.filter((i) => i.quarter === "Q2" && i.done).map(storedToPlanItem),
    planQ2Upcoming: cur.filter((i) => i.quarter === "Q2" && !i.done).map(storedToPlanItem),
    planQ3: cur.filter((i) => i.quarter === "Q3").map(storedToPlanItem),
    planQ4: cur.filter((i) => i.quarter === "Q4").map(storedToPlanItem),
  };
}
type PlanBase = ReturnType<typeof buildPlanBase>;

// Restores the next-year items as `extraPlanItems` (keyed "next-q1".."next-q4"),
// so a milestone planned for the following year doesn't leak into this year.
function buildNextExtras(items: StoredPlanItem[]): Array<PlanItem & { quarter: string }> {
  return items
    .filter((i) => i.year === "next")
    .map((s) => ({ ...storedToPlanItem(s), quarter: `next-${s.quarter.toLowerCase()}` }));
}

export default function ClientDetailView({ id }: { id: string }) {
  const router = useRouter();

  const [storedClient, setStoredClient] = useState(() => csmClientsStore.get(id));
  // Loading until the clients store has finished its initial fetch.
  const [storeLoading, setStoreLoading] = useState(() => !csmClientsStore.isLoaded());

  useEffect(() => {
    return csmClientsStore.subscribe(() => {
      const found = csmClientsStore.get(id);
      setStoredClient(found);
      setStoreLoading(false);
    });
  }, [id]);

  const client = storedClient ? toClient(storedClient) : undefined;
  const detail = storedClient ? toClientDetail(storedClient) : undefined;

  const [showHeroExpanded, setShowHeroExpanded] = useState(false);
  const [doneActions, setDoneActions] = useState<Set<number>>(new Set());
  const [planItems, setPlanItems] = useState<Record<number, boolean>>({});
  // Effective done state. A session toggle (planItems) FULLY overrides the
  // stored value — so an item can be checked AND un-checked again.
  const isPlanDone = (item: PlanItem): boolean => planItems[item.id] ?? item.done;
  const [planOverrides, setPlanOverrides] = useState<Record<number, PlanItem>>({});
  const [deletedPlanIds, setDeletedPlanIds] = useState<Set<number>>(new Set());
  const [editingPlanItem, setEditingPlanItem] = useState<PlanItem | null>(null);
  const [editPlanTitle, setEditPlanTitle] = useState("");
  const [editPlanMeta, setEditPlanMeta] = useState("");
  const [editPlanImpact, setEditPlanImpact] = useState("");
  const [planItemComments, setPlanItemComments] = useState<PlanComment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const commentBottomRef = useRef<HTMLDivElement>(null);
  const [editPlanType, setEditPlanType] = useState<PlanItemType>("atelier");
  const [editPlanIcon, setEditPlanIcon] = useState("");
  const [editPlanMonth, setEditPlanMonth] = useState<number | undefined>(undefined);
  const [editPlanTargets, setEditPlanTargets] = useState<string[]>([]);
  const [planFilter, setPlanFilter] = useState<string>("Tous");
  const [activeSection, setActiveSection] = useState<Section>("big-picture");
  const [planYear, setPlanYear] = useState<"prev" | "current" | "next">("current");
  const [activePlanQ, setActivePlanQ] = useState<"Q1" | "Q2" | "Q3" | "Q4">(() => {
    const contractStart = storedClient?.contractStart || detail?.contractStart || "";
    const qs = buildPlanQuarters(contractStart);
    return qs.find((q) => q.status === "current")?.id
      ?? qs.find((q) => q.status === "upcoming")?.id
      ?? "Q1";
  });
  const [localNotes, setLocalNotes] = useState<Note[]>(() => notesStore.getNotes());
  const deleteNote = (noteId: number) => {
    void notesStore.removeNote(noteId);
  };
  const [noteModal, setNoteModal] = useState<{ mode: "create" | "edit"; noteId?: number } | null>(null);
  const [noteDraft, setNoteDraft] = useState<{ type: import("@/lib/clients-data").NoteType; date: string; text: string }>({ type: "csm", date: "", text: "" });

  const openCreateNote = () => {
    setNoteDraft({ type: "csm", date: new Date().toISOString().split("T")[0], text: "" });
    setNoteModal({ mode: "create" });
  };
  const openEditNote = (note: Note) => {
    setNoteDraft({ type: note.type, date: frDateToIso(note.date), text: note.text });
    setNoteModal({ mode: "edit", noteId: note.id });
  };
  const saveNote = () => {
    if (!noteDraft.text.trim()) return;
    const dateFr = formatDateFr(noteDraft.date) || new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    if (noteModal?.mode === "edit" && noteModal.noteId != null) {
      void notesStore.updateNote(noteModal.noteId, {
        type: noteDraft.type,
        date: dateFr,
        text: noteDraft.text.trim(),
      });
    } else {
      void notesStore.addNote({
        type: noteDraft.type,
        date: dateFr,
        text: noteDraft.text.trim(),
        ctaLabel: "",
        ctaVariant: "default",
      });
    }
    setNoteModal(null);
  };

  const [currentThemes, setCurrentThemes] = useState({
    q1: "",
    q2: "",
    q3: "",
    q4: "",
  });
  const [nextThemes, setNextThemes] = useState({ q1: "", q2: "", q3: "", q4: "" });
  const [editingQ, setEditingQ] = useState<string | null>(null);
  const [editingVal, setEditingVal] = useState("");
  // Personal actions for THIS client come from clientActionsStore (filtered
  // by client name) and are merged with the static seed (`detail.actions`).
  const personalActions = (name: string | undefined): PrioAction[] => {
    if (!name) return [];
    return clientActionsStore
      .getExtra()
      .filter((a) => a.clients.some((c) => c.name === name))
      .map<PrioAction>((a) => ({
        id: a.id,
        title: a.text,
        dueLabel: a.echeance,
        status: a.done ? "done" : a.overdue ? "late" : "normal",
      }));
  };
  const [localActions, setLocalActions] = useState<PrioAction[]>(() => [
    ...(detail?.actions ?? []),
    ...personalActions(storedClient?.name),
  ]);
  const [showNotes, setShowNotes] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("Tout");
  const [showNewAction, setShowNewAction] = useState(false);
  const [newActionTitle, setNewActionTitle] = useState("");
  const [newActionDue, setNewActionDue] = useState("");
  const [newActionStatus, setNewActionStatus] = useState<"normal" | "warn" | "late">("normal");
  const [addPlanCtx, setAddPlanCtx] = useState<{ quarter: string; type: "atelier" | "kit" | "csm" | "custom"; month?: number } | null>(null);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
  const [addPlanDate, setAddPlanDate] = useState("");
  const [addPlanCustomTitle, setAddPlanCustomTitle] = useState("");
  const [addPlanSearch, setAddPlanSearch] = useState("");
  const [addPlanCatFilter, setAddPlanCatFilter] = useState("Tous");
  const [extraPlanItems, setExtraPlanItems] = useState<Array<PlanItem & { quarter: string }>>([]);
  const [localStatut, setLocalStatut] = useState<Statut>(() => client?.statut ?? "SAIN");
  const [showStatutDropdown, setShowStatutDropdown] = useState(false);
  const { profiles: csmProfiles } = useCsmProfiles();
  const { workshops: workshopList } = useWorkshops();
  const { lancementKits, animationItems, emailTopicKits } = useKitsStore();
  const planItemSeq = useRef(1_000_000_000);
  const [planQAutoPicked, setPlanQAutoPicked] = useState(false);
  // Seed the id counter from the clock so two sessions can't mint the same
  // plan-item ids. Done in an effect — Date.now() must stay out of render.
  useEffect(() => {
    planItemSeq.current = Date.now();
  }, []);
  const [localDetail, setLocalDetail] = useState<LocalDetail>(() => ({
    collab: client?.collab ?? 0,
    arr: storedClient?.arr ?? 0,
    ownerCsmId: storedClient?.ownerCsmId ?? null,
    formule: detail?.formule ?? "digital + tokens",
    contractStart: detail?.contractStart ?? "",
    contractEnd: detail?.contractEnd ?? "",
    churnNotice: detail?.churnNotice ?? "",
    dernierPoint: detail?.dernierPoint ?? "",
    rdvParCollab: detail?.rdvParCollab ?? 1,
    nombreTokens: detail?.nombreTokens ?? 0,
    atelierTotal: detail?.atelierTotal ?? 0,
    atelierRemaining: detail?.atelierRemaining ?? 0,
    produits: detail?.produits ?? [],
  }));
  const [editDraft, setEditDraft] = useState<LocalDetail | null>(null);
  const [showEditDetails, setShowEditDetails] = useState(false);
  const [editError, setEditError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [localDocs, setLocalDocs] = useState<StoredDocument[]>(() => docsStore.getDocs());
  const [showDocModal, setShowDocModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<StoredDocument | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState("Stratégie");
  const [docSize, setDocSize] = useState("");
  const [docDate, setDocDate] = useState("");
  const [docAuthor, setDocAuthor] = useState("");
  const [docFiles, setDocFiles] = useState<StoredDocumentFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [addPlanTime, setAddPlanTime] = useState("");
  const [addPlanResponsable, setAddPlanResponsable] = useState("");
  const [addPlanDetail, setAddPlanDetail] = useState("");
  const [addPlanCustomFiles, setAddPlanCustomFiles] = useState<PlanItemFile[]>([]);
  const [addPlanTargets, setAddPlanTargets] = useState<string[]>([]);
  const [isPlanFileDragOver, setIsPlanFileDragOver] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const planFileInputRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);


  // When storedClient loads from Supabase, sync dependent local state
  // Re-seed the editable local copy when the stored client row changes (after
  // a save or a realtime update). This is React's documented "adjust state
  // when a value changes" pattern — a guarded setState during render, not an
  // effect — so it doesn't trip react-hooks/set-state-in-effect.
  const [syncedClient, setSyncedClient] = useState(storedClient);
  if (storedClient && storedClient !== syncedClient) {
    setSyncedClient(storedClient);
    const c = toClient(storedClient);
    const d = toClientDetail(storedClient);
    setLocalStatut(c.statut);
    setLocalDetail({
      collab: c.collab,
      arr: storedClient.arr ?? 0,
      ownerCsmId: storedClient.ownerCsmId ?? null,
      formule: d.formule,
      contractStart: d.contractStart,
      contractEnd: d.contractEnd,
      churnNotice: d.churnNotice,
      dernierPoint: d.dernierPoint,
      rdvParCollab: d.rdvParCollab,
      nombreTokens: (d as { nombreTokens?: number }).nombreTokens ?? 0,
      atelierTotal: d.atelierTotal,
      atelierRemaining: d.atelierRemaining,
      produits: d.produits,
    });
  }

  const [storedPlanItems, setStoredPlanItems] = useState<StoredPlanItem[]>(() => planStore.getState()?.items ?? []);
  // The saved plan, used as the editable base once loaded (instead of the
  // static `detail`). planLoaded gates the sync effect so it can't overwrite
  // plan_state with the static base before the real plan has been read.
  const [planBase, setPlanBase] = useState<PlanBase>(() => ({
    planQ1: detail?.planQ1 ?? [],
    planQ2Done: detail?.planQ2Done ?? [],
    planQ2Upcoming: detail?.planQ2Upcoming ?? [],
    planQ3: detail?.planQ3 ?? [],
    planQ4: detail?.planQ4 ?? [],
  }));
  const [planLoaded, setPlanLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      await planStore.load(id);
      if (!alive) return;
      const state = planStore.getState();
      setStoredPlanItems(state?.items ?? []);
      if (state?.themes) {
        setCurrentThemes({
          q1: state.themes.Q1 || "",
          q2: state.themes.Q2 || "",
          q3: state.themes.Q3 || "",
          q4: state.themes.Q4 || "",
        });
      }
      // Once there is a saved plan, it becomes the editable base — so added /
      // edited / deleted items survive a reload instead of being clobbered.
      if (state?.items && state.items.length > 0) {
        setPlanBase(buildPlanBase(state.items));
        setExtraPlanItems(buildNextExtras(state.items));
      }
      if (state?.nextThemes) {
        setNextThemes({
          q1: state.nextThemes.Q1 || "",
          q2: state.nextThemes.Q2 || "",
          q3: state.nextThemes.Q3 || "",
          q4: state.nextThemes.Q4 || "",
        });
      }
      setPlanLoaded(true);
    })();
    const unsub = planStore.subscribe(() => {
      setStoredPlanItems(planStore.getState()?.items ?? []);
    });
    return () => {
      alive = false;
      unsub();
    };
  }, [id]);

  useEffect(() => {
    docsStore.load(id);
    return docsStore.subscribe(() => setLocalDocs(docsStore.getDocs()));
  }, [id]);

  useEffect(() => {
    notesStore.load(id);
    return notesStore.subscribe(() => setLocalNotes(notesStore.getNotes()));
  }, [id]);

  // Refresh the per-client priority actions when the store changes (e.g. an
  // action added from the home page, or persisted on this page).
  useEffect(() => {
    const name = storedClient?.name;
    if (!name) return;
    const refresh = () => {
      setLocalActions([...(detail?.actions ?? []), ...personalActions(name)]);
    };
    refresh();
    return clientActionsStore.subscribe(refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedClient?.name]);

  // Target labels
  const [clientLabels, setClientLabels] = useState<TargetLabel[]>(() => targetsStore.getLabels(id));
  const [itemTargets, setItemTargets] = useState<Record<number, string[]>>(() => {
    const all = [...(detail?.planQ1 ?? []), ...(detail?.planQ2Done ?? []), ...(detail?.planQ2Upcoming ?? []), ...(detail?.planQ3 ?? []), ...(detail?.planQ4 ?? [])];
    return Object.fromEntries(all.map((i) => [i.id, targetsStore.getItemTargets(id, i.id)]));
  });
  const [planTargetFilter, setPlanTargetFilter] = useState<string | null>(null);
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);

  // Alerts & opportunities — editable list
  const [localAlerts, setLocalAlerts] = useState<Array<{ id: number; text: string }>>(() => {
    const d = detail?.bigPicture.alertes.detail;
    return d ? [{ id: 1, text: d }] : [];
  });
  const [localOpps, setLocalOpps] = useState<Array<{ id: number; text: string }>>(() => {
    const u = detail?.bigPicture.alertes.upsell;
    return u ? [{ id: 2, text: u }] : [];
  });
  const [editingAlertOppId, setEditingAlertOppId] = useState<string | null>(null);
  const [editingAlertOppVal, setEditingAlertOppVal] = useState("");
  const [addingAlertOppSection, setAddingAlertOppSection] = useState<"alert" | "opp" | null>(null);
  const [newAlertOppText, setNewAlertOppText] = useState("");
  useEffect(() => {
    targetsStore.load(id);
    return targetsStore.subscribe(() => {
      setClientLabels(targetsStore.getLabels(id));
      setItemTargets((prev) => {
        const next: Record<number, string[]> = { ...prev };
        for (const k of Object.keys(next)) next[Number(k)] = targetsStore.getItemTargets(id, Number(k));
        return next;
      });
    });
  }, [id]);

  // Health score history
  const [healthEntries, setHealthEntries] = useState<HealthEntry[]>(() => healthStore.getEntries(id));
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [healthDate, setHealthDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [healthStatut, setHealthStatut] = useState<HealthStatut>("SAIN");
  const [healthNote, setHealthNote] = useState("");
  useEffect(() => {
    healthStore.load(id);
    return healthStore.subscribe(() => setHealthEntries(healthStore.getEntries(id)));
  }, [id]);

  function submitHealthEntry() {
    const dateFr = formatDateFr(healthDate);
    healthStore.addEntry(id, {
      date: dateFr,
      isoDate: healthDate,
      statut: healthStatut,
      note: healthNote.trim() || undefined,
    });
    setShowHealthModal(false);
    setHealthNote("");
    setHealthDate(new Date().toISOString().split("T")[0]);
  }

  // Sync the effective plan to plan_state so the client "Suivi projet" view
  // reflects CSM changes. Gated on planLoaded: it must NOT run before the
  // saved plan has been read, otherwise it would overwrite plan_state with
  // the static base and wipe everything that had been added.
  useEffect(() => {
    if (!detail || !planLoaded) return;
    const eff = (item: PlanItem): PlanItem => planOverrides[item.id] ?? item;
    const toStored = (
      item: PlanItem,
      quarter: StoredPlanItem["quarter"],
      year: "current" | "next",
    ): StoredPlanItem => {
      const e = eff(item);
      return {
        id: e.id, quarter, year, month: e.month, type: e.type, icon: e.icon, title: e.title, meta: e.meta,
        done: isPlanDone(item),
        deckCreated: e.deckCreated,
        impact: e.impact || undefined,
        responsable: e.responsable || undefined,
        detail: e.detail || undefined,
        files: e.files?.length ? e.files : undefined,
        targets: e.targets?.length ? e.targets : (itemTargets[e.id]?.length ? itemTargets[e.id] : undefined),
      };
    };
    const qMap: Record<string, StoredPlanItem["quarter"]> = {
      q1: "Q1", q2: "Q2", q3: "Q3", q4: "Q4",
      "next-q1": "Q1", "next-q2": "Q2", "next-q3": "Q3", "next-q4": "Q4",
    };
    const next = {
      themes: { Q1: currentThemes.q1, Q2: currentThemes.q2, Q3: currentThemes.q3, Q4: currentThemes.q4 },
      nextThemes: { Q1: nextThemes.q1, Q2: nextThemes.q2, Q3: nextThemes.q3, Q4: nextThemes.q4 },
      items: [
        ...planBase.planQ1.filter((i) => !deletedPlanIds.has(i.id)).map((i) => toStored(i, "Q1", "current")),
        ...planBase.planQ2Done.filter((i) => !deletedPlanIds.has(i.id)).map((i) => ({ ...toStored(i, "Q2", "current"), done: true })),
        ...planBase.planQ2Upcoming.filter((i) => !deletedPlanIds.has(i.id)).map((i) => toStored(i, "Q2", "current")),
        ...planBase.planQ3.filter((i) => !deletedPlanIds.has(i.id)).map((i) => toStored(i, "Q3", "current")),
        ...planBase.planQ4.filter((i) => !deletedPlanIds.has(i.id)).map((i) => toStored(i, "Q4", "current")),
        ...extraPlanItems
          .filter((i) => !deletedPlanIds.has(i.id))
          .map((i) =>
            toStored(i, qMap[i.quarter] ?? "Q2", i.quarter.startsWith("next-") ? "next" : "current"),
          ),
      ],
    };
    // Debounced: a burst of edits (toggles, typing…) yields a single write.
    const timer = setTimeout(() => planStore.setState(next), 400);
    return () => clearTimeout(timer);
    // `detail`, `planBase` and `planTargetFilter` are intentionally omitted:
    // `planBase` is set once on load, and re-running on `detail` (an unstable
    // derived object) would resync on every render.
  }, [planOverrides, deletedPlanIds, extraPlanItems, currentThemes, nextThemes, planItems, itemTargets, planLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const getEffective = (item: PlanItem): PlanItem => planOverrides[item.id] ?? item;

  // Effective items of a quarter (base + extras − deletions) — for the overview KPIs.
  const quarterPlanItems = (q: "Q1" | "Q2" | "Q3" | "Q4"): PlanItem[] => {
    const base =
      q === "Q1" ? planBase.planQ1
      : q === "Q2" ? [...planBase.planQ2Done, ...planBase.planQ2Upcoming]
      : q === "Q3" ? planBase.planQ3
      : planBase.planQ4;
    const extras = extraPlanItems.filter((i) => i.quarter === q.toLowerCase());
    return [...base, ...extras]
      .filter((i) => !deletedPlanIds.has(i.id))
      .map(getEffective);
  };

  const openPlanEdit = (item: PlanItem) => {
    const eff = getEffective(item);
    setEditingPlanItem(eff);
    setEditPlanTitle(eff.title);
    setEditPlanMeta(eff.meta ?? "");
    setEditPlanImpact(eff.impact ?? "");
    setEditPlanType(eff.type);
    setEditPlanIcon(eff.icon);
    setEditPlanMonth(eff.month);
    setEditPlanTargets(itemTargets[eff.id] ?? []);
    setPlanItemComments(commentsStore.getByThread(String(eff.id)));
    setCommentDraft("");
  };

  useEffect(() => {
    if (!editingPlanItem) return;
    const threadId = String(editingPlanItem.id);
    commentsStore.load(threadId);
    const unsub = commentsStore.subscribe(() =>
      setPlanItemComments(commentsStore.getByThread(threadId))
    );
    return unsub;
  }, [editingPlanItem]);

  useEffect(() => {
    commentBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [planItemComments]);

  const savePlanEdit = () => {
    if (!editingPlanItem || !editPlanTitle.trim()) return;
    targetsStore.setItemTargets(id, editingPlanItem.id, editPlanTargets);
    setPlanOverrides((prev) => ({
      ...prev,
      [editingPlanItem.id]: {
        ...editingPlanItem,
        title: editPlanTitle.trim(),
        meta: editPlanMeta.trim(),
        impact: editPlanImpact.trim() || undefined,
        type: editPlanType,
        icon: editPlanIcon || PLAN_ITEM_DEFAULT_ICONS[editPlanType],
        month: editPlanMonth,
      },
    }));
    setEditingPlanItem(null);
  };

  const deletePlanItem = (id: number) => {
    setDeletedPlanIds((prev) => new Set([...prev, id]));
    setEditingPlanItem(null);
  };

  const commitEdit = () => {
    if (!editingQ) return;
    if (editingQ.startsWith("curr-")) {
      const q = editingQ.slice(5) as "q1" | "q2" | "q3" | "q4";
      setCurrentThemes((p) => ({ ...p, [q]: editingVal }));
    } else if (editingQ.startsWith("next-")) {
      const q = editingQ.slice(5) as "q1" | "q2" | "q3" | "q4";
      setNextThemes((p) => ({ ...p, [q]: editingVal }));
    }
    setEditingQ(null);
  };

  const handleCreateAction = () => {
    if (!newActionTitle.trim() || !client) return;
    const dueLabel = newActionDue ? formatDateFr(newActionDue) : "Sans échéance";
    // The store subscription refreshes localActions automatically.
    void clientActionsStore.add({
      text: newActionTitle.trim(),
      clients: [{ name: client.name, color: client.color }],
      echeance: dueLabel,
      overdue: newActionStatus === "late",
    });
    setNewActionTitle("");
    setNewActionDue("");
    setNewActionStatus("normal");
    setShowNewAction(false);
  };

  const openDocModal = (doc?: StoredDocument) => {
    if (doc) {
      setEditingDoc(doc);
      setDocTitle(doc.title);
      setDocType(doc.type);
      setDocSize(doc.size);
      setDocDate(frDateToIso(doc.date));
      setDocAuthor(doc.author);
      setDocFiles(doc.files ?? []);
    } else {
      setEditingDoc(null);
      setDocTitle("");
      setDocType("Stratégie");
      setDocSize("");
      setDocDate("");
      setDocAuthor("");
      setDocFiles([]);
    }
    setShowDocModal(true);
  };

  const handleFileSelect = async (fileList: FileList) => {
    setUploadError("");
    for (const f of Array.from(fileList)) {
      const { path, error } = await uploadClientFile(id, f);
      if (error || !path) {
        setUploadError(error ?? "Échec de l'envoi du fichier.");
        continue;
      }
      const stored: StoredDocumentFile = {
        id: `f-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: f.name,
        mimeType: f.type || "application/octet-stream",
        sizeBytes: f.size,
        sizeLabel: formatFileSize(f.size),
        path,
      };
      setDocFiles((prev) => {
        const next = [...prev, stored];
        setDocSize(formatFileSize(next.reduce((s, x) => s + x.sizeBytes, 0)));
        return next;
      });
    }
  };

  const removeDocFile = (fileId: string) => {
    setDocFiles((prev) => {
      const next = prev.filter((f) => f.id !== fileId);
      if (next.length > 0) setDocSize(formatFileSize(next.reduce((s, f) => s + f.sizeBytes, 0)));
      return next;
    });
  };

  const handlePlanFileSelect = async (fileList: FileList) => {
    setUploadError("");
    for (const f of Array.from(fileList)) {
      const { path, error } = await uploadClientFile(id, f);
      if (error || !path) {
        setUploadError(error ?? "Échec de l'envoi du fichier.");
        continue;
      }
      const stored: PlanItemFile = {
        id: `pf-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: f.name,
        mimeType: f.type || "application/octet-stream",
        sizeLabel: formatFileSize(f.size),
        path,
      };
      setAddPlanCustomFiles((prev) => [...prev, stored]);
    }
  };

  const saveDoc = () => {
    if (!docTitle.trim()) return;
    const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    if (editingDoc) {
      docsStore.setDocs(localDocs.map((d) => d.id === editingDoc.id
        ? { ...d, title: docTitle.trim(), type: docType, size: docSize.trim() || d.size, date: docDate ? formatDateFr(docDate) : d.date, author: docAuthor.trim() || d.author, files: docFiles }
        : d
      ));
    } else {
      docsStore.setDocs([...localDocs, {
        id: Date.now().toString(),
        title: docTitle.trim(),
        type: docType,
        size: docSize.trim() || "—",
        date: docDate ? formatDateFr(docDate) : today,
        author: docAuthor.trim() || "CSM",
        files: docFiles,
      }]);
    }
    setShowDocModal(false);
  };

  const deleteDoc = (id: string) => {
    docsStore.setDocs(localDocs.filter((d) => d.id !== id));
    setShowDocModal(false);
  };

  const openAddPlan = (
    quarter: string,
    type: "atelier" | "kit" | "csm" | "custom",
    month?: number,
  ) => {
    setAddPlanCtx({ quarter, type, month });
    setAddPlanSearch("");
    setAddPlanCatFilter("Tous");
    setSelectedCatalogId(null);
    setAddPlanDate("");
    setAddPlanTime("");
    setAddPlanCustomTitle("");
    setAddPlanResponsable("");
    setAddPlanDetail("");
    setAddPlanCustomFiles([]);
    setIsPlanFileDragOver(false);
  };

  const handleAddToPlan = () => {
    if (!addPlanCtx) return;
    // Monotonic id for ad-hoc plan items — high base avoids colliding with
    // the small numeric ids of seeded plan items.
    const newId = (planItemSeq.current += 1);
    // Month placement: a picked date wins, else the month card it was added
    // from. Stored on the item so every view places it identically.
    const month = addPlanDate
      ? parseInt(addPlanDate.split("-")[1], 10) - 1
      : addPlanCtx.month;
    if (addPlanCtx.type === "atelier" || addPlanCtx.type === "kit") {
      const item = catalogItems.find((i) => i.id === selectedCatalogId);
      if (!item) return;
      const meta = [
        addPlanCtx.type === "kit" ? item.category : item.duration,
        formatDateFr(addPlanDate),
        addPlanTime.trim(),
      ].filter(Boolean).join(" · ");
      setExtraPlanItems((prev) => [...prev, { id: newId, type: addPlanCtx.type, icon: item.icon, title: item.title, meta, done: false, month, quarter: addPlanCtx.quarter }]);
    } else {
      if (!addPlanCustomTitle.trim()) return;
      const dateFr = formatDateFr(addPlanDate);
      const metaParts = [dateFr, addPlanTime.trim(), addPlanResponsable.trim()].filter(Boolean);
      setExtraPlanItems((prev) => [...prev, {
        id: newId,
        type: addPlanCtx.type,
        icon: PLAN_ITEM_DEFAULT_ICONS[addPlanCtx.type],
        title: addPlanCustomTitle.trim(),
        meta: metaParts.join(" · "),
        done: false,
        month,
        quarter: addPlanCtx.quarter,
        responsable: addPlanResponsable.trim() || undefined,
        detail: addPlanDetail.trim() || undefined,
        files: addPlanCustomFiles.length > 0 ? [...addPlanCustomFiles] : undefined,
      }]);
      if (addPlanCtx.type === "csm" && client) {
        csmEventsStore.add({
          clientId: client.id,
          clientName: client.name,
          clientInitials: client.initials,
          clientColor: client.color,
          title: addPlanCustomTitle.trim(),
          date: dateFr,
          weekday: parseFrDateWeekday(dateFr),
          time: addPlanTime.trim(),
          responsable: addPlanResponsable.trim(),
        });
      }
    }
    if (addPlanTargets.length > 0) targetsStore.setItemTargets(id, newId, addPlanTargets);
    setAddPlanCtx(null);
    setSelectedCatalogId(null);
    setAddPlanDate("");
    setAddPlanTime("");
    setAddPlanCustomTitle("");
    setAddPlanResponsable("");
    setAddPlanDetail("");
    setAddPlanCustomFiles([]);
    setAddPlanTargets([]);
    setAddPlanSearch("");
    setAddPlanCatFilter("Tous");
  };

  // Dynamic quarters based on contract start date.
  // NOTE: every hook must stay above the early returns below — calling a hook
  // conditionally violates the Rules of Hooks and crashes the render.
  const planQuarters = useMemo(
    () => buildPlanQuarters(localDetail.contractStart),
    [localDetail.contractStart],
  );

  // Once the client (hence the real contract start) is loaded, jump the plan
  // to the current/upcoming quarter — once. A guarded setState during render
  // (the documented "adjust state on a change" pattern), not an effect.
  if (!planQAutoPicked && storedClient) {
    setPlanQAutoPicked(true);
    const target =
      planQuarters.find((q) => q.status === "current") ??
      planQuarters.find((q) => q.status === "upcoming");
    if (target) setActivePlanQ(target.id);
  }

  if (storeLoading) {
    return <ClientDetailSkeleton />;
  }
  if (!client || !detail) {
    // Store is loaded and this id matches nothing → render the 404 page.
    notFound();
  }

  const switchTab = (s: Section) => {
    setActiveSection(s);
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Toggle relative to the EFFECTIVE done state (so a stored-done item can be
  // un-checked). isPlanDone is defined once near the planItems state.
  const togglePlanItem = (item: PlanItem) =>
    setPlanItems((p) => ({ ...p, [item.id]: !(p[item.id] ?? item.done) }));

  const allPlanItems = [
    ...planBase.planQ2Done,
    ...planBase.planQ2Upcoming,
    ...planBase.planQ3,
    ...planBase.planQ4,
  ];
  const planFilterOptions = [
    { key: "Tous", count: allPlanItems.length },
    { key: "🎓 Ateliers", count: allPlanItems.filter((i) => i.type === "atelier").length },
    { key: "📢 Kits", count: allPlanItems.filter((i) => i.type === "kit").length },
    { key: "📞 Points CSM", count: allPlanItems.filter((i) => i.type === "csm").length },
    { key: "📊 QBR", count: allPlanItems.filter((i) => i.type === "qbr").length },
    { key: "⚡ Custom", count: allPlanItems.filter((i) => i.type === "custom").length },
  ].filter((o) => o.count > 0);

  const getPQ = (q: "Q1" | "Q2" | "Q3" | "Q4") => planQuarters.find((pq) => pq.id === q)!;

  const filterPlanItems = (items: PlanItem[]) => {
    const active = items.filter((i) => !deletedPlanIds.has(i.id)).map(getEffective);
    if (planFilter === "Tous") return active;
    const typeMap: Record<string, string> = {
      "🎓 Ateliers": "atelier", "📢 Kits": "kit", "📞 Points CSM": "csm",
      "📊 QBR": "qbr", "⚡ Custom": "custom",
    };
    return active.filter((i) => i.type === typeMap[planFilter]);
  };

  const q2DoneFiltered = filterPlanItems(planBase.planQ2Done).filter((i) => !planTargetFilter || (itemTargets[i.id] ?? []).includes(planTargetFilter));
  const q2UpcomingFiltered = filterPlanItems(planBase.planQ2Upcoming).filter((i) => !planTargetFilter || (itemTargets[i.id] ?? []).includes(planTargetFilter));
  const q3Filtered = filterPlanItems(planBase.planQ3).filter((i) => !planTargetFilter || (itemTargets[i.id] ?? []).includes(planTargetFilter));
  const q4Filtered = filterPlanItems(planBase.planQ4).filter((i) => !planTargetFilter || (itemTargets[i.id] ?? []).includes(planTargetFilter));
  const extraQ2Filtered = filterPlanItems(extraPlanItems.filter((i) => i.quarter === "q2") as PlanItem[]).filter((i) => !planTargetFilter || (itemTargets[i.id] ?? []).includes(planTargetFilter));
  const extraQ3Filtered = filterPlanItems(extraPlanItems.filter((i) => i.quarter === "q3") as PlanItem[]).filter((i) => !planTargetFilter || (itemTargets[i.id] ?? []).includes(planTargetFilter));
  const extraQ4Filtered = filterPlanItems(extraPlanItems.filter((i) => i.quarter === "q4") as PlanItem[]).filter((i) => !planTargetFilter || (itemTargets[i.id] ?? []).includes(planTargetFilter));

  // Ateliers come from the real workshops catalogue (workshops table).
  const workshopCatalog: CatalogItem[] = workshopList.map((w) => ({
    id: w.id,
    icon: "🎓",
    title: w.title,
    description: w.subtitle ?? w.objectives[0] ?? "",
    category: workshopThemes.find((t) => t.id === w.themeId)?.name ?? w.themeId,
    duration: w.duration ?? "1h",
  }));
  // Kits — merged from the 3 kit tables; all selectable, filterable by source.
  const kitStepLabels: Record<string, string> = {
    before: "Avant le lancement",
    dday: "Jour J",
    after: "Après le lancement",
  };
  const kitCatalog: CatalogItem[] = [
    ...lancementKits.map((k) => ({
      id: `lancement:${k.id}`,
      icon: "🚀",
      title: k.title,
      description: [kitStepLabels[k.step] ?? k.step, k.language].filter(Boolean).join(" · "),
      category: "Kit de lancement",
    })),
    ...animationItems.map((k) => ({
      id: `animation:${k.id}`,
      icon: "📣",
      title: k.title,
      description: [k.type, k.month].filter(Boolean).join(" · "),
      category: "Animation",
    })),
    ...emailTopicKits.map((k) => ({
      id: `email:${k.id}`,
      icon: "✉️",
      title: k.title,
      description: [k.topic, k.language].filter(Boolean).join(" · "),
      category: "Email",
    })),
  ];

  const catalogItems: CatalogItem[] =
    addPlanCtx?.type === "atelier"
      ? workshopCatalog
      : addPlanCtx?.type === "kit"
        ? kitCatalog
        : [];
  const catalogCategories =
    addPlanCtx?.type === "atelier"
      ? ["Tous", ...workshopThemes.map((t) => t.name)]
      : addPlanCtx?.type === "kit"
        ? ["Tous", "Kit de lancement", "Animation", "Email"]
        : [];
  const filteredCatalogItems = catalogItems.filter((item) => {
    const q = addPlanSearch.toLowerCase();
    const matchSearch = !q || item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
    const matchCat = addPlanCatFilter === "Tous" || item.category === addPlanCatFilter;
    return matchSearch && matchCat;
  });
  const hasCatalog = addPlanCtx?.type === "atelier" || addPlanCtx?.type === "kit";
  const canAddToPlan =
    addPlanCtx?.type === "atelier" ? (!!selectedCatalogId && !!addPlanDate && !!addPlanTime) :
    addPlanCtx?.type === "csm"    ? (!!addPlanCustomTitle.trim() && !!addPlanDate && !!addPlanTime) :
    hasCatalog                    ? !!selectedCatalogId :
    !!addPlanCustomTitle.trim();

  const openActionsCount = localActions.filter((a) => !doneActions.has(a.id)).length;

  return (
    <>
    <div ref={mainRef} className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[1480px] px-11 py-8 pb-24">

        {/* Back link */}
        <Link href="/csm" className="mb-3.5 inline-flex items-center gap-1.5 text-[13px] text-[#94a8a0] hover:text-[#e8f5ef]">
          ‹ Portfolio clients
        </Link>

        {/* ── Hero ── */}
        <header className="mb-5 rounded-[18px] border border-[rgba(94,234,212,0.18)] bg-gradient-to-br from-[rgba(94,234,212,0.06)] via-[rgba(132,212,166,0.02)] to-transparent p-[22px_26px]">
          {/* Ligne principale */}
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-[14px] text-[22px] font-bold"
                 style={{ backgroundColor: client.color + "40", color: client.color }}>
              {client.initials}
            </div>

            {/* Titre + méta */}
            <div className="min-w-0 flex-1">
              {/* Rangée titre + pills */}
              <div className="mb-[6px] flex flex-wrap items-center gap-2">
                <h1 className="text-[26px] font-semibold leading-none tracking-[-0.5px] text-[#e8f5ef]">{client.name}</h1>
                {/* Statut dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowStatutDropdown((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-full px-[10px] py-[3px] text-[11px] font-bold uppercase tracking-[0.5px] transition-opacity hover:opacity-80"
                    style={{ backgroundColor: STATUT_CONFIG[localStatut].bg, color: STATUT_CONFIG[localStatut].color }}
                  >
                    <span className="relative flex h-[7px] w-[7px] shrink-0">
                      {localStatut !== "SAIN" && (
                        <span className="absolute inset-0 animate-ping rounded-full opacity-60" style={{ backgroundColor: STATUT_CONFIG[localStatut].dot }} />
                      )}
                      <span className="relative inline-block h-[7px] w-[7px] rounded-full" style={{ backgroundColor: STATUT_CONFIG[localStatut].dot }} />
                    </span>
                    {STATUT_CONFIG[localStatut].label}
                    <span className="ml-0.5 text-[9px] opacity-60">▾</span>
                  </button>
                  {showStatutDropdown && (
                    <div className="absolute left-0 top-full z-30 mt-1.5 w-36 overflow-hidden rounded-[12px] border border-[#1a3530] bg-[#0e2520] shadow-2xl">
                      {(Object.entries(STATUT_CONFIG) as [Statut, typeof STATUT_CONFIG[Statut]][]).map(([key, cfg]) => (
                        <button
                          key={key}
                          onClick={() => {
                            setLocalStatut(key);
                            setShowStatutDropdown(false);
                            if (storedClient) {
                              const dbStatut = key === "SAIN" ? "green" : key === "VIGILANCE" ? "amber" : "danger";
                              void csmClientsStore.add({ ...storedClient, statut: dbStatut });
                            }
                          }}
                          className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[12px] transition-colors hover:bg-[#1a3530]"
                        >
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
                          <span style={{ color: key === localStatut ? cfg.color : "#e8f5ef" }} className={key === localStatut ? "font-semibold" : ""}>
                            {cfg.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Tags sans NPS */}
                {detail.statusTags.filter((t) => !t.label.startsWith("NPS")).map((t) => {
                  const s = TAG_STYLE[t.variant];
                  return (
                    <span key={t.label} className="inline-flex items-center gap-1.5 rounded-full px-[10px] py-[3px] text-[11px] font-semibold uppercase tracking-[0.5px]" style={{ backgroundColor: s.bg, color: s.color }}>
                      <span className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: s.dot }} />
                      {t.label}
                    </span>
                  );
                })}
              </div>
              {/* Ligne méta en une seule ligne */}
              <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-[#94a8a0]">
                <strong className="text-[#e8f5ef]">{localDetail.collab.toLocaleString("fr")} collaborateurs</strong>
                <span className="opacity-40">·</span>
                <span>Formule <strong className="text-[#e8f5ef]">{localDetail.formule}</strong></span>
                <span className="opacity-40">·</span>
                <span>CSM <strong className="text-[#e8f5ef]">{csmProfiles.find((p) => p.id === localDetail.ownerCsmId)?.full_name ?? "Non assigné"}</strong></span>
                {localDetail.contractStart && (<><span className="opacity-40">·</span><span>Contrat <strong className="text-[#e8f5ef]">{localDetail.contractStart} → {localDetail.contractEnd}</strong></span></>)}
                {localDetail.atelierTotal > 0 && (<><span className="opacity-40">·</span><span><strong className="text-[#e8f5ef]">{localDetail.atelierRemaining}</strong> ateliers restants / {localDetail.atelierTotal}</span></>)}
              </p>
            </div>

            {/* Boutons d'action */}
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => {
                  impersonationStore.set({ mode: "csm-preview", clientId: client.id, clientName: client.name, color: client.color });
                  router.push("/");
                }}
                className="inline-flex items-center gap-1.5 rounded-[9px] border border-[rgba(255,255,255,0.12)] px-3 py-1.5 text-[12px] font-medium text-[#94a8a0] transition-all hover:border-[rgba(255,255,255,0.22)] hover:text-[#e8f5ef]"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Voir l&apos;espace client
              </button>
              <button
                onClick={() => { setEditDraft({ ...localDetail }); setEditError(""); setShowEditDetails(true); }}
                className="inline-flex items-center gap-1.5 rounded-[9px] border border-[rgba(94,234,212,0.25)] px-3 py-1.5 text-[12px] font-medium text-[#5eead4] transition-all hover:bg-[rgba(94,234,212,0.08)]"
              >
                ✏ Modifier les détails
              </button>
              {/* QBR CTA — affiché seulement si nextEvent contient "qbr" */}
              {detail.nextEvent.title.toLowerCase().includes("qbr") && (
                <a href="https://qbr.lab.ops.teale.int/" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-[10px] rounded-[11px] px-4 py-[10px] text-[13px] font-semibold text-white transition-all hover:-translate-y-px"
                  style={{ background: "linear-gradient(135deg,#8b5cf6,#a78bfa)", boxShadow: "0 4px 14px rgba(139,92,246,0.30)" }}>
                  {detail.nextEvent.label}
                  <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-[rgba(255,255,255,0.15)] px-[7px] py-[3px] text-[11px] font-bold">
                    <span className="flex gap-[2px]">
                      {Array.from({ length: parseInt(detail.nextEvent.sections) }).map((_, i) => (
                        <span key={i} className={`h-[5px] w-[5px] rounded-full ${i < Math.round(parseInt(detail.nextEvent.sections) * detail.nextEvent.deckPct / 100) ? "bg-white" : "bg-[rgba(255,255,255,0.3)]"}`} />
                      ))}
                    </span>
                  </span>
                  Préparer →
                </a>
              )}
            </div>
          </div>

          {/* Bouton expand "Plus d'infos" */}
          <button
            onClick={() => setShowHeroExpanded((v) => !v)}
            className="mt-3.5 flex w-full items-center gap-[6px] border-t border-[#1a2c28] pt-3.5 text-[12px] font-medium text-[#a78bfa] hover:text-[#c4b5fd]">
            Plus d&apos;infos
            <span className={`inline-block transition-transform duration-200 ${showHeroExpanded ? "rotate-180" : ""}`}>▾</span>
          </button>

          {/* Section étendue */}
          {showHeroExpanded && (
            <div className="mt-3.5 border-t border-[#1a2c28] pt-3.5">
              <dl className="grid grid-cols-5 gap-x-6 gap-y-3.5">
                <div className="flex flex-col gap-1">
                  <dt className="text-[10px] font-semibold uppercase tracking-[1.1px] text-[#94a8a0]">Début contrat</dt>
                  <dd className="m-0 text-[13px] font-medium text-[#e8f5ef]">{localDetail.contractStart || "—"}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-[10px] font-semibold uppercase tracking-[1.1px] text-[#94a8a0]">Fin contrat</dt>
                  <dd className="m-0 text-[13px] font-medium text-[#e8f5ef]">{localDetail.contractEnd || "—"}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-[10px] font-semibold uppercase tracking-[1.1px] text-[#94a8a0]">Churn notice</dt>
                  <dd className="m-0 text-[13px] font-medium text-[#e8f5ef]">{localDetail.churnNotice || "—"}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-[10px] font-semibold uppercase tracking-[1.1px] text-[#94a8a0]">Dernier événement</dt>
                  <dd className="m-0 text-[13px] font-medium text-[#e8f5ef]">{localDetail.dernierPoint || "—"}</dd>
                </div>
                {localDetail.formule === "holistique" && (
                  <div className="flex flex-col gap-1">
                    <dt className="text-[10px] font-semibold uppercase tracking-[1.1px] text-[#94a8a0]">RDV / collab</dt>
                    <dd className="m-0 text-[13px] font-medium text-[#e8f5ef]">{localDetail.rdvParCollab}</dd>
                  </div>
                )}
                {localDetail.formule === "digital + tokens" && (
                  <div className="flex flex-col gap-1">
                    <dt className="text-[10px] font-semibold uppercase tracking-[1.1px] text-[#94a8a0]">Tokens</dt>
                    <dd className="m-0 text-[13px] font-medium text-[#e8f5ef]">{localDetail.nombreTokens.toLocaleString("fr")}</dd>
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <dt className="text-[10px] font-semibold uppercase tracking-[1.1px] text-[#94a8a0]">ARR</dt>
                  <dd className="m-0 text-[13px] font-medium text-[#e8f5ef]">{localDetail.arr > 0 ? `${localDetail.arr.toLocaleString("fr")} €` : "—"}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-[10px] font-semibold uppercase tracking-[1.1px] text-[#94a8a0]">Ateliers consommés</dt>
                  <dd className="m-0 text-[13px] font-medium text-[#e8f5ef]">{localDetail.atelierTotal - localDetail.atelierRemaining} / {localDetail.atelierTotal}</dd>
                </div>
                <div className="col-span-2 flex flex-col gap-1">
                  <dt className="text-[10px] font-semibold uppercase tracking-[1.1px] text-[#94a8a0]">Produits déployés</dt>
                  <dd className="m-0 flex flex-wrap gap-1.5">
                    {localDetail.produits.map((p) => (
                      <span key={p} className="rounded-full px-2.5 py-[3px] text-[11px] font-medium"
                        style={{ backgroundColor: PRODUIT_STYLE[p].bg, color: PRODUIT_STYLE[p].color }}>{p}</span>
                    ))}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </header>

        {/* ── Sticky sub-nav ── */}
        <nav className="sticky top-0 z-30 mb-8 -mx-11 border-b border-[#1a2c28] bg-[rgba(6,26,22,0.92)] px-11 backdrop-blur-[14px]">
          <div className="flex gap-0.5">
            {SECTIONS.map((s) => (
              <button
                key={s}
                onClick={() => switchTab(s)}
                className={`inline-flex items-center gap-2 px-[18px] py-[14px] text-[14px] font-medium transition-all border-b-2 -mb-px ${
                  activeSection === s
                    ? "border-[#a78bfa] text-[#ffffff]"
                    : "border-transparent text-[#94a8a0] hover:text-[#e8f5ef]"
                }`}
              >
                {SECTION_LABELS[s]}
                {s === "actions" && (
                  <span className={`rounded-full px-[7px] py-px text-[10.5px] font-bold ${activeSection === s ? "bg-[rgba(167,139,250,0.20)] text-[#c4b5fd]" : "bg-[rgba(255,255,255,0.06)] text-[#94a8a0]"}`}>
                    {openActionsCount}
                  </span>
                )}
                {s === "notes" && (
                  <span className={`rounded-full px-[7px] py-px text-[10.5px] font-bold ${activeSection === s ? "bg-[rgba(167,139,250,0.20)] text-[#c4b5fd]" : "bg-[rgba(255,255,255,0.06)] text-[#94a8a0]"}`}>
                    {localNotes.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* ── Big picture ── */}
        {activeSection === "big-picture" && <section className="mb-12">
          <header className="mb-5">
            <h2 className="text-[20px] font-medium tracking-[-0.3px] text-[#e8f5ef]">Big picture</h2>
            <p className="mt-1 text-[13px] text-[#94a8a0]">Indicateurs clés du compte avec tendance sur 6 mois.</p>
          </header>
          <div className="grid grid-cols-3 gap-3.5">

            {/* Avancement — Option A: Stacked composition bar */}
            <article className="flex flex-col gap-2.5 rounded-[18px] border border-[rgba(168,232,149,0.20)] bg-gradient-to-br from-[rgba(168,232,149,0.05)] to-[#0e2520] p-[20px] transition-colors hover:border-[rgba(94,234,212,0.22)]">
              {(() => {
                const total = storedPlanItems.length;
                const doneItems = storedPlanItems.filter((i) => i.done);
                const avDone = doneItems.length;
                const atelierN = doneItems.filter((i) => i.type === "atelier").length;
                const kitN = doneItems.filter((i) => i.type === "kit").length;
                const csmN = doneItems.filter((i) => i.type === "csm" || i.type === "qbr").length;
                const notDone = total - avDone;
                const atelierPct = total > 0 ? Math.round((atelierN / total) * 100) : 0;
                const kitPct = total > 0 ? Math.round((kitN / total) * 100) : 0;
                const csmPct = total > 0 ? Math.round((csmN / total) * 100) : 0;
                const notDonePct = 100 - atelierPct - kitPct - csmPct;
                const av = { done: avDone, total, progress: total > 0 ? Math.round((avDone / total) * 100) : 0, footer: "" };

                const now = new Date();
                const thisYear = now.getFullYear();
                const thisMonth = now.getMonth();
                const thisMonthCount = storedPlanItems.filter((i) => {
                  for (const part of i.meta.split(" · ")) {
                    const iso = frDateToIso(part.trim());
                    if (iso) {
                      const d = new Date(iso);
                      return d.getFullYear() === thisYear && d.getMonth() === thisMonth;
                    }
                  }
                  return false;
                }).length;

                return (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[1.1px] text-[#94a8a0]">Avancement projet</span>
                      {thisMonthCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-[6px] bg-[rgba(168,232,149,0.12)] px-[7px] py-0.5 text-[11px] font-semibold text-[#a8e895]">↑ +{thisMonthCount} ce mois</span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[30px] font-semibold leading-[1.05] tracking-[-0.8px] text-[#a8e895]">
                      {av.done} <small className="text-[13px] font-normal tracking-normal text-[#94a8a0]">/ {av.total} jalons</small>
                    </div>
                    <div className="mt-1">
                      <div className="flex h-[14px] overflow-hidden rounded-[8px] bg-[rgba(255,255,255,0.05)]">
                        {atelierN > 0 && <div className="flex items-center justify-center text-[10px] font-bold text-[#06241d]" style={{ width: `${atelierPct}%`, background: "#c4b5fd" }}>{atelierN}</div>}
                        {kitN > 0 && <div className="flex items-center justify-center text-[10px] font-bold text-[#06241d]" style={{ width: `${kitPct}%`, background: "#5eead4" }}>{kitN}</div>}
                        {csmN > 0 && <div className="flex items-center justify-center text-[10px] font-bold text-[#06241d]" style={{ width: `${csmPct}%`, background: "#fde047" }}>{csmN}</div>}
                        {notDone > 0 && <div className="flex items-center justify-center text-[10px] font-bold text-[#94a8a0]" style={{ width: `${notDonePct}%`, background: "rgba(255,255,255,0.06)" }}>+{notDone}</div>}
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
                        {atelierN > 0 && <div className="flex items-center gap-1.5 text-[11px] text-[#94a8a0]"><span className="h-2 w-2 shrink-0 rounded-full bg-[#c4b5fd]" /><strong className="text-[#e8f5ef]">{atelierN}</strong> Ateliers</div>}
                        {kitN > 0 && <div className="flex items-center gap-1.5 text-[11px] text-[#94a8a0]"><span className="h-2 w-2 shrink-0 rounded-full bg-[#5eead4]" /><strong className="text-[#e8f5ef]">{kitN}</strong> Kits comm</div>}
                        {csmN > 0 && <div className="flex items-center gap-1.5 text-[11px] text-[#94a8a0]"><span className="h-2 w-2 shrink-0 rounded-full bg-[#fde047]" /><strong className="text-[#e8f5ef]">{csmN}</strong> Points CSM</div>}
                      </div>
                    </div>
                    <div className="mt-auto flex justify-between text-[11px] text-[#94a8a0]">
                      <span>{av.progress}% du plan</span>
                      <span className="font-medium text-[#e8f5ef]">{av.footer}</span>
                    </div>
                  </>
                );
              })()}
            </article>

            {/* Santé */}
            <article className="flex flex-col gap-2 rounded-[18px] border border-[rgba(168,232,149,0.20)] bg-gradient-to-br from-[rgba(168,232,149,0.05)] to-[#0e2520] p-[20px] transition-colors hover:border-[rgba(94,234,212,0.22)]">
              {(() => {
                const latest = healthEntries.at(-1);
                const prev = healthEntries.at(-2);
                const ORDER: Record<HealthStatut, number> = { "SAIN": 2, "VIGILANCE": 1, "À RISQUE": 0 };
                const trend = latest && prev ? Math.sign(ORDER[latest.statut] - ORDER[prev.statut]) : null;
                const STATUT_COLOR: Record<HealthStatut, string> = { "SAIN": "#a8e895", "VIGILANCE": "#fde047", "À RISQUE": "#E6AA99" };
                const STATUT_Y: Record<HealthStatut, number> = { "SAIN": 10, "VIGILANCE": 25, "À RISQUE": 40 };
                const TL_W = 260, TL_PAD = 14;
                const tlPts = healthEntries.map((e, i) => ({
                  x: healthEntries.length <= 1 ? TL_W / 2 : TL_PAD + (TL_W - TL_PAD * 2) / (healthEntries.length - 1) * i,
                  y: STATUT_Y[e.statut],
                  color: STATUT_COLOR[e.statut],
                  label: (() => { const p = e.date.split(" "); return p.length >= 3 ? `${p[1]} '${p[2].slice(2)}` : e.date; })(),
                }));
                return (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[1.1px] text-[#94a8a0]">Score de santé</span>
                      <button
                        onClick={() => setShowHealthModal(true)}
                        className="inline-flex items-center gap-1 rounded-[6px] border border-[rgba(168,232,149,0.20)] px-[8px] py-[3px] text-[10px] font-semibold text-[#a8e895] transition hover:bg-[rgba(168,232,149,0.08)]"
                      >
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Mise à jour
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5">
                      {latest ? (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-[12px] py-[4px] text-[15px] font-bold uppercase tracking-[0.5px]"
                          style={{ backgroundColor: STATUT_CONFIG[latest.statut].bg, color: STATUT_CONFIG[latest.statut].color }}
                        >
                          <span className="h-[8px] w-[8px] rounded-full shrink-0" style={{ backgroundColor: STATUT_CONFIG[latest.statut].dot }} />
                          {STATUT_CONFIG[latest.statut].label}
                        </span>
                      ) : (
                        <span className="text-[22px] font-semibold text-[#4b5c55]">—</span>
                      )}
                      {trend !== null && trend !== 0 && (
                        <span className={`inline-flex items-center gap-0.5 rounded-[5px] px-[6px] py-[2px] text-[11px] font-semibold ${trend > 0 ? "bg-[rgba(168,232,149,0.12)] text-[#a8e895]" : "bg-[rgba(230,170,153,0.12)] text-[#E6AA99]"}`}>
                          {trend > 0 ? "↑" : "↓"} {trend > 0 ? "Amélioration" : "Dégradation"}
                        </span>
                      )}
                    </div>

                    {/* Health timeline */}
                    {healthEntries.length > 0 && (
                      <svg viewBox="0 0 260 54" className="w-full h-[54px]">
                        <defs>
                          {tlPts.slice(0, -1).map((pt, i) => (
                            <linearGradient key={i} id={`hcg${i}`} gradientUnits="userSpaceOnUse"
                              x1={pt.x} y1="0" x2={tlPts[i + 1].x} y2="0">
                              <stop offset="0%" stopColor={pt.color} stopOpacity="0.5" />
                              <stop offset="100%" stopColor={tlPts[i + 1].color} stopOpacity="0.5" />
                            </linearGradient>
                          ))}
                        </defs>
                        <line x1="0" y1="10" x2="260" y2="10" stroke="rgba(168,232,149,0.10)" strokeWidth="1" strokeDasharray="3 4" />
                        <line x1="0" y1="25" x2="260" y2="25" stroke="rgba(253,224,71,0.07)" strokeWidth="1" strokeDasharray="3 4" />
                        <line x1="0" y1="40" x2="260" y2="40" stroke="rgba(230,170,153,0.07)" strokeWidth="1" strokeDasharray="3 4" />
                        {tlPts.slice(0, -1).map((pt, i) => {
                          const nx = tlPts[i + 1];
                          const cx = (pt.x + nx.x) / 2;
                          return (
                            <path key={i}
                              d={`M${pt.x},${pt.y} C${cx},${pt.y} ${cx},${nx.y} ${nx.x},${nx.y}`}
                              fill="none" stroke={`url(#hcg${i})`} strokeWidth="1.6" strokeLinecap="round" />
                          );
                        })}
                        {tlPts.map((pt, i) => (
                          <circle key={`g${i}`} cx={pt.x} cy={pt.y} r="7" fill={pt.color} fillOpacity="0.13" />
                        ))}
                        {tlPts.map((pt, i) => (
                          <circle key={`d${i}`} cx={pt.x} cy={pt.y}
                            r={i === tlPts.length - 1 ? 4.5 : 3.5} fill={pt.color} />
                        ))}
                        {tlPts.map((pt, i) => (
                          <text key={`t${i}`} x={pt.x} y={52}
                            textAnchor={i === 0 ? "start" : i === tlPts.length - 1 ? "end" : "middle"}
                            fill="#546b62" fontSize="7.5">
                            {pt.label}
                          </text>
                        ))}
                      </svg>
                    )}

                    {/* History entries */}
                    <ul className="mt-1 max-h-[130px] space-y-2 overflow-y-auto pr-1">
                      {[...healthEntries].reverse().map((entry) => (
                        <li key={entry.id} className="group flex items-start gap-2">
                          <div className="mt-[3px] h-[6px] w-[6px] shrink-0 rounded-full" style={{ backgroundColor: STATUT_COLOR[entry.statut] }} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-flex items-center rounded-full px-[7px] py-[1px] text-[10px] font-bold uppercase tracking-[0.4px]"
                                style={{ backgroundColor: STATUT_CONFIG[entry.statut].bg, color: STATUT_CONFIG[entry.statut].color }}
                              >
                                {STATUT_CONFIG[entry.statut].label}
                              </span>
                              <span className="ml-auto text-[10px] text-[#6b7c75]">{entry.date}</span>
                              <button
                                onClick={() => healthStore.removeEntry(id, entry.id)}
                                className="text-[10px] text-[#6b7c75] opacity-0 transition hover:text-[#E6AA99] group-hover:opacity-100"
                                aria-label="Supprimer"
                              >×</button>
                            </div>
                            {entry.note && (
                              <p className="mt-[2px] text-[11px] leading-snug text-[#6b7c75]">{entry.note}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>

                  </>
                );
              })()}
            </article>

            {/* Alertes & opportunités — editable */}
            <article className="flex flex-col gap-3 rounded-[18px] border border-[#1a3530] bg-[#0e2520] p-[20px] transition-colors hover:border-[rgba(94,234,212,0.22)]">
              {/* Header */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[1.1px] text-[#94a8a0]">Alertes &amp; opportunités</span>
                <span className="rounded-[6px] bg-[rgba(255,255,255,0.04)] px-[7px] py-0.5 text-[11px] font-semibold text-[#94a8a0]">
                  {localAlerts.length + localOpps.length} item{localAlerts.length + localOpps.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Alertes */}
              <div>
                <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[1px] text-[#E6AA99]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#E6AA99]" />
                  Alertes ({localAlerts.length})
                </div>
                <div className="flex flex-col gap-0.5">
                  {localAlerts.map((a) =>
                    editingAlertOppId === `alert-${a.id}` ? (
                      <input
                        key={a.id}
                        value={editingAlertOppVal}
                        onChange={(e) => setEditingAlertOppVal(e.target.value)}
                        onBlur={() => {
                          if (editingAlertOppVal.trim()) setLocalAlerts((prev) => prev.map((x) => x.id === a.id ? { ...x, text: editingAlertOppVal.trim() } : x));
                          setEditingAlertOppId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { if (editingAlertOppVal.trim()) setLocalAlerts((prev) => prev.map((x) => x.id === a.id ? { ...x, text: editingAlertOppVal.trim() } : x)); setEditingAlertOppId(null); }
                          if (e.key === "Escape") setEditingAlertOppId(null);
                        }}
                        className="w-full rounded-[6px] bg-[rgba(255,255,255,0.07)] px-2 py-1.5 text-[12px] text-[#e8f5ef] outline-none ring-1 ring-[rgba(230,170,153,0.45)] placeholder:text-[#94a8a0]"
                        autoFocus
                      />
                    ) : (
                      <div key={a.id} className="group flex items-start gap-1.5 rounded-[7px] px-2 py-1.5 hover:bg-[rgba(255,255,255,0.03)]">
                        <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#E6AA99]" />
                        <span
                          onClick={() => { setEditingAlertOppId(`alert-${a.id}`); setEditingAlertOppVal(a.text); }}
                          className="flex-1 cursor-text text-[12px] leading-[1.45] text-[#e8f5ef]"
                        >{a.text}</span>
                        <button
                          onClick={() => setLocalAlerts((prev) => prev.filter((x) => x.id !== a.id))}
                          className="shrink-0 text-[15px] leading-none text-transparent transition-colors group-hover:text-[#94a8a0] hover:!text-[#E6AA99]"
                        >×</button>
                      </div>
                    )
                  )}
                  {addingAlertOppSection === "alert" ? (
                    <input
                      value={newAlertOppText}
                      onChange={(e) => setNewAlertOppText(e.target.value)}
                      onBlur={() => {
                        if (newAlertOppText.trim()) setLocalAlerts((prev) => [...prev, { id: Date.now(), text: newAlertOppText.trim() }]);
                        setAddingAlertOppSection(null); setNewAlertOppText("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { if (newAlertOppText.trim()) setLocalAlerts((prev) => [...prev, { id: Date.now(), text: newAlertOppText.trim() }]); setAddingAlertOppSection(null); setNewAlertOppText(""); }
                        if (e.key === "Escape") { setAddingAlertOppSection(null); setNewAlertOppText(""); }
                      }}
                      placeholder="Nouvelle alerte…"
                      className="w-full rounded-[6px] bg-[rgba(255,255,255,0.07)] px-2 py-1.5 text-[12px] text-[#e8f5ef] outline-none ring-1 ring-[rgba(230,170,153,0.45)] placeholder:text-[#94a8a0]"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => setAddingAlertOppSection("alert")}
                      className="flex items-center gap-1 rounded-[6px] px-2 py-1 text-[11px] text-[#94a8a0] transition-colors hover:text-[#E6AA99]"
                    >
                      <span className="text-[14px] font-light leading-none">+</span> Ajouter
                    </button>
                  )}
                </div>
              </div>

              <div className="h-px bg-[#1a3530]" />

              {/* Opportunités */}
              <div>
                <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[1px] text-[#5eead4]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#5eead4]" />
                  Opportunités ({localOpps.length})
                </div>
                <div className="flex flex-col gap-0.5">
                  {localOpps.map((o) =>
                    editingAlertOppId === `opp-${o.id}` ? (
                      <input
                        key={o.id}
                        value={editingAlertOppVal}
                        onChange={(e) => setEditingAlertOppVal(e.target.value)}
                        onBlur={() => {
                          if (editingAlertOppVal.trim()) setLocalOpps((prev) => prev.map((x) => x.id === o.id ? { ...x, text: editingAlertOppVal.trim() } : x));
                          setEditingAlertOppId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { if (editingAlertOppVal.trim()) setLocalOpps((prev) => prev.map((x) => x.id === o.id ? { ...x, text: editingAlertOppVal.trim() } : x)); setEditingAlertOppId(null); }
                          if (e.key === "Escape") setEditingAlertOppId(null);
                        }}
                        className="w-full rounded-[6px] bg-[rgba(255,255,255,0.07)] px-2 py-1.5 text-[12px] text-[#e8f5ef] outline-none ring-1 ring-[rgba(94,234,212,0.4)] placeholder:text-[#94a8a0]"
                        autoFocus
                      />
                    ) : (
                      <div key={o.id} className="group flex items-start gap-1.5 rounded-[7px] px-2 py-1.5 hover:bg-[rgba(255,255,255,0.03)]">
                        <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#5eead4]" />
                        <span
                          onClick={() => { setEditingAlertOppId(`opp-${o.id}`); setEditingAlertOppVal(o.text); }}
                          className="flex-1 cursor-text text-[12px] leading-[1.45] text-[#e8f5ef]"
                        >{o.text}</span>
                        <button
                          onClick={() => setLocalOpps((prev) => prev.filter((x) => x.id !== o.id))}
                          className="shrink-0 text-[15px] leading-none text-transparent transition-colors group-hover:text-[#94a8a0] hover:!text-[#5eead4]"
                        >×</button>
                      </div>
                    )
                  )}
                  {addingAlertOppSection === "opp" ? (
                    <input
                      value={newAlertOppText}
                      onChange={(e) => setNewAlertOppText(e.target.value)}
                      onBlur={() => {
                        if (newAlertOppText.trim()) setLocalOpps((prev) => [...prev, { id: Date.now(), text: newAlertOppText.trim() }]);
                        setAddingAlertOppSection(null); setNewAlertOppText("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { if (newAlertOppText.trim()) setLocalOpps((prev) => [...prev, { id: Date.now(), text: newAlertOppText.trim() }]); setAddingAlertOppSection(null); setNewAlertOppText(""); }
                        if (e.key === "Escape") { setAddingAlertOppSection(null); setNewAlertOppText(""); }
                      }}
                      placeholder="Nouvelle opportunité…"
                      className="w-full rounded-[6px] bg-[rgba(255,255,255,0.07)] px-2 py-1.5 text-[12px] text-[#e8f5ef] outline-none ring-1 ring-[rgba(94,234,212,0.4)] placeholder:text-[#94a8a0]"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => setAddingAlertOppSection("opp")}
                      className="flex items-center gap-1 rounded-[6px] px-2 py-1 text-[11px] text-[#94a8a0] transition-colors hover:text-[#5eead4]"
                    >
                      <span className="text-[14px] font-light leading-none">+</span> Ajouter
                    </button>
                  )}
                </div>
              </div>
            </article>

          </div>

          {/* ── 2-col : actions + mini-notes ── */}
          <div className="mt-7 grid grid-cols-2 gap-[18px]">

            {/* Left : top 3 actions */}
            <div>
              <div className="mb-[18px] flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-[19px] font-medium tracking-[-0.3px] text-[#e8f5ef]">Mes 3 prochaines actions</h2>
                  <p className="mt-[5px] text-[13px] text-[#94a8a0]">Triées par urgence · cliquer pour cocher</p>
                </div>
                <button onClick={() => switchTab("actions")} className="inline-flex items-center gap-1 text-[13px] font-medium text-[#a78bfa] hover:text-[#c4b5fd]">Tout voir →</button>
              </div>
              <ul className="flex flex-col gap-2 list-none p-0 m-0">
                {localActions.filter((a) => !doneActions.has(a.id)).slice(0, 3).map((action, i) => (
                  <li key={action.id}
                    className={`flex items-center gap-3 rounded-[11px] border px-[14px] py-[13px] transition-all cursor-pointer ${action.status === "late" ? "border-[rgba(230,170,153,0.30)] bg-[rgba(230,170,153,0.04)]" : "border-[#1a2c28] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(167,139,250,0.30)] hover:bg-[rgba(167,139,250,0.04)]"}`}>
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] text-[11px] font-bold ${action.status === "late" ? "bg-[#E6AA99] text-[#06241d]" : "bg-[rgba(255,255,255,0.06)] text-[#e8f5ef]"}`}>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium leading-[1.4] text-[#e8f5ef]">{action.title}</div>
                      <div className={`mt-[3px] text-[11px] ${action.status === "late" ? "font-semibold text-[#E6AA99]" : "text-[#94a8a0]"}`}>{action.dueLabel}</div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDoneActions((s) => new Set([...s, action.id])); }}
                      className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] border border-[#94a8a0] text-transparent transition-all hover:border-[#a78bfa] hover:text-[#a78bfa]"
                      aria-label="Marquer fait">✓</button>
                  </li>
                ))}
                {localActions.filter((a) => !doneActions.has(a.id)).length === 0 && (
                  <li className="py-8 text-center text-[13px] text-[#94a8a0]">Aucune action en cours 🎉</li>
                )}
              </ul>
            </div>

            {/* Right : 3 dernières notes */}
            <div>
              <div className="mb-[18px] flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-[19px] font-medium tracking-[-0.3px] text-[#e8f5ef]">Derniers événements</h2>
                  <p className="mt-[5px] text-[13px] text-[#94a8a0]">3 dernières notes &amp; signaux du compte</p>
                </div>
                <button onClick={() => switchTab("notes")} className="inline-flex items-center gap-1 text-[13px] font-medium text-[#a78bfa] hover:text-[#c4b5fd]">
                  Voir toutes ({localNotes.length}) →
                </button>
              </div>
              <ul className="flex flex-col gap-2 list-none p-0 m-0">
                {[...localNotes].reverse().slice(0, 3).map((note) => {
                  const cfg = NOTE_CONFIG[note.type];
                  return (
                    <li key={note.id} className="cursor-pointer rounded-[11px] border border-[#1a2c28] bg-[rgba(255,255,255,0.02)] px-[14px] py-[13px] transition-all hover:border-[rgba(167,139,250,0.25)]">
                      <div className="mb-[6px] flex items-center gap-2">
                        <span className="rounded-[4px] px-[7px] py-[3px] text-[9px] font-bold uppercase tracking-[0.7px]"
                          style={{ backgroundColor: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                        <span className="text-[11px] text-[#94a8a0]">{note.date}</span>
                      </div>
                      <p className="m-0 line-clamp-2 text-[12.5px] leading-[1.5] text-[#e8f5ef]">{note.text}</p>
                    </li>
                  );
                })}
                {localNotes.length === 0 && (
                  <li className="py-8 text-center text-[13px] text-[#94a8a0]">Aucune note pour ce compte.</li>
                )}
              </ul>
            </div>
          </div>

          {/* ── Quarter strip ── */}
          <div className="mt-7">
            <div className="mb-[18px] flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[19px] font-medium tracking-[-0.3px] text-[#e8f5ef]">Année en cours · vue d&apos;ensemble</h2>
                <p className="mt-[5px] text-[13px] text-[#94a8a0]">L&apos;avancement par trimestre · cliquer pour voir le détail.</p>
              </div>
              <button onClick={() => switchTab("plan")} className="inline-flex items-center gap-1 text-[13px] font-medium text-[#a78bfa] hover:text-[#c4b5fd]">Plan complet →</button>
            </div>
            <div className="grid grid-cols-4 gap-3.5">
              {(["Q1", "Q2", "Q3", "Q4"] as const).map((q) => {
                const qKey = q.toLowerCase() as "q1" | "q2" | "q3" | "q4";
                const theme = currentThemes[qKey] || "";
                const pq = getPQ(q);
                const allPast = pq.status === "past";
                const hasCurrent = pq.status === "current";
                const label = allPast ? "Terminé" : hasCurrent ? "En cours" : "À venir";
                const isNow = hasCurrent;
                const isDone = allPast;
                const qItems = quarterPlanItems(q);
                const total = qItems.length;
                const done = qItems.filter(isPlanDone).length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <button
                    key={q}
                    onClick={() => { setActivePlanQ(q); switchTab("plan"); }}
                    className={`flex flex-col gap-[10px] rounded-[14px] border px-[18px] py-[16px] text-left transition-all ${
                      isDone ? "opacity-70 border-[#1a2c28] bg-[#0e1f1c]" :
                      isNow ? "border-[rgba(94,234,212,0.30)] bg-gradient-to-br from-[rgba(94,234,212,0.05)] to-[#0e1f1c]" :
                      "border-[#1a2c28] bg-[#0e1f1c] hover:border-[#243a35]"
                    }`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10.5px] font-bold uppercase tracking-[1.1px] ${isNow ? "text-[#84d4a6]" : "text-[#94a8a0]"}`}>
                        {label}
                      </span>
                      {total > 0 && (
                        <span className={`text-[10.5px] font-semibold ${isNow ? "text-[#84d4a6]" : "text-[#94a8a0]"}`}>
                          {done}/{total} · {pct}%
                        </span>
                      )}
                    </div>
                    <div className="text-[14px] font-medium leading-[1.3] tracking-[-0.2px] text-[#e8f5ef]">{theme || "Thème à définir"}</div>
                    <div className="mt-auto h-[4px] overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                      <div className="h-full rounded-full bg-[#a8e895]" style={{ width: `${pct}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>}

        {/* ── Actions prioritaires ── */}
        {activeSection === "actions" && <section className="mb-12">
          <header className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[20px] font-medium tracking-[-0.3px] text-[#e8f5ef]">Actions prioritaires</h2>
              <p className="mt-1 text-[13px] text-[#94a8a0]">
                {openActionsCount} ouverte{openActionsCount !== 1 ? "s" : ""} · Clique « Marquer fait » dès qu&apos;une action est traitée.
              </p>
            </div>
          </header>
          <div className="grid grid-cols-6 gap-3">
            {localActions.map((action) => {
              const done = doneActions.has(action.id);
              return (
                <article
                  key={action.id}
                  className={`flex min-h-[185px] cursor-grab flex-col rounded-[14px] border p-4 transition-colors ${
                    done ? "border-[#1a3530] bg-[rgba(14,37,32,0.30)]"
                    : action.status === "late" ? "border-[rgba(230,170,153,0.30)] bg-[rgba(230,170,153,0.04)]"
                    : action.status === "warn" ? "border-[rgba(253,224,71,0.22)] bg-[rgba(253,224,71,0.03)]"
                    : "border-[#1a3530] bg-[rgba(14,37,32,0.55)]"
                  } hover:border-[rgba(94,234,212,0.22)]`}
                >
                  <div className="mb-2.5 flex items-center gap-2">
                    <div className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[7px] text-[11px] font-bold ${
                      done ? "bg-[rgba(255,255,255,0.06)] text-[#94a8a0]"
                      : action.status === "late" ? "bg-[#E6AA99] text-[#06241d]"
                      : action.status === "warn" ? "bg-[#fde047] text-[#06241d]"
                      : "bg-[rgba(255,255,255,0.06)] text-[#e8f5ef]"
                    }`}>{action.id}</div>
                    <span className={`text-[10px] font-semibold uppercase tracking-[1px] ${
                      done ? "text-[#94a8a0]"
                      : action.status === "late" ? "text-[#E6AA99]"
                      : action.status === "warn" ? "text-[#fde047]"
                      : "text-[#94a8a0]"
                    }`}>
                      {done ? "Terminé" : action.status === "late" ? "En retard" : action.status === "warn" ? "Cette semaine" : "À traiter"}
                    </span>
                  </div>
                  <h3 className={`flex-1 text-[14px] font-medium leading-[1.4] ${done ? "text-[#94a8a0] line-through" : "text-[#e8f5ef]"}`}>{action.title}</h3>
                  <span className={`my-3 self-start rounded-full px-[10px] py-1 text-[11px] font-medium ${
                    done ? "bg-[rgba(168,232,149,0.10)] text-[#a8e895]"
                    : action.status === "late" ? "bg-[rgba(230,170,153,0.15)] text-[#E6AA99]"
                    : action.status === "warn" ? "bg-[rgba(253,224,71,0.10)] text-[#fde047]"
                    : "bg-[rgba(255,255,255,0.04)] text-[#94a8a0]"
                  }`}>
                    {done ? "✓ Terminé" : action.dueLabel}
                  </span>
                  <div className="-mx-4 mt-auto border-t border-[#1a3530] px-4 pt-2.5">
                    <button
                      onClick={() => setDoneActions((prev) => { const s = new Set(prev); if (done) s.delete(action.id); else s.add(action.id); return s; })}
                      className={`w-full rounded-[8px] border px-3 py-[7px] text-[12px] font-semibold transition-all ${
                        done ? "border-[#a8e895] bg-[#a8e895] text-[#06241d]" : "border-[#84d4a6] text-[#84d4a6] hover:bg-[#84d4a6] hover:text-[#06241d]"
                      }`}
                    >
                      {done ? "✓ Fait" : "Marquer fait ✓"}
                    </button>
                  </div>
                </article>
              );
            })}
            {/* Add card */}
            <button onClick={() => setShowNewAction(true)} className="flex min-h-[185px] cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[14px] border border-dashed border-[#1a3530] p-4 transition-all hover:border-[#84d4a6] hover:bg-[rgba(132,212,166,0.04)]">
              <div className="grid h-[38px] w-[38px] place-items-center rounded-full border border-[#84d4a6] text-[22px] leading-none text-[#84d4a6]">+</div>
              <div className="text-[13px] font-medium text-[#e8f5ef]">Nouvelle action</div>
              <div className="text-center text-[11px] leading-[1.4] text-[#94a8a0]">Synchronisée sur la homepage</div>
            </button>
          </div>
        </section>}

        {/* ── One-year plan ── */}
        {activeSection === "plan" && <section className="mb-12">
          <header className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[20px] font-medium tracking-[-0.3px] text-[#e8f5ef]">One-year plan</h2>
              <p className="mt-1 text-[13px] text-[#94a8a0]">
                {planYear === "prev"
                  ? "Historique du contrat précédent — lecture seule."
                  : planYear === "next"
                  ? "Planification de l'année suivante · cliquez un objectif pour le définir."
                  : "Survolez le titre d'un trimestre pour modifier l'objectif."}
              </p>
            </div>
          </header>

          {/* ── Target filter bar ── */}
          {clientLabels.length > 0 && planYear === "current" && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setPlanTargetFilter(null)}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${planTargetFilter === null ? "bg-[rgba(94,234,212,0.15)] text-[#5eead4]" : "border border-[rgba(255,255,255,0.1)] text-[#94a8a0] hover:text-[#e8f5ef]"}`}
              >Toutes les cibles</button>
              {clientLabels.map((l) => (
                <button key={l.id}
                  onClick={() => setPlanTargetFilter(planTargetFilter === l.id ? null : l.id)}
                  className="rounded-full px-3 py-1 text-[11px] font-semibold transition"
                  style={planTargetFilter === l.id
                    ? { background: l.color + "33", color: l.color, border: `1px solid ${l.color}66` }
                    : { border: "1px solid rgba(255,255,255,0.1)", color: "#94a8a0" }}
                >{l.name}</button>
              ))}
              <button
                onClick={() => setShowLabelManager((v) => !v)}
                className="ml-auto rounded-full border border-[rgba(255,255,255,0.08)] px-2.5 py-1 text-[10px] font-semibold text-[#6b7c75] transition hover:text-[#94a8a0]"
              >⚙ Gérer les étiquettes</button>
            </div>
          )}
          {planYear === "current" && clientLabels.length === 0 && (
            <div className="mb-4 flex items-center gap-2">
              <span className="text-[12px] text-[#6b7c75]">Aucune étiquette de cible pour ce client.</span>
              <button onClick={() => setShowLabelManager(true)} className="rounded-full border border-[rgba(255,255,255,0.08)] px-2.5 py-1 text-[10px] font-semibold text-[#5eead4] transition hover:bg-[rgba(94,234,212,0.08)]">+ Créer</button>
            </div>
          )}
          {showLabelManager && (
            <div className="mb-4 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[1px] text-[#94a8a0]">Étiquettes de cible</p>
              <div className="mb-3 flex flex-wrap gap-2">
                {clientLabels.map((l) => (
                  <span key={l.id} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
                    style={{ background: l.color + "22", color: l.color, border: `1px solid ${l.color}44` }}>
                    {l.name}
                    <button onClick={() => targetsStore.removeLabel(id, l.id)} className="opacity-50 hover:opacity-100 text-[11px]">×</button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input value={newLabelName} onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder="Nom de l'étiquette"
                  className="flex-1 rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-1.5 text-[12px] text-[#e8f5ef] placeholder-[rgba(232,245,239,0.25)] outline-none focus:border-[rgba(94,234,212,0.4)]"
                />
                <div className="flex gap-1">
                  {LABEL_COLORS.map((c) => (
                    <button key={c} onClick={() => setNewLabelColor(c)}
                      className="h-5 w-5 rounded-full transition-transform hover:scale-110"
                      style={{ background: c, outline: newLabelColor === c ? `2px solid ${c}` : "none", outlineOffset: 2 }} />
                  ))}
                </div>
                <button
                  onClick={() => { if (newLabelName.trim()) { targetsStore.addLabel(id, newLabelName.trim(), newLabelColor); setNewLabelName(""); } }}
                  disabled={!newLabelName.trim()}
                  className="rounded-[8px] bg-[rgba(94,234,212,0.12)] px-3 py-1.5 text-[12px] font-semibold text-[#5eead4] transition hover:bg-[rgba(94,234,212,0.2)] disabled:opacity-40"
                >Ajouter</button>
              </div>
            </div>
          )}

                    {/* ── Year navigation ── */}
          <div className="mb-7 inline-flex items-center gap-0.5 rounded-[11px] border border-white/5 bg-white/[0.025] p-[3px]">
            {([
              { key: "prev" as const,    label: detail.prevYear ? detail.prevYear.yearLabel : "Historique", disabled: !detail.prevYear },
              { key: "current" as const, label: "Année en cours", disabled: false },
              { key: "next" as const,    label: "Année suivante", disabled: false },
            ]).map(({ key, label, disabled }) => (
              <button
                key={key}
                type="button"
                onClick={() => { if (!disabled) setPlanYear(key); }}
                className={`rounded-[8px] px-3 py-[7px] text-[11px] font-semibold tracking-[0.5px] transition-all ${
                  planYear === key
                    ? "bg-[rgba(94,234,212,0.14)] text-[#5eead4]"
                    : disabled
                      ? "cursor-not-allowed text-[rgba(148,168,160,0.3)]"
                      : "text-[#94a8a0] hover:text-[#e8f5ef]"
                }`}
              >{label}</button>
            ))}
          </div>

          {/* ── Previous year ── */}
          {planYear === "prev" && (
            detail.prevYear ? (
              <div className="grid grid-cols-4 gap-4">
                {(["q1", "q2", "q3", "q4"] as const).map((q, i) => {
                  const qd = detail.prevYear![q];
                  const pct = Math.round((qd.done / Math.max(qd.total, 1)) * 100);
                  return (
                    <article key={q} className="overflow-hidden rounded-[18px] border border-[#1a3530] bg-[rgba(14,37,32,0.30)] p-5">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="rounded-[6px] bg-[rgba(168,232,149,0.10)] px-[9px] py-1 text-[10px] font-bold uppercase tracking-[1.2px] text-[#a8e895]">
                          Q{i + 1} · Terminé
                        </span>
                        <span className="text-[11px] font-semibold text-[#a8e895]">{pct}%</span>
                      </div>
                      <h3 className="mb-1 text-[14px] font-medium leading-snug text-[#e8f5ef]">{qd.theme}</h3>
                      <p className="mb-3 text-[12px] text-[#94a8a0]">{qd.period}</p>
                      <div className="mb-1.5 h-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                        <div className="h-full rounded-full bg-[#a8e895]" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="mb-3 flex justify-between text-[11px] text-[#94a8a0]">
                        <span>{qd.done}/{qd.total} jalons</span>
                        <span className="font-medium text-[#a8e895]">{pct}%</span>
                      </div>
                      <div className="rounded-[10px] border border-[rgba(168,232,149,0.10)] bg-[rgba(168,232,149,0.04)] p-3 text-[12px] leading-relaxed text-[#94a8a0]">
                        {qd.highlight}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-[18px] border border-dashed border-[#1a3530] py-16 text-center">
                <div className="mb-3 text-[36px] opacity-25">📋</div>
                <h3 className="mb-1 text-[15px] font-medium text-[#e8f5ef]">Premier contrat</h3>
                <p className="text-[13px] text-[#94a8a0]">Pas de données historiques avant ce contrat.</p>
              </div>
            )
          )}

          {/* ── Current year ── */}
          {planYear === "current" && (() => {
            const allItemsByQ: Record<"Q1" | "Q2" | "Q3" | "Q4", PlanItem[]> = {
              Q1: planBase.planQ1
                .filter((i) => !deletedPlanIds.has(i.id))
                .filter((i) => !planTargetFilter || (itemTargets[i.id] ?? []).includes(planTargetFilter))
                .map(getEffective),
              Q2: [
                ...q2DoneFiltered.map((i) => ({ ...i, done: true })),
                ...q2UpcomingFiltered.map((i) => ({ ...i, done: isPlanDone(i) })),
                ...extraQ2Filtered.map((i) => ({ ...i, done: isPlanDone(i) })),
              ],
              Q3: [
                ...q3Filtered.map((i) => ({ ...i, done: isPlanDone(i) })),
                ...extraQ3Filtered.map((i) => ({ ...i, done: isPlanDone(i) })),
              ],
              Q4: [
                ...q4Filtered.map((i) => ({ ...i, done: isPlanDone(i) })),
                ...extraQ4Filtered.map((i) => ({ ...i, done: isPlanDone(i) })),
              ],
            };
            const qMonths = getPQ(activePlanQ).months;
            const activeQItems = allItemsByQ[activePlanQ];
            const byMonth: Record<string, PlanItem[]> = Object.fromEntries(qMonths.map((m) => [m.key, []]));
            for (const item of activeQItems) byMonth[planItemMonthKey(item, qMonths)].push(item);

            const qLabel = (q: "Q1" | "Q2" | "Q3" | "Q4") => {
              const pq = getPQ(q);
              if (pq.status === "past") return "Terminé";
              if (pq.status === "current") return "En cours";
              return "À venir";
            };
            const qStatusLabel: Record<"Q1" | "Q2" | "Q3" | "Q4", string> = {
              Q1: qLabel("Q1"), Q2: qLabel("Q2"), Q3: qLabel("Q3"), Q4: qLabel("Q4"),
            };
            const qThemeMap: Record<"Q1" | "Q2" | "Q3" | "Q4", string> = {
              Q1: currentThemes.q1, Q2: currentThemes.q2, Q3: currentThemes.q3, Q4: currentThemes.q4,
            };

            return (
              <>
                {/* Filter toolbar */}
                <div className="mb-4 flex items-center gap-3 rounded-[12px] border border-[#1a3530] bg-[rgba(14,37,32,0.45)] p-[6px]">
                  <div className="flex flex-1 flex-wrap gap-1">
                    {planFilterOptions.map((o) => (
                      <button
                        key={o.key}
                        onClick={() => setPlanFilter(o.key)}
                        className={`rounded-[8px] px-3 py-1.5 text-[12px] font-medium transition-all ${planFilter === o.key ? "bg-[#1a2e29] text-[#e8f5ef]" : "text-[#94a8a0] hover:text-[#e8f5ef]"}`}
                      >
                        {o.key} <span className="opacity-60">{o.count}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* FocusBar */}
                {(() => {
                  const QUARTER_EMOJI: Record<"Q1"|"Q2"|"Q3"|"Q4", string> = { Q1: "🌱", Q2: "📈", Q3: "📊", Q4: "🔄" };
                  const activeItems = allItemsByQ[activePlanQ];
                  const fDone = activeItems.filter((i) => isPlanDone(i)).length;
                  const fUpcoming = activeItems.length - fDone;
                  const fPct = activeItems.length > 0 ? Math.round((fDone / activeItems.length) * 100) : 0;
                  const fStatus = qStatusLabel[activePlanQ];
                  const fTheme = qThemeMap[activePlanQ];
                  return (
                    <div className="relative mb-7 overflow-hidden rounded-2xl border border-[rgba(94,234,212,0.22)] px-7 py-5"
                      style={{ background: "linear-gradient(135deg, rgba(94,234,212,0.12) 0%, rgba(94,234,212,0.03) 100%)" }}>
                      <div className="absolute inset-y-0 left-0 w-1 rounded-l-2xl" style={{ background: "linear-gradient(180deg, #5eead4 0%, #2dd4bf 100%)" }} />
                      <div className="flex flex-wrap items-center gap-8">
                        <div className="flex-1">
                          <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-[5px] bg-[#5eead4] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[1.2px] text-[#042f2a]">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#042f2a]" />
                            {QUARTER_EMOJI[activePlanQ]} {fStatus} · {activePlanQ}
                          </div>
                          <div className="text-[20px] font-semibold text-[#e8f5ef]">{fTheme || "Thème à définir"}</div>
                        </div>
                        <div className="flex gap-7 border-l border-[rgba(94,234,212,0.18)] pl-8">
                          <div className="text-center">
                            <div className="text-[30px] font-bold leading-none tabular-nums text-[#5eead4]">{fUpcoming}</div>
                            <div className="mt-1.5 text-[10px] uppercase tracking-[1px] text-[#94a8a0]">À venir</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[30px] font-bold leading-none tabular-nums text-[#5eead4]">{fDone}</div>
                            <div className="mt-1.5 text-[10px] uppercase tracking-[1px] text-[#94a8a0]">Faits</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[30px] font-bold leading-none tabular-nums text-[#5eead4]">{fPct}<span className="text-[15px] text-[#94a8a0]">%</span></div>
                            <div className="mt-1.5 text-[10px] uppercase tracking-[1px] text-[#94a8a0]">Trimestre</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Quarter tabs — client-view style */}
                <div className="mb-7 grid grid-cols-4 gap-2.5">
                  {(["Q1", "Q2", "Q3", "Q4"] as const).map((q) => {
                    const QUARTER_EMOJI: Record<"Q1"|"Q2"|"Q3"|"Q4", string> = { Q1: "🌱", Q2: "📈", Q3: "📊", Q4: "🔄" };
                    const qItems = allItemsByQ[q];
                    const total = qItems.length;
                    const done = qItems.filter((i) => isPlanDone(i)).length;
                    const pct = total ? Math.round((done / total) * 100) : 0;
                    const qKey = q.toLowerCase() as "q1" | "q2" | "q3" | "q4";
                    const isActive = activePlanQ === q;
                    const statusLabel = qStatusLabel[q];
                    const theme = qThemeMap[q];
                    const monthsAbbr = getPQ(q).months.map((m) => m.label.slice(0, 3)).join(" · ");
                    const isPast = statusLabel === "Terminé";
                    const isCurrent = statusLabel === "En cours";
                    return (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setActivePlanQ(q)}
                        className={`rounded-[11px] border px-4 py-3.5 text-left transition-all ${
                          isActive
                            ? "border-[rgba(94,234,212,0.3)] bg-[rgba(94,234,212,0.07)] shadow-[0_0_0_1px_rgba(94,234,212,0.15),0_8px_28px_-10px_rgba(94,234,212,0.5)]"
                            : isPast
                              ? "border-transparent opacity-50 hover:opacity-80"
                              : "border-transparent hover:bg-white/[0.03]"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className={`text-[11px] font-bold tracking-[1px] ${isActive ? "text-[#5eead4]" : "text-[#94a8a0]"}`}>
                            {QUARTER_EMOJI[q]}
                          </span>
                          {isCurrent ? (
                            <span className="rounded-[4px] bg-[#5eead4] px-[7px] py-[3px] text-[9px] font-bold tracking-[0.5px] text-[#042f2a]">Maintenant</span>
                          ) : (
                            <span className="text-[9px] uppercase tracking-[0.5px] text-[#6b7c75]">{isPast ? "Passé" : "À venir"}</span>
                          )}
                        </div>
                        {editingQ === `curr-${qKey}` ? (
                          <input
                            value={editingVal}
                            onChange={(e) => setEditingVal(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") commitEdit(); }}
                            onClick={(e) => e.stopPropagation()}
                            className="mb-0.5 w-full rounded-[5px] bg-[rgba(255,255,255,0.08)] px-1.5 py-0.5 text-[13px] font-semibold text-[#e8f5ef] outline-none ring-1 ring-[rgba(94,234,212,0.4)]"
                            autoFocus
                          />
                        ) : (
                          <div className="group mb-0.5 flex items-start gap-1">
                            <p className="min-w-0 flex-1 text-[13px] font-semibold text-[#e8f5ef]">
                              {theme || <span className="text-[12px] font-normal text-[#6b7c75]">Définir le thème…</span>}
                            </p>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setEditingQ(`curr-${qKey}`); setEditingVal(theme); }}
                              className="mt-0.5 shrink-0 rounded-[3px] p-0.5 text-[13px] text-transparent transition-colors group-hover:text-[#94a8a0] hover:!text-[#5eead4]"
                              title="Modifier le thème"
                            >✏</button>
                          </div>
                        )}
                        <div className="mb-2.5 text-[10px] tracking-[0.3px] text-[#6b7c75]">{monthsAbbr}</div>
                        <div className="h-[3px] overflow-hidden rounded-full bg-white/5">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: "linear-gradient(90deg,#5eead4 0%,#2dd4bf 100%)" }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Section header */}
                <div className="mb-5 flex items-baseline justify-between">
                  <div className="text-[14px] font-semibold tracking-[0.3px] text-[#e8f5ef]">
                    Événements du trimestre <span className="text-[#5eead4]">·</span>{" "}
                    <span className="font-medium text-[#94a8a0]">{activePlanQ}</span>
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.5px] text-[#6b7c75]">
                    {activeQItems.length} événement{activeQItems.length !== 1 ? "s" : ""} · {activeQItems.filter((i) => !isPlanDone(i)).length} à venir
                  </div>
                </div>

                {/* Month columns */}
                <div className="grid grid-cols-3 gap-3.5">
                  {qMonths.map((month) => {
                    const mItems = byMonth[month.key] ?? [];
                    const qLower = activePlanQ.toLowerCase() as "q1" | "q2" | "q3" | "q4";
                    const mStatus = getPQ(activePlanQ).months.find((m) => m.key === month.key)?.status ?? "upcoming";
                    return (
                      <div
                        key={month.key}
                        className={`rounded-[13px] border p-[18px] ${
                          mStatus === "current"
                            ? "border-[rgba(94,234,212,0.15)] bg-[rgba(94,234,212,0.035)]"
                            : "border-white/[0.04] bg-white/[0.012]"
                        }`}
                      >
                        <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
                          <div className="flex items-center gap-2">
                            <h4 className={`text-[12px] font-bold uppercase tracking-[1.8px] ${
                              mStatus === "past" ? "text-[#6b7c75]" : "text-[#e8f5ef]"
                            }`}>
                              {month.label}
                            </h4>
                            {mStatus === "current" && (
                              <span className="rounded-[4px] bg-[#5eead4] px-[7px] py-[3px] text-[9px] font-bold tracking-[0.5px] text-[#042f2a]">En cours</span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#6b7c75]">
                            {mItems.length > 0 ? `${mItems.length} événement${mItems.length > 1 ? "s" : ""}` : "—"}
                          </span>
                        </div>
                        <div className={mStatus === "past" ? "opacity-50" : ""}>
                          {mItems.length === 0 ? (
                            <p className="py-5 text-center text-[11px] italic text-[#6b7c75]">Pas d&apos;événement programmé.</p>
                          ) : (
                            <ul className="mb-3 flex flex-col gap-1.5">
                              {mItems.map((item) => (
                                <PlanItemRow
                                  key={item.id}
                                  item={item}
                                  onToggle={() => togglePlanItem(item)}
                                  onEdit={() => openPlanEdit(item)}
                                  labels={clientLabels}
                                  assignedTargets={itemTargets[item.id] ?? []}
                                />
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                          {(["🎓 Atelier", "📢 Kit", "📞 Point CSM", "⚡ Custom"] as const).map((chip) => (
                            <button
                              key={chip}
                              onClick={() => openAddPlan(qLower, CHIP_TYPE_MAP[chip], month.num)}
                              className="rounded-full border border-dashed border-[#1a3530] px-[11px] py-[5px] text-[11px] text-[#e8f5ef] transition-all hover:border-[#84d4a6] hover:bg-[rgba(132,212,166,0.05)] hover:text-[#84d4a6]"
                            >{chip}</button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}

          {/* ── Next year ── */}
          {planYear === "next" && (
            <div className="grid grid-cols-4 gap-4">
              {(["q1", "q2", "q3", "q4"] as const).map((q, i) => (
                <article key={q} className="overflow-hidden rounded-[18px] border border-dashed border-[#1a3530] bg-[rgba(14,37,32,0.18)]">
                  <div className="border-b border-[#1a3530] px-5 py-[18px]">
                    <div className="mb-3 flex items-center">
                      <span className="rounded-[6px] bg-[rgba(255,255,255,0.03)] px-[9px] py-1 text-[10px] font-bold uppercase tracking-[1.2px] text-[rgba(148,168,160,0.55)]">
                        Q{i + 1} · Année suivante
                      </span>
                    </div>
                    {editingQ === `next-${q}` ? (
                      <input
                        value={editingVal}
                        onChange={(e) => setEditingVal(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") commitEdit(); }}
                        className="w-full rounded-[6px] bg-[rgba(255,255,255,0.08)] px-2 py-1.5 text-[14px] font-medium text-[#e8f5ef] outline-none ring-1 ring-[rgba(94,234,212,0.4)] placeholder:text-[#94a8a0]"
                        placeholder="Définir l'objectif du trimestre…"
                        autoFocus
                      />
                    ) : (
                      <button
                        onClick={() => { setEditingQ(`next-${q}`); setEditingVal(nextThemes[q]); }}
                        className="w-full rounded-[8px] border border-dashed border-[#1a3530] px-3 py-2 text-left text-[14px] leading-snug transition-colors hover:border-[rgba(94,234,212,0.3)] hover:bg-[rgba(94,234,212,0.03)]"
                      >
                        <span className={nextThemes[q] ? "font-medium text-[#e8f5ef]" : "text-[rgba(148,168,160,0.45)]"}>
                          {nextThemes[q] || "Cliquer pour définir l'objectif…"}
                        </span>
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 p-5">
                    {(() => {
                      const nextItems = extraPlanItems.filter(
                        (it) => it.quarter === `next-${q}` && !deletedPlanIds.has(it.id),
                      );
                      return nextItems.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-2 text-center">
                          <div className="text-[26px] opacity-[0.12]">+</div>
                          <p className="text-[12px] text-[rgba(148,168,160,0.5)]">Aucun jalon planifié</p>
                        </div>
                      ) : (
                        nextItems.map((it) => (
                          <div key={it.id} className="flex items-center gap-2 rounded-[8px] border border-[#1a3530] bg-[rgba(255,255,255,0.02)] px-2.5 py-2">
                            <span className="shrink-0 text-[14px]">{it.icon}</span>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[12px] font-medium text-[#e8f5ef]">{it.title}</div>
                              {it.meta && <div className="truncate text-[10px] text-[#94a8a0]">{it.meta}</div>}
                            </div>
                            <button
                              type="button"
                              onClick={() => deletePlanItem(it.id)}
                              className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[12px] text-[#94a8a0] transition-colors hover:bg-[rgba(230,170,153,0.15)] hover:text-[#E6AA99]"
                              aria-label="Retirer ce jalon"
                            >
                              ×
                            </button>
                          </div>
                        ))
                      );
                    })()}
                    <div className="mt-1 flex flex-wrap justify-center gap-1.5">
                      {(["🎓 Atelier", "📢 Kit", "📞 Point CSM", "⚡ Custom"] as const).map((chip) => (
                        <button key={chip} onClick={() => openAddPlan(`next-${q}`, CHIP_TYPE_MAP[chip])} className="rounded-full border border-dashed border-[#1a3530] px-[10px] py-[5px] text-[11px] text-[#94a8a0] transition-all hover:border-[#84d4a6] hover:bg-[rgba(132,212,166,0.05)] hover:text-[#84d4a6]">{chip}</button>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>}

        {/* ── Notes ── */}
        {activeSection === "notes" && <section>
          <header className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[20px] font-medium tracking-[-0.3px] text-[#e8f5ef]">Notes &amp; contexte projet</h2>
              <p className="mt-1 text-[13px] text-[#94a8a0]">Notes personnelles sur le compte · uniquement visibles par toi.</p>
            </div>
          </header>
          <div className="grid grid-cols-3 gap-3.5">
            {localNotes.map((note) => <NoteCard key={note.id} note={note} onDelete={() => deleteNote(note.id)} onOpenEdit={() => openEditNote(note)} />)}
            <button onClick={openCreateNote} className="flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[14px] border border-dashed border-[#1a3530] p-4 transition-all hover:border-[#84d4a6] hover:bg-[rgba(132,212,166,0.04)]">
              <div className="grid h-[42px] w-[42px] place-items-center rounded-full border border-[#84d4a6] text-[24px] leading-none text-[#84d4a6]">+</div>
              <div className="text-[13px] font-medium text-[#e8f5ef]">Nouvelle note</div>
              <div className="max-w-[200px] text-center text-[11px] leading-[1.45] text-[#94a8a0]">Réunion, décision, contexte, signal faible…</div>
            </button>
          </div>
        </section>}

        {/* ── Documents ── */}
        {activeSection === "documents" && <section>
          <header className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[20px] font-medium tracking-[-0.3px] text-[#e8f5ef]">Documents partagés</h2>
              <p className="mt-1 text-[13px] text-[#94a8a0]">Visibles par le client dans son espace Suivi projet · {localDocs.length} document{localDocs.length !== 1 ? "s" : ""}</p>
            </div>
          </header>
          <div className="grid grid-cols-3 gap-3.5">
            {localDocs.map((doc) => {
              const pillClass = DOC_TYPE_COLORS[doc.type] ?? "bg-[rgba(255,255,255,0.06)] text-[#e8f5ef]";
              return (
                <article key={doc.id} className="flex flex-col gap-3 rounded-[16px] border border-[#1a3530] bg-[#0e2520] p-5 transition-colors hover:border-[rgba(94,234,212,0.22)]">
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-gradient-to-br from-[#1a3530] to-[#0e2520] text-[20px]">
                      {doc.files && doc.files.length > 0 ? getFileIcon(doc.files[0].mimeType) : "📄"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full px-[9px] py-[3px] text-[10px] font-bold uppercase tracking-[0.8px] ${pillClass}`}>{doc.type}</span>
                        <span className="text-[10px] text-[#94a8a0]">· {doc.size}</span>
                        {doc.files && doc.files.length > 0 && (
                          <span className="rounded-full bg-[rgba(94,234,212,0.10)] px-[7px] py-[2px] text-[10px] font-semibold text-[#5eead4]">
                            {doc.files.length} fichier{doc.files.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <h3 className="text-[13px] font-medium leading-snug text-[#e8f5ef]">{doc.title}</h3>
                      <p className="mt-0.5 text-[11px] text-[#94a8a0]">{doc.author} · {doc.date}</p>
                    </div>
                  </div>
                  {doc.files && doc.files.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {doc.files.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); void openClientFile(f.path, f.name); }}
                          className="inline-flex items-center gap-1.5 rounded-[7px] border border-[rgba(94,234,212,0.15)] bg-[rgba(94,234,212,0.06)] px-2.5 py-1 text-[11px] text-[#5eead4] transition-colors hover:bg-[rgba(94,234,212,0.12)]"
                          title={`Télécharger ${f.name}`}
                        >
                          <span className="text-[13px]">{getFileIcon(f.mimeType)}</span>
                          <span className="max-w-[120px] truncate">{f.name}</span>
                          <span className="opacity-60">↓</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => openDocModal(doc)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-[9px] border border-[#1a3530] px-3 py-[7px] text-[12px] font-medium text-[#e8f5ef] transition-all hover:border-[rgba(94,234,212,0.25)] hover:bg-[#1a2e29]"
                  >
                    ✏ Modifier
                  </button>
                </article>
              );
            })}
            {/* Add doc card */}
            <button
              onClick={() => openDocModal()}
              className="flex min-h-[152px] cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[16px] border border-dashed border-[#1a3530] p-5 transition-all hover:border-[#84d4a6] hover:bg-[rgba(132,212,166,0.04)]"
            >
              <div className="grid h-[42px] w-[42px] place-items-center rounded-full border border-[#84d4a6] text-[22px] leading-none text-[#84d4a6]">+</div>
              <div className="text-[13px] font-medium text-[#e8f5ef]">Ajouter un document</div>
              <div className="max-w-[200px] text-center text-[11px] leading-[1.45] text-[#94a8a0]">Plan, bilan, guide, présentation…</div>
            </button>
          </div>
        </section>}

      </div>
    </div>

    {/* ── Notes CSM slide-over ── */}

    {/* Backdrop */}
    <div
      className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${showNotes ? "opacity-100" : "pointer-events-none opacity-0"}`}
      onClick={() => setShowNotes(false)}
    />

    {/* Panel */}
    <div
      className={`fixed right-0 top-0 z-50 flex h-full w-[500px] flex-col border-l border-[#1a3530] bg-[#08110e] shadow-2xl transition-transform duration-300 ${showNotes ? "translate-x-0" : "translate-x-full"}`}
    >
      {/* Header */}
      <div className="flex shrink-0 items-start justify-between border-b border-[#1a3530] px-6 py-5">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <h2 className="text-[16px] font-semibold text-[#e8f5ef]">Notes CSM</h2>
            <span className="rounded-full bg-[rgba(94,234,212,0.1)] px-2 py-0.5 text-[11px] font-semibold text-[#5eead4]">
              {localNotes.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#94a8a0]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[rgba(94,234,212,0.5)]">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Non visibles par le client
          </div>
        </div>
        <button
          onClick={() => setShowNotes(false)}
          className="grid h-8 w-8 place-items-center rounded-[9px] bg-[rgba(255,255,255,0.05)] text-[18px] leading-none text-[#94a8a0] transition-colors hover:bg-[rgba(255,255,255,0.1)] hover:text-[#e8f5ef]"
        >
          ×
        </button>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {localNotes.length ? (
          <div className="flex flex-col gap-3">
            {localNotes.map((note) => {
              const cfg = NOTE_CONFIG[note.type];
              return (
                <article
                  key={note.id}
                  className={`group rounded-[14px] border p-4 transition-colors ${note.alert ? "border-[rgba(230,170,153,0.30)] bg-[rgba(230,170,153,0.04)]" : "border-[#1a3530] bg-[rgba(14,37,32,0.55)] hover:border-[rgba(94,234,212,0.2)]"}`}
                >
                  <div className="mb-2.5 flex items-center gap-2">
                    <span
                      className="rounded-[5px] px-[9px] py-1 text-[10px] font-bold uppercase tracking-[0.9px]"
                      style={{ backgroundColor: cfg.bg, color: cfg.color }}
                    >
                      {cfg.label}
                    </span>
                    <span className="text-[11px] text-[#94a8a0]">{note.date}</span>
                    <div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button onClick={() => openEditNote(note)} className="rounded-[6px] px-1.5 py-0.5 text-[14px] text-[#94a8a0] transition-colors hover:bg-[#1a3530] hover:text-[#e8f5ef]" aria-label="Modifier">✏</button>
                      <button onClick={() => deleteNote(note.id)} className="rounded-[6px] px-1.5 py-0.5 text-[14px] text-[#94a8a0] transition-colors hover:bg-[rgba(230,170,153,0.1)] hover:text-[#E6AA99]" aria-label="Supprimer">×</button>
                    </div>
                  </div>
                  <p className="text-[13px] leading-[1.6] text-[#e8f5ef]">{note.text}</p>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-3 text-[32px] opacity-25">📝</div>
            <p className="text-[13px] text-[#94a8a0]">Aucune note pour ce compte.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-[#1a3530] p-4">
        <button className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#1a3530] py-3 text-[13px] font-medium text-[#e8f5ef] transition-all hover:border-[#84d4a6] hover:bg-[rgba(132,212,166,0.04)] hover:text-[#84d4a6]">
          + Nouvelle note
        </button>
      </div>
    </div>

    {/* ── Historique slide-over ── */}
    <div
      className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${showHistory ? "opacity-100" : "pointer-events-none opacity-0"}`}
      onClick={() => setShowHistory(false)}
    />
    <div
      className={`fixed right-0 top-0 z-50 flex h-full w-[520px] flex-col border-l border-[#1a3530] bg-[#08110e] shadow-2xl transition-transform duration-300 ${showHistory ? "translate-x-0" : "translate-x-full"}`}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#1a3530] px-6 py-5">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[16px] font-semibold text-[#e8f5ef]">Historique des actions</h2>
          <span className="rounded-full bg-[rgba(94,234,212,0.1)] px-2 py-0.5 text-[11px] font-semibold text-[#5eead4]">
            {detail?.history.length ?? 0}
          </span>
        </div>
        <button
          onClick={() => setShowHistory(false)}
          className="grid h-8 w-8 place-items-center rounded-[9px] bg-[rgba(255,255,255,0.05)] text-[18px] leading-none text-[#94a8a0] transition-colors hover:bg-[rgba(255,255,255,0.1)] hover:text-[#e8f5ef]"
        >
          ×
        </button>
      </div>

      {/* Filter bar */}
      {(() => {
        const filters = [
          { key: "Tout", types: null },
          { key: "Ateliers", types: ["atelier"] },
          { key: "Points CSM", types: ["csm"] },
          { key: "Kits", types: ["kit"] },
          { key: "QBR", types: ["qbr"] },
          { key: "Alertes", types: ["alerte"] },
        ];
        return (
          <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-[#1a3530] px-5 py-3">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setHistoryFilter(f.key)}
                className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${historyFilter === f.key ? "bg-[rgba(94,234,212,0.15)] text-[#5eead4]" : "text-[#94a8a0] hover:text-[#e8f5ef]"}`}
              >
                {f.key}
              </button>
            ))}
          </div>
        );
      })()}

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {(() => {
          if (!detail) return null;
          const typeMap: Record<string, string[]> = {
            "Ateliers": ["atelier"], "Points CSM": ["csm"], "Kits": ["kit"],
            "QBR": ["qbr"], "Alertes": ["alerte"],
          };
          const filtered = historyFilter === "Tout"
            ? [...detail.history].reverse()
            : [...detail.history].reverse().filter((e: HistoryEvent) => typeMap[historyFilter]?.includes(e.type));

          if (!filtered.length) {
            return (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-3 text-[32px] opacity-25">📋</div>
                <p className="text-[13px] text-[#94a8a0]">Aucun événement dans cette catégorie.</p>
              </div>
            );
          }

          return (
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[#1a3530]" />
              <div className="flex flex-col gap-0">
                {filtered.map((event: HistoryEvent) => {
                  const cfg = HISTORY_CONFIG[event.type] ?? HISTORY_CONFIG.csm;
                  return (
                    <div key={event.id} className="relative flex gap-4 pb-5">
                      {/* Dot */}
                      <div className="relative z-10 mt-[3px] flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border-2 border-[#08110e]" style={{ backgroundColor: cfg.dot }}>
                      </div>
                      {/* Content */}
                      <div className="min-w-0 flex-1 rounded-[12px] border border-[#1a3530] bg-[rgba(14,37,32,0.5)] p-3.5">
                        <div className="mb-2 flex items-center gap-2 flex-wrap">
                          <span
                            className="rounded-[5px] px-[8px] py-[3px] text-[10px] font-bold uppercase tracking-[0.8px]"
                            style={{ backgroundColor: cfg.bg, color: cfg.color }}
                          >
                            {cfg.label}
                          </span>
                          <span className="text-[11px] text-[#94a8a0]">{event.date}</span>
                        </div>
                        <p className="text-[13px] font-medium leading-snug text-[#e8f5ef]">{event.title}</p>
                        {event.meta && (
                          <p className="mt-1 text-[11px] leading-[1.5] text-[#94a8a0]">{event.meta}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>
    </div>

    {/* ── Plan item edit modal ── */}
    {editingPlanItem && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-[2px]" onClick={() => setEditingPlanItem(null)}>
        <div className="w-full max-w-[460px] rounded-[18px] border border-[rgba(94,234,212,0.18)] bg-[#061a16] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-[#e8f5ef]">Détail du jalon</h3>
            <button onClick={() => setEditingPlanItem(null)} className="grid h-7 w-7 place-items-center rounded-[8px] bg-[rgba(255,255,255,0.05)] text-[16px] text-[#94a8a0] hover:text-[#e8f5ef]">×</button>
          </div>

          <div className="space-y-4">
            {/* Type */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[rgba(232,245,239,0.5)]">Type</label>
              <div className="flex gap-2">
                {(["atelier", "kit", "csm", "qbr", "custom"] as const).map((t) => {
                  const labels: Record<string, string> = { atelier: "🎓 Atelier", kit: "📢 Kit", csm: "📞 Point CSM", qbr: "📊 QBR", custom: "⚡ Custom" };
                  const s = PLAN_STYLE[t];
                  return (
                    <button
                      key={t}
                      onClick={() => { setEditPlanType(t); setEditPlanIcon(PLAN_ITEM_DEFAULT_ICONS[t]); }}
                      className="flex-1 rounded-[8px] border px-2 py-1.5 text-[11px] font-medium transition-all"
                      style={editPlanType === t
                        ? { borderColor: s.border, backgroundColor: s.hoverBg, color: s.border }
                        : { borderColor: "#1a3530", color: "#94a8a0" }}
                    >
                      {labels[t]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Icon + Titre */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[rgba(232,245,239,0.5)]">Titre</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editPlanIcon}
                  onChange={(e) => setEditPlanIcon(e.target.value)}
                  className="w-[44px] shrink-0 rounded-[9px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-2 py-2.5 text-center text-[15px] outline-none focus:border-[rgba(94,234,212,0.5)]"
                  maxLength={2}
                />
                <input
                  autoFocus
                  type="text"
                  value={editPlanTitle}
                  onChange={(e) => setEditPlanTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && savePlanEdit()}
                  placeholder="Titre du jalon..."
                  className="flex-1 rounded-[9px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] placeholder-[rgba(232,245,239,0.3)] outline-none focus:border-[rgba(94,234,212,0.5)]"
                />
              </div>
            </div>

            {/* Meta */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[rgba(232,245,239,0.5)]">Détails</label>
              <input
                type="text"
                value={editPlanMeta}
                onChange={(e) => setEditPlanMeta(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && savePlanEdit()}
                placeholder="Intervenant · date · nombre de places..."
                className="w-full rounded-[9px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] placeholder-[rgba(232,245,239,0.3)] outline-none focus:border-[rgba(94,234,212,0.5)]"
              />
            </div>

            {/* Month */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[rgba(232,245,239,0.5)]">Mois</label>
              <select
                value={editPlanMonth ?? ""}
                onChange={(e) => setEditPlanMonth(e.target.value === "" ? undefined : Number(e.target.value))}
                className="w-full rounded-[9px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] outline-none focus:border-[rgba(94,234,212,0.5)]"
              >
                <option value="">— Non défini —</option>
                {getPQ(activePlanQ).months.map((m) => (
                  <option key={m.num} value={m.num}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Impact */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[rgba(232,245,239,0.5)]">
                Impact attendu
                <span className="ml-1.5 normal-case font-normal text-[rgba(232,245,239,0.35)]">· visible par le client</span>
              </label>
              <textarea
                value={editPlanImpact}
                onChange={(e) => setEditPlanImpact(e.target.value)}
                placeholder="Décrivez l'impact attendu de cette action pour le client…"
                rows={3}
                className="w-full resize-none rounded-[9px] border border-[rgba(167,139,250,0.25)] bg-[rgba(167,139,250,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] placeholder-[rgba(232,245,239,0.3)] outline-none focus:border-[rgba(167,139,250,0.5)]"
              />
            </div>

            {/* Étiquettes */}
            {clientLabels.length > 0 && (
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[rgba(232,245,239,0.5)]">Étiquettes</label>
                <div className="flex flex-wrap gap-1.5">
                  {clientLabels.map((l) => {
                    const on = editPlanTargets.includes(l.id);
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setEditPlanTargets((prev) => on ? prev.filter((x) => x !== l.id) : [...prev, l.id])}
                        className="rounded-full px-[10px] py-[4px] text-[11px] font-semibold transition-all"
                        style={on
                          ? { background: l.color + "28", color: l.color, border: `1.5px solid ${l.color}55` }
                          : { background: "transparent", color: "#6b7c75", border: "1.5px solid rgba(255,255,255,0.10)" }
                        }
                      >
                        {l.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Thread client ── */}
          <div className="mt-2 border-t border-[#1a2c28] pt-4">
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[1px] text-[rgba(232,245,239,0.5)]">
              Messages du client
            </p>
            <div className="mb-2.5 flex max-h-[200px] flex-col gap-2 overflow-y-auto pr-1">
              {planItemComments.length === 0 && (
                <p className="py-3 text-center text-[11px] italic text-[#6b7c75]">Aucun message pour cette action.</p>
              )}
              {planItemComments.map((c) => {
                const isCsm = c.author === "csm";
                const d = new Date(c.date);
                const dateLabel = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) + " · " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={c.id} className={`flex flex-col gap-0.5 ${isCsm ? "items-end" : "items-start"}`}>
                    <span className="px-1 text-[10px] text-[#6b7c75]">
                      {isCsm ? "Vous (CSM)" : "Client"} · {dateLabel}
                    </span>
                    <div className={`max-w-[85%] rounded-[10px] px-3 py-2 text-[12px] leading-snug ${
                      isCsm
                        ? "rounded-br-[3px] bg-[rgba(94,234,212,0.12)] text-[#e8f5ef]"
                        : "rounded-bl-[3px] bg-[rgba(255,255,255,0.06)] text-[#e8f5ef]"
                    }`}>
                      {c.text}
                    </div>
                  </div>
                );
              })}
              <div ref={commentBottomRef} />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && commentDraft.trim()) {
                    commentsStore.add(String(editingPlanItem.id), id, "csm", commentDraft.trim());
                    setCommentDraft("");
                  }
                }}
                placeholder="Répondre au client…"
                className="flex-1 rounded-[8px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-[12px] text-[#e8f5ef] placeholder-[rgba(232,245,239,0.3)] outline-none focus:border-[rgba(94,234,212,0.4)]"
              />
              <button
                onClick={() => {
                  if (!commentDraft.trim()) return;
                  commentsStore.add(String(editingPlanItem.id), id, "csm", commentDraft.trim());
                  setCommentDraft("");
                }}
                disabled={!commentDraft.trim()}
                className="rounded-[8px] bg-[rgba(94,234,212,0.12)] px-3 py-2 text-[12px] font-semibold text-[#5eead4] transition-colors hover:bg-[rgba(94,234,212,0.2)] disabled:opacity-30"
              >
                Envoyer
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-5 flex items-center border-t border-[#1a2c28] pt-4">
            <button
              onClick={() => deletePlanItem(editingPlanItem.id)}
              className="rounded-[9px] border border-[rgba(230,170,153,0.3)] px-3 py-2 text-[12px] font-medium text-[#E6AA99] transition-all hover:bg-[rgba(230,170,153,0.08)]"
            >
              Supprimer
            </button>
            <div className="ml-auto flex gap-2">
              <button onClick={() => setEditingPlanItem(null)} className="rounded-[9px] px-4 py-2 text-[12px] text-[rgba(232,245,239,0.5)] hover:text-[#e8f5ef]">
                Annuler
              </button>
              <button
                onClick={savePlanEdit}
                disabled={!editPlanTitle.trim()}
                className="rounded-[9px] bg-[rgba(94,234,212,0.9)] px-4 py-2 text-[12px] font-semibold text-[#061a16] transition-colors hover:bg-[#5eead4] disabled:opacity-40"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* ── Nouvelle action modal ── */}
    {showNewAction && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-[2px]" onClick={() => setShowNewAction(false)}>
        <div className="w-full max-w-[440px] rounded-[18px] border border-[rgba(94,234,212,0.18)] bg-[#061a16] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-semibold text-[#e8f5ef]">Nouvelle action prioritaire</h3>
              <p className="mt-0.5 text-[11px] text-[#94a8a0]">
                Sera aussi visible dans vos tâches sur la homepage · {client?.name}
              </p>
            </div>
            <button onClick={() => setShowNewAction(false)} className="grid h-7 w-7 place-items-center rounded-[8px] bg-[rgba(255,255,255,0.05)] text-[16px] text-[#94a8a0] hover:text-[#e8f5ef]">×</button>
          </div>

          <div className="space-y-4">
            {/* Description */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[rgba(232,245,239,0.5)]">Action *</label>
              <input
                autoFocus
                type="text"
                value={newActionTitle}
                onChange={(e) => setNewActionTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateAction()}
                placeholder="Ex : Préparer le bilan Q2 pour Marion..."
                className="w-full rounded-[9px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] placeholder-[rgba(232,245,239,0.3)] outline-none focus:border-[rgba(94,234,212,0.5)]"
              />
            </div>

            {/* Échéance */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[rgba(232,245,239,0.5)]">Échéance</label>
              <input
                type="date"
                value={newActionDue}
                onChange={(e) => setNewActionDue(e.target.value)}
                style={{ colorScheme: "dark" }}
                className="w-full rounded-[9px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] outline-none focus:border-[rgba(94,234,212,0.5)]"
              />
            </div>

            {/* Priorité */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[rgba(232,245,239,0.5)]">Priorité</label>
              <div className="grid grid-cols-3 gap-2">
                {(["normal", "warn", "late"] as const).map((s) => {
                  const labels = { normal: "Normal", warn: "Cette semaine", late: "En retard" };
                  const colors = {
                    normal: { active: "border-[rgba(94,234,212,0.4)] bg-[rgba(94,234,212,0.1)] text-[#5eead4]", inactive: "border-[#1a3530] text-[#94a8a0]" },
                    warn:   { active: "border-[rgba(253,224,71,0.4)] bg-[rgba(253,224,71,0.08)] text-[#fde047]", inactive: "border-[#1a3530] text-[#94a8a0]" },
                    late:   { active: "border-[rgba(230,170,153,0.4)] bg-[rgba(230,170,153,0.08)] text-[#E6AA99]", inactive: "border-[#1a3530] text-[#94a8a0]" },
                  };
                  return (
                    <button
                      key={s}
                      onClick={() => setNewActionStatus(s)}
                      className={`rounded-[8px] border px-2 py-2 text-[11px] font-semibold transition-all ${newActionStatus === s ? colors[s].active : colors[s].inactive}`}
                    >
                      {labels[s]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end gap-2">
            <button onClick={() => setShowNewAction(false)} className="rounded-[9px] px-4 py-2 text-[12px] text-[rgba(232,245,239,0.5)] hover:text-[#e8f5ef]">
              Annuler
            </button>
            <button
              onClick={handleCreateAction}
              disabled={!newActionTitle.trim()}
              className="rounded-[9px] bg-[rgba(94,234,212,0.9)] px-4 py-2 text-[12px] font-semibold text-[#061a16] transition-colors hover:bg-[#5eead4] disabled:opacity-40"
            >
              Créer l&apos;action
            </button>
          </div>
        </div>
      </div>
    )}
    {/* ── Edit client details modal ── */}
    {showEditDetails && editDraft && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-[2px]" onClick={() => setShowEditDetails(false)}>
        <div className="w-full max-w-[620px] rounded-[20px] border border-[rgba(94,234,212,0.18)] bg-[#061a16] shadow-2xl" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#1a3530] px-6 py-4">
            <h3 className="text-[15px] font-semibold text-[#e8f5ef]">Modifier les détails — {client.name}</h3>
            <button onClick={() => setShowEditDetails(false)} className="grid h-7 w-7 place-items-center rounded-[8px] bg-[rgba(255,255,255,0.05)] text-[16px] text-[#94a8a0] hover:text-[#e8f5ef]">×</button>
          </div>

          {/* Body */}
          <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-5">

            {/* CSM en charge */}
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[1px] text-[#94a8a0]">CSM en charge</p>
              <select
                value={editDraft.ownerCsmId ?? ""}
                onChange={(e) => setEditDraft((d) => d && { ...d, ownerCsmId: e.target.value || null })}
                className="w-full rounded-[9px] border border-[rgba(255,255,255,0.1)] bg-[#0e2520] px-3 py-2.5 text-[13px] text-[#e8f5ef] outline-none focus:border-[rgba(94,234,212,0.5)]"
              >
                <option value="">— Non assigné —</option>
                {csmProfiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
            </div>

            {/* Formule */}
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[1px] text-[#94a8a0]">Formule</p>
              <div className="flex flex-wrap gap-2">
                {(["holistique", "digital + tokens", "digital only"] as ContractFormule[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setEditDraft((d) => d && { ...d, formule: f })}
                    className="rounded-full border px-4 py-1.5 text-[12px] font-semibold transition-all"
                    style={editDraft.formule === f
                      ? { backgroundColor: FORMULE_STYLE[f].bg, color: FORMULE_STYLE[f].color, borderColor: FORMULE_STYLE[f].color }
                      : { borderColor: "#1a3530", color: "#94a8a0" }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Chiffres clés */}
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[1px] text-[#94a8a0]">Chiffres clés</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ["Collaborateurs", "collab"],
                  ["ARR (€)", "arr"],
                  ["Ateliers au contrat (total)", "atelierTotal"],
                  ["Ateliers restants", "atelierRemaining"],
                ] as [string, keyof LocalDetail][]).map(([label, key]) => (
                  <div key={key}>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.8px] text-[rgba(232,245,239,0.45)]">{label}</label>
                    <input
                      type="number"
                      min={0}
                      value={editDraft[key] as number}
                      onChange={(e) => setEditDraft((d) => d && { ...d, [key]: Number(e.target.value) })}
                      className="w-full rounded-[9px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] outline-none focus:border-[rgba(94,234,212,0.5)]"
                    />
                  </div>
                ))}
                {editDraft.formule === "holistique" && (
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.8px] text-[rgba(232,245,239,0.45)]">RDV / collaborateur</label>
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={editDraft.rdvParCollab}
                      onChange={(e) => setEditDraft((d) => d && { ...d, rdvParCollab: Number(e.target.value) })}
                      className="w-full rounded-[9px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] outline-none focus:border-[rgba(94,234,212,0.5)]"
                    />
                  </div>
                )}
                {editDraft.formule === "digital + tokens" && (
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.8px] text-[rgba(232,245,239,0.45)]">Nombre de tokens</label>
                    <input
                      type="number"
                      min={0}
                      value={editDraft.nombreTokens}
                      onChange={(e) => setEditDraft((d) => d && { ...d, nombreTokens: Number(e.target.value) })}
                      className="w-full rounded-[9px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] outline-none focus:border-[rgba(94,234,212,0.5)]"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Dates */}
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[1px] text-[#94a8a0]">Dates</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ["Début de contrat", "contractStart"],
                  ["Fin de contrat", "contractEnd"],
                  ["Churn notice", "churnNotice"],
                ] as [string, keyof LocalDetail][]).map(([label, key]) => (
                  <div key={key}>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.8px] text-[rgba(232,245,239,0.45)]">{label}</label>
                    <input
                      type="date"
                      value={editDraft[key] as string}
                      onChange={(e) => setEditDraft((d) => d && { ...d, [key]: e.target.value })}
                      style={{ colorScheme: "dark" }}
                      className="w-full rounded-[9px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] outline-none focus:border-[rgba(94,234,212,0.5)]"
                    />
                  </div>
                ))}
                {([
                  ["Dernier événement CSM", "dernierPoint"],
                ] as [string, keyof LocalDetail][]).map(([label, key]) => (
                  <div key={key}>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.8px] text-[rgba(232,245,239,0.45)]">{label}</label>
                    <input
                      type="text"
                      value={editDraft[key] as string}
                      onChange={(e) => setEditDraft((d) => d && { ...d, [key]: e.target.value })}
                      placeholder="Ex : 15 juin 2026"
                      className="w-full rounded-[9px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] placeholder-[rgba(232,245,239,0.25)] outline-none focus:border-[rgba(94,234,212,0.5)]"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Produits déployés */}
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[1px] text-[#94a8a0]">Produits déployés</p>
              <div className="flex flex-wrap gap-2">
                {(["Joy", "Dashboard RH", "Pulse", "Call d'orientation", "Ligne d'écoute", "Assistante sociale"] as ProduitTeale[]).map((p) => {
                  const active = editDraft.produits.includes(p);
                  return (
                    <button
                      key={p}
                      onClick={() => setEditDraft((d) => {
                        if (!d) return d;
                        const produits = d.produits.includes(p) ? d.produits.filter((x) => x !== p) : [...d.produits, p];
                        return { ...d, produits };
                      })}
                      className="rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all"
                      style={active
                        ? { backgroundColor: PRODUIT_STYLE[p].bg, color: PRODUIT_STYLE[p].color, borderColor: PRODUIT_STYLE[p].color }
                        : { borderColor: "#1a3530", color: "#94a8a0" }}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Error */}
          {editError && (
            <div className="mx-6 mb-1 rounded-[8px] bg-[rgba(239,68,68,0.1)] px-3 py-2 text-[12px] text-[#fca5a5]">
              {editError}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[#1a3530] px-6 py-4">
            <button
              onClick={() => { setEditError(""); setShowDeleteConfirm(true); }}
              className="rounded-[9px] px-3 py-2 text-[12px] font-medium text-[#fca5a5] transition-colors hover:bg-[rgba(239,68,68,0.1)]"
            >
              Supprimer ce client
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowEditDetails(false)} className="rounded-[9px] px-4 py-2 text-[12px] text-[rgba(232,245,239,0.5)] hover:text-[#e8f5ef]">
                Annuler
              </button>
              <button
                onClick={async () => {
                  setEditError("");
                  const base = storedClient ?? csmClientsStore.get(id);
                  if (!base) {
                    setEditError("Client non chargé — rechargez la page puis réessayez.");
                    return;
                  }
                  try {
                    const { error } = await csmClientsStore.add({
                      ...base,
                      collab: editDraft.collab,
                      arr: editDraft.arr,
                      formule: editDraft.formule,
                      atelierTotal: editDraft.atelierTotal,
                      rdvParCollab: editDraft.rdvParCollab,
                      contractStart: editDraft.contractStart,
                      contractEnd: editDraft.contractEnd,
                      churnNotice: editDraft.churnNotice,
                      produits: editDraft.produits,
                      ownerCsmId: editDraft.ownerCsmId,
                    });
                    if (error) {
                      setEditError(`Échec de l'enregistrement : ${error}`);
                      return;
                    }
                    setLocalDetail(editDraft);
                    setShowEditDetails(false);
                  } catch (e) {
                    setEditError(
                      `Erreur : ${e instanceof Error ? e.message : String(e)}`,
                    );
                  }
                }}
                className="rounded-[9px] bg-[rgba(94,234,212,0.9)] px-5 py-2 text-[12px] font-semibold text-[#061a16] transition-colors hover:bg-[#5eead4]"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* ── Delete client confirmation ── */}
    {showDeleteConfirm && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-[2px]" onClick={() => !deleting && setShowDeleteConfirm(false)}>
        <div className="w-full max-w-[400px] rounded-[18px] border border-[rgba(239,68,68,0.25)] bg-[#061a16] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-[15px] font-semibold text-[#e8f5ef]">Supprimer {client.name} ?</h3>
          <p className="mt-2 text-[12px] leading-relaxed text-[#94a8a0]">
            Cette action est définitive. Le client et toutes ses données (plan, événements, documents, alertes) seront supprimés.
          </p>
          {editError && (
            <div className="mt-3 rounded-[8px] bg-[rgba(239,68,68,0.1)] px-3 py-2 text-[12px] text-[#fca5a5]">
              {editError}
            </div>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
              className="rounded-[9px] px-4 py-2 text-[12px] text-[rgba(232,245,239,0.5)] hover:text-[#e8f5ef] disabled:opacity-40"
            >
              Annuler
            </button>
            <button
              onClick={async () => {
                setEditError("");
                setDeleting(true);
                const { error } = await csmClientsStore.remove(id);
                setDeleting(false);
                if (error) {
                  setEditError(`Suppression impossible : ${error}`);
                  return;
                }
                router.push("/csm/suivi-clients");
              }}
              disabled={deleting}
              className="rounded-[9px] bg-[#ef4444] px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#dc2626] disabled:opacity-40"
            >
              {deleting ? "Suppression…" : "Supprimer définitivement"}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Health update modal ── */}
    {showHealthModal && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-[2px]" onClick={() => setShowHealthModal(false)}>
        <div className="w-full max-w-[400px] rounded-[18px] border border-[rgba(168,232,149,0.18)] bg-[#061a16] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-[#e8f5ef]">Mettre à jour l&apos;état de santé</h3>
            <button onClick={() => setShowHealthModal(false)} className="text-[18px] leading-none text-[#94a8a0] hover:text-[#e8f5ef]">×</button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[1px] text-[#94a8a0]">Statut</label>
              <div className="flex gap-2">
                {(["SAIN", "VIGILANCE", "À RISQUE"] as HealthStatut[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setHealthStatut(s)}
                    className="flex-1 rounded-[9px] border py-2 text-[12px] font-semibold transition-all"
                    style={healthStatut === s
                      ? { backgroundColor: STATUT_CONFIG[s].bg, borderColor: STATUT_CONFIG[s].dot + "80", color: STATUT_CONFIG[s].color }
                      : { borderColor: "rgba(255,255,255,0.08)", color: "#6b7c75" }}
                  >
                    {STATUT_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[#94a8a0]">Date</label>
              <input type="date" value={healthDate} onChange={(e) => setHealthDate(e.target.value)}
                style={{ colorScheme: "dark" }}
                className="w-full rounded-[9px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] outline-none focus:border-[rgba(168,232,149,0.4)]" />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[#94a8a0]">Note <span className="normal-case font-normal text-[#6b7c75]">(optionnel)</span></label>
              <textarea value={healthNote} onChange={(e) => setHealthNote(e.target.value)}
                autoFocus
                placeholder="Ex : QBR T3 — engagement en hausse, objectifs atteints…"
                rows={3}
                className="w-full resize-none rounded-[9px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] placeholder-[rgba(232,245,239,0.25)] outline-none focus:border-[rgba(168,232,149,0.4)]" />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setShowHealthModal(false)} className="rounded-[9px] px-4 py-2 text-[12px] text-[#94a8a0] hover:text-[#e8f5ef]">Annuler</button>
            <button onClick={submitHealthEntry} disabled={!healthDate}
              className="rounded-[9px] bg-[rgba(168,232,149,0.2)] px-4 py-2 text-[12px] font-semibold text-[#a8e895] transition hover:bg-[rgba(168,232,149,0.3)] disabled:opacity-40">
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Note create/edit modal ── */}
    {noteModal && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-[2px]" onClick={() => setNoteModal(null)}>
        <div className="w-full max-w-[460px] rounded-[18px] border border-[rgba(94,234,212,0.18)] bg-[#061a16] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-[#e8f5ef]">{noteModal.mode === "create" ? "Nouvelle note" : "Modifier la note"}</h3>
            <button onClick={() => setNoteModal(null)} className="text-[18px] leading-none text-[#94a8a0] hover:text-[#e8f5ef]">×</button>
          </div>
          <div className="space-y-4">
            {/* Type / Titre */}
            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[1px] text-[#94a8a0]">Type</label>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(NOTE_CONFIG) as [import("@/lib/clients-data").NoteType, typeof NOTE_CONFIG[string]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setNoteDraft((d) => ({ ...d, type: key }))}
                    className="rounded-[6px] px-[10px] py-[5px] text-[11px] font-bold uppercase tracking-[0.7px] transition-all"
                    style={noteDraft.type === key
                      ? { backgroundColor: cfg.bg, color: cfg.color, outline: `1.5px solid ${cfg.color}` }
                      : { backgroundColor: "rgba(255,255,255,0.04)", color: "#94a8a0" }}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Date */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[#94a8a0]">Date</label>
              <input
                type="date"
                value={noteDraft.date}
                onChange={(e) => setNoteDraft((d) => ({ ...d, date: e.target.value }))}
                style={{ colorScheme: "dark" }}
                className="w-full rounded-[9px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] outline-none focus:border-[rgba(94,234,212,0.5)]"
              />
            </div>
            {/* Contenu */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[#94a8a0]">Contenu</label>
              <textarea
                autoFocus
                value={noteDraft.text}
                onChange={(e) => setNoteDraft((d) => ({ ...d, text: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) saveNote(); }}
                rows={5}
                placeholder="Contexte, décision, signal faible…"
                className="w-full resize-none rounded-[9px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] placeholder-[rgba(232,245,239,0.25)] outline-none focus:border-[rgba(94,234,212,0.5)]"
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setNoteModal(null)} className="rounded-[9px] px-4 py-2 text-[12px] text-[#94a8a0] hover:text-[#e8f5ef]">Annuler</button>
            <button onClick={saveNote} disabled={!noteDraft.text.trim()} className="rounded-[9px] bg-[rgba(94,234,212,0.9)] px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#5eead4] disabled:opacity-40">
              {noteModal.mode === "create" ? "Créer" : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Document add/edit modal ── */}
    {showDocModal && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-[2px]" onClick={() => setShowDocModal(false)}>
        <div className="w-full max-w-[460px] rounded-[18px] border border-[rgba(94,234,212,0.18)] bg-[#061a16] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-[#e8f5ef]">{editingDoc ? "Modifier le document" : "Ajouter un document"}</h3>
            <button onClick={() => setShowDocModal(false)} className="grid h-7 w-7 place-items-center rounded-[8px] bg-[rgba(255,255,255,0.05)] text-[16px] text-[#94a8a0] hover:text-[#e8f5ef]">×</button>
          </div>

          <div className="space-y-3.5">
            {/* Type */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[rgba(232,245,239,0.5)]">Type</label>
              <div className="flex flex-wrap gap-1.5">
                {(["Stratégie", "QBR", "Bilan", "Guide", "Rapport", "Présentation"] as const).map((t) => {
                  const pill = DOC_TYPE_COLORS[t] ?? "";
                  return (
                    <button
                      key={t}
                      onClick={() => setDocType(t)}
                      className={`rounded-full border px-[11px] py-1 text-[11px] font-medium transition-all ${docType === t ? `border-transparent ${pill}` : "border-[#1a3530] text-[#94a8a0] hover:text-[#e8f5ef]"}`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Titre */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[rgba(232,245,239,0.5)]">Titre *</label>
              <input
                autoFocus
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveDoc()}
                placeholder="Ex : Bilan trimestriel Q2…"
                className="w-full rounded-[9px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] placeholder-[rgba(232,245,239,0.3)] outline-none focus:border-[rgba(94,234,212,0.5)]"
              />
            </div>

            {/* Size + Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[rgba(232,245,239,0.5)]">Taille</label>
                <input
                  type="text"
                  value={docSize}
                  onChange={(e) => setDocSize(e.target.value)}
                  placeholder="Ex : 2,4 Mo"
                  className="w-full rounded-[9px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] placeholder-[rgba(232,245,239,0.3)] outline-none focus:border-[rgba(94,234,212,0.5)]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[rgba(232,245,239,0.5)]">Date</label>
                <input
                  type="date"
                  value={docDate}
                  onChange={(e) => setDocDate(e.target.value)}
                  style={{ colorScheme: "dark" }}
                  className="w-full rounded-[9px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] outline-none focus:border-[rgba(94,234,212,0.5)]"
                />
              </div>
            </div>

            {/* Auteur */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[rgba(232,245,239,0.5)]">Auteur</label>
              <input
                type="text"
                value={docAuthor}
                onChange={(e) => setDocAuthor(e.target.value)}
                placeholder="Ex : Lucie Martin, CSM"
                className="w-full rounded-[9px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] placeholder-[rgba(232,245,239,0.3)] outline-none focus:border-[rgba(94,234,212,0.5)]"
              />
            </div>

            {/* File upload */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[rgba(232,245,239,0.5)]">
                Fichiers joints {docFiles.length > 0 && <span className="normal-case text-[#5eead4]">· {docFiles.length} fichier{docFiles.length > 1 ? "s" : ""}</span>}
              </label>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFileSelect(e.dataTransfer.files); }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex min-h-[76px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[10px] border transition-all ${isDragOver ? "border-[#5eead4] bg-[rgba(94,234,212,0.06)]" : "border-dashed border-[rgba(255,255,255,0.12)] hover:border-[rgba(94,234,212,0.35)] hover:bg-[rgba(94,234,212,0.03)]"}`}
              >
                <span className="text-[18px]">📎</span>
                <span className="text-[12px] text-[#94a8a0]">Glisser-déposer ou <span className="text-[#5eead4]">parcourir</span></span>
                <span className="text-[11px] text-[#94a8a0]/60">PDF, images, Word, Excel, PowerPoint…</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              />
              {uploadError && (
                <p className="mt-2 rounded-[8px] bg-[rgba(239,68,68,0.1)] px-3 py-2 text-[11px] text-[#fca5a5]">
                  {uploadError}
                </p>
              )}
              {docFiles.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {docFiles.map((f) => (
                    <div key={f.id} className="flex items-center gap-2.5 rounded-[8px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-3 py-2">
                      <span className="text-[15px] shrink-0">{getFileIcon(f.mimeType)}</span>
                      <span className="min-w-0 flex-1 truncate text-[12px] text-[#e8f5ef]">{f.name}</span>
                      <span className="shrink-0 text-[11px] text-[#94a8a0]">{f.sizeLabel}</span>
                      <button
                        type="button"
                        onClick={() => removeDocFile(f.id)}
                        className="shrink-0 grid h-5 w-5 place-items-center rounded-full text-[13px] text-[#94a8a0] transition-colors hover:bg-[rgba(230,170,153,0.15)] hover:text-[#E6AA99]"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center">
            {editingDoc && (
              <button
                onClick={() => deleteDoc(editingDoc.id)}
                className="rounded-[9px] border border-[rgba(230,170,153,0.3)] px-3 py-2 text-[12px] font-medium text-[#E6AA99] transition-all hover:bg-[rgba(230,170,153,0.08)]"
              >
                Supprimer
              </button>
            )}
            <div className="ml-auto flex gap-2">
              <button onClick={() => setShowDocModal(false)} className="rounded-[9px] px-4 py-2 text-[12px] text-[rgba(232,245,239,0.5)] hover:text-[#e8f5ef]">
                Annuler
              </button>
              <button
                onClick={saveDoc}
                disabled={!docTitle.trim()}
                className="rounded-[9px] bg-[rgba(94,234,212,0.9)] px-4 py-2 text-[12px] font-semibold text-[#061a16] transition-colors hover:bg-[#5eead4] disabled:opacity-40"
              >
                {editingDoc ? "Enregistrer" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* ── Add from catalog modal ── */}
    {addPlanCtx && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-[2px]" onClick={() => setAddPlanCtx(null)}>
        <div className="w-full max-w-[640px] rounded-[20px] border border-[rgba(94,234,212,0.18)] bg-[#061a16] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h3 className="text-[15px] font-semibold text-[#e8f5ef]">
                {addPlanCtx.type === "atelier" ? "🎓 Ajouter un atelier"
                  : addPlanCtx.type === "kit" ? "📢 Ajouter un kit de communication"
                  : addPlanCtx.type === "csm" ? "📞 Nouveau point CSM"
                  : "⚡ Nouvel élément custom"}
              </h3>
              <p className="mt-0.5 text-[11px] text-[#94a8a0]">
                {({ q1: "En cours", q2: "À venir", q3: "À venir", q4: "À planifier", "next-q1": "Année suivante · Trim. 1", "next-q2": "Année suivante · Trim. 2", "next-q3": "Année suivante · Trim. 3", "next-q4": "Année suivante · Trim. 4" } as Record<string, string>)[addPlanCtx.quarter] ?? addPlanCtx.quarter}
              </p>
            </div>
            <button onClick={() => setAddPlanCtx(null)} className="grid h-7 w-7 place-items-center rounded-[8px] bg-[rgba(255,255,255,0.05)] text-[16px] text-[#94a8a0] hover:text-[#e8f5ef]">×</button>
          </div>

          {hasCatalog ? (
            <div className="space-y-3">
              {/* Search */}
              <input
                autoFocus
                type="text"
                value={addPlanSearch}
                onChange={(e) => setAddPlanSearch(e.target.value)}
                placeholder={addPlanCtx.type === "atelier" ? "Rechercher un atelier…" : "Rechercher un kit…"}
                className="w-full rounded-[10px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] placeholder-[rgba(232,245,239,0.3)] outline-none focus:border-[rgba(94,234,212,0.5)]"
              />

              {/* Category pills */}
              <div className="flex flex-wrap gap-1.5">
                {catalogCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setAddPlanCatFilter(cat)}
                    className={`rounded-full px-[11px] py-1 text-[11px] font-medium transition-all ${addPlanCatFilter === cat ? "bg-[rgba(94,234,212,0.15)] text-[#5eead4]" : "border border-[#1a3530] text-[#94a8a0] hover:text-[#e8f5ef]"}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Items grid */}
              <div className="grid max-h-[280px] grid-cols-2 gap-2 overflow-y-auto pr-1">
                {filteredCatalogItems.length === 0 ? (
                  <div className="col-span-2 py-8 text-center text-[13px] text-[#94a8a0]">Aucun résultat</div>
                ) : filteredCatalogItems.map((item) => {
                  const isSelected = selectedCatalogId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedCatalogId(item.id)}
                      className={`flex items-start gap-3 rounded-[12px] border p-3 text-left transition-all ${isSelected ? "border-[rgba(94,234,212,0.45)] bg-[rgba(94,234,212,0.07)]" : "border-[#1a3530] bg-[rgba(14,37,32,0.5)] hover:border-[rgba(94,234,212,0.2)]"}`}
                    >
                      <span className="mt-0.5 shrink-0 text-[18px]">{item.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className={`text-[13px] font-medium leading-snug ${isSelected ? "text-[#5eead4]" : "text-[#e8f5ef]"}`}>{item.title}</div>
                        <div className="mt-0.5 line-clamp-2 text-[11px] leading-[1.4] text-[#94a8a0]">{item.description}</div>
                        {(item.duration || item.category) && (
                          <div className="mt-1 text-[10px] text-[rgba(148,168,160,0.65)]">
                            {[item.duration, item.category].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </div>
                      {isSelected && <span className="ml-auto shrink-0 text-[12px] font-bold text-[#5eead4]">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Title */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[rgba(232,245,239,0.5)]">Titre *</label>
                <input
                  autoFocus
                  type="text"
                  value={addPlanCustomTitle}
                  onChange={(e) => setAddPlanCustomTitle(e.target.value)}
                  placeholder={addPlanCtx.type === "csm" ? "Ex : Point CSM mensuel…" : "Ex : Webinar bien-être…"}
                  className="w-full rounded-[10px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] placeholder-[rgba(232,245,239,0.3)] outline-none focus:border-[rgba(94,234,212,0.5)]"
                />
              </div>

              {/* Date + Time (CSM) or Date + Responsable (custom) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[rgba(232,245,239,0.5)]">Date {addPlanCtx.type === "csm" ? "*" : "(optionnel)"}</label>
                  <input
                    type="date"
                    value={addPlanDate}
                    onChange={(e) => setAddPlanDate(e.target.value)}
                    style={{ colorScheme: "dark" }}
                    className="w-full rounded-[10px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] outline-none focus:border-[rgba(94,234,212,0.5)]"
                  />
                </div>
                {addPlanCtx.type === "csm" ? (
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[rgba(232,245,239,0.5)]">Heure *</label>
                    <input
                      type="time"
                      value={addPlanTime}
                      onChange={(e) => setAddPlanTime(e.target.value)}
                      style={{ colorScheme: "dark" }}
                      className="w-full rounded-[10px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] outline-none focus:border-[rgba(94,234,212,0.5)]"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[rgba(232,245,239,0.5)]">Responsable</label>
                    <input
                      type="text"
                      value={addPlanResponsable}
                      onChange={(e) => setAddPlanResponsable(e.target.value)}
                      placeholder="Ex : Lucie Martin"
                      className="w-full rounded-[10px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] placeholder-[rgba(232,245,239,0.3)] outline-none focus:border-[rgba(94,234,212,0.5)]"
                    />
                  </div>
                )}
              </div>

              {/* Responsable (CSM only — separate row) */}
              {addPlanCtx.type === "csm" && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[rgba(232,245,239,0.5)]">Responsable</label>
                  <input
                    type="text"
                    value={addPlanResponsable}
                    onChange={(e) => setAddPlanResponsable(e.target.value)}
                    placeholder="Ex : Lucie Martin"
                    className="w-full rounded-[10px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] placeholder-[rgba(232,245,239,0.3)] outline-none focus:border-[rgba(94,234,212,0.5)]"
                  />
                </div>
              )}

              {/* Détail */}
              {addPlanCtx.type === "custom" && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[rgba(232,245,239,0.5)]">Détail</label>
                  <textarea
                    rows={3}
                    value={addPlanDetail}
                    onChange={(e) => setAddPlanDetail(e.target.value)}
                    placeholder="Contexte, objectifs, notes…"
                    className="w-full resize-none rounded-[10px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] placeholder-[rgba(232,245,239,0.3)] outline-none focus:border-[rgba(94,234,212,0.5)]"
                  />
                </div>
              )}

              {/* File upload */}
              {addPlanCtx.type === "custom" && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[rgba(232,245,239,0.5)]">Fichiers joints</label>
                  <div
                    className="flex flex-col items-center justify-center rounded-[10px] border border-dashed px-4 py-4 text-center transition-all"
                    style={{
                      borderColor: isPlanFileDragOver ? "#5eead4" : "rgba(255,255,255,0.12)",
                      background: isPlanFileDragOver ? "rgba(94,234,212,0.05)" : "rgba(255,255,255,0.02)",
                    }}
                    onDragOver={(e) => { e.preventDefault(); setIsPlanFileDragOver(true); }}
                    onDragLeave={() => setIsPlanFileDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setIsPlanFileDragOver(false); handlePlanFileSelect(e.dataTransfer.files); }}
                  >
                    {addPlanCustomFiles.length === 0 ? (
                      <>
                        <p className="text-[12px] text-[#94a8a0]">Glisse des fichiers ici ou</p>
                        <button
                          type="button"
                          onClick={() => planFileInputRef.current?.click()}
                          className="mt-1 text-[12px] font-medium text-[#5eead4] hover:underline"
                        >
                          parcourir
                        </button>
                      </>
                    ) : (
                      <div className="w-full space-y-1.5">
                        {addPlanCustomFiles.map((f) => (
                          <div key={f.id} className="flex items-center justify-between rounded-[8px] px-3 py-1.5" style={{ background: "rgba(220,237,99,0.07)" }}>
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="text-sm">{getFileIcon(f.mimeType)}</span>
                              <span className="truncate text-[12px] text-[#e8f5ef]">{f.name}</span>
                              <span className="shrink-0 text-[11px] text-[#94a8a0]">{f.sizeLabel}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAddPlanCustomFiles((prev) => prev.filter((x) => x.id !== f.id))}
                              className="ml-2 shrink-0 text-[14px] text-[#94a8a0] hover:text-[#e8f5ef]"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => planFileInputRef.current?.click()}
                          className="mt-1 text-[11px] text-[#5eead4] hover:underline"
                        >
                          + Ajouter d&apos;autres fichiers
                        </button>
                      </div>
                    )}
                    <input ref={planFileInputRef} type="file" multiple className="hidden" onChange={(e) => e.target.files && handlePlanFileSelect(e.target.files)} />
                    {uploadError && (
                      <p className="mt-2 rounded-[8px] bg-[rgba(239,68,68,0.1)] px-3 py-2 text-[11px] text-[#fca5a5]">
                        {uploadError}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Date / Heure fields for catalog types */}
          {hasCatalog && (
            <div className={`mt-4 ${addPlanCtx?.type === "atelier" ? "grid grid-cols-2 gap-3" : ""}`}>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[rgba(232,245,239,0.5)]">
                  Date {addPlanCtx?.type === "atelier" ? "*" : "(optionnel)"}
                </label>
                <input
                  type="date"
                  value={addPlanDate}
                  onChange={(e) => setAddPlanDate(e.target.value)}
                  style={{ colorScheme: "dark" }}
                  className="w-full rounded-[10px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] outline-none focus:border-[rgba(94,234,212,0.5)]"
                />
              </div>
              {addPlanCtx?.type === "atelier" && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[rgba(232,245,239,0.5)]">Heure *</label>
                  <input
                    type="time"
                    value={addPlanTime}
                    onChange={(e) => setAddPlanTime(e.target.value)}
                    style={{ colorScheme: "dark" }}
                    className="w-full rounded-[10px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] outline-none focus:border-[rgba(94,234,212,0.5)]"
                  />
                </div>
              )}
            </div>
          )}

          {/* Étiquettes */}
          {clientLabels.length > 0 && (
            <div className="mt-4">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[rgba(232,245,239,0.5)]">Étiquettes</label>
              <div className="flex flex-wrap gap-1.5">
                {clientLabels.map((l) => {
                  const on = addPlanTargets.includes(l.id);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setAddPlanTargets((prev) => on ? prev.filter((x) => x !== l.id) : [...prev, l.id])}
                      className="rounded-full px-[10px] py-[4px] text-[11px] font-semibold transition-all"
                      style={on
                        ? { background: l.color + "28", color: l.color, border: `1.5px solid ${l.color}55` }
                        : { background: "transparent", color: "#6b7c75", border: "1.5px solid rgba(255,255,255,0.10)" }
                      }
                    >
                      {l.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-5 flex items-center justify-between">
            <div className="text-[11px] text-[#94a8a0]">
              {hasCatalog && selectedCatalogId && <span>1 élément sélectionné</span>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setAddPlanCtx(null)} className="rounded-[9px] px-4 py-2 text-[12px] text-[rgba(232,245,239,0.5)] hover:text-[#e8f5ef]">
                Annuler
              </button>
              <button
                onClick={handleAddToPlan}
                disabled={!canAddToPlan}
                className="rounded-[9px] bg-[rgba(94,234,212,0.9)] px-4 py-2 text-[12px] font-semibold text-[#061a16] transition-colors hover:bg-[#5eead4] disabled:opacity-40"
              >
                Ajouter au plan →
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
