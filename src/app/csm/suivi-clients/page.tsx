"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { csmClientsStore, toClient } from "@/lib/csm-clients-store";
import { impersonationStore } from "@/lib/impersonation-store";

type ContractFormule = "holistique" | "digital + tokens" | "digital only";
type ProduitTeale = "Joy" | "Dashboard RH" | "Pulse" | "Call d'orientation" | "Ligne d'écoute" | "Assistante sociale";

const AVATAR_COLORS = [
  "#bbf7d0", "#fde68a", "#bfdbfe", "#fbcfe8", "#fed7aa",
  "#c7d2fe", "#a7f3d0", "#fef08a", "#ddd6fe", "#fda4af",
  "#86efac", "#67e8f9", "#fcd34d", "#fca5a5", "#f0abfc",
];

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

const QUARTER_THEMES = [
  { key: "q1", emoji: "🚀", placeholder: "Ex : Lancement & onboarding" },
  { key: "q2", emoji: "🌱", placeholder: "Ex : Sensibilisation & engagement" },
  { key: "q3", emoji: "📈", placeholder: "Ex : Animation & fidélisation" },
  { key: "q4", emoji: "📊", placeholder: "Ex : Bilan & perspectives" },
] as const;

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 20) + "-" + Date.now().toString(36);
}

function autoInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

type CsmKey = "all" | "lucie" | "adrien" | "marie" | "tom";
type StatusKey = "all" | "green" | "amber" | "danger" | "blue" | "new";
type ValColor = "danger" | "amber" | undefined;

interface CardData {
  id: string;
  name: string;
  searchName: string;
  avatarCode: string;
  avatarBg: string;
  csm: Exclude<CsmKey, "all">;
  csmLabel: string;
  collab: string;
  status: Exclude<StatusKey, "all">;
  statusLabel: string;
  isEmpty: boolean;
  progress?: number;
  progressMeta?: string;
  prochainVal?: string;
  prochainColor?: ValColor;
  row1Label: string;
  row1Val: string;
  row2Label: string;
  row2Val: string;
  row2Color?: ValColor;
}

const CSM_BG: Record<Exclude<CsmKey, "all">, string> = {
  lucie:  "linear-gradient(135deg,#5eead4,#84d4a6)",
  adrien: "linear-gradient(135deg,#84d4a6,#a8e895)",
  marie:  "linear-gradient(135deg,#f4a89a,#fbcfe8)",
  tom:    "linear-gradient(135deg,#fde047,#a8e895)",
};
const CSM_INITIAL: Record<Exclude<CsmKey, "all">, string> = {
  lucie: "L", adrien: "A", marie: "M", tom: "T",
};

const CARDS: CardData[] = [];

const STATUS_LABELS: Record<Exclude<StatusKey, "all">, string> = {
  green: "Sains",
  amber: "Vigilance",
  danger: "À risque",
  blue: "Onboarding",
  new: "Sans suivi",
};

const STATUS_COUNTS: Record<Exclude<StatusKey, "all">, number> = {
  green: CARDS.filter((c) => c.status === "green").length,
  amber: CARDS.filter((c) => c.status === "amber").length,
  danger: CARDS.filter((c) => c.status === "danger").length,
  blue: CARDS.filter((c) => c.status === "blue").length,
  new: CARDS.filter((c) => c.status === "new").length,
};

const STATUS_TAG_STYLES: Record<Exclude<StatusKey, "all">, { bg: string; border: string; text: string; dot: string }> = {
  green:  { bg: "rgba(168,232,149,0.15)",  border: "rgba(168,232,149,0.2)",  text: "#a8e895", dot: "#a8e895" },
  amber:  { bg: "rgba(253,224,71,0.15)",   border: "rgba(253,224,71,0.2)",   text: "#fde047", dot: "#fde047" },
  danger: { bg: "rgba(230,170,153,0.18)",  border: "rgba(230,170,153,0.22)", text: "#E6AA99", dot: "#E6AA99" },
  blue:   { bg: "rgba(143,182,199,0.18)",  border: "rgba(143,182,199,0.22)", text: "#8fb6c7", dot: "#8fb6c7" },
  new:    { bg: "rgba(94,234,212,0.18)",  border: "rgba(94,234,212,0.22)", text: "#84d4a6", dot: "#84d4a6" },
};

const PROGRESS_COLORS: Record<Exclude<StatusKey, "all">, string> = {
  green:  "#a8e895",
  amber:  "#fde047",
  danger: "#E6AA99",
  blue:   "#8fb6c7",
  new:    "#84d4a6",
};

const VAL_COLORS: Record<NonNullable<ValColor>, string> = {
  danger: "#E6AA99",
  amber:  "#fde047",
};

const CSM_PILL_COUNTS: Record<Exclude<CsmKey, "all">, number> = {
  lucie:  CARDS.filter((c) => c.csm === "lucie").length,
  adrien: CARDS.filter((c) => c.csm === "adrien").length,
  marie:  CARDS.filter((c) => c.csm === "marie").length,
  tom:    CARDS.filter((c) => c.csm === "tom").length,
};

const EMPTY_FORM = {
  name: "", initials: "", color: AVATAR_COLORS[0],
  collab: "", csm: "lucie" as Exclude<CsmKey, "all">,
  statut: "new" as Exclude<StatusKey, "all">,
  formule: "digital + tokens" as ContractFormule,
  contractStart: "", contractEnd: "", churnNotice: "",
  atelierTotal: "", rdvParCollab: "",
  produits: [] as ProduitTeale[],
  themeQ1: "", themeQ2: "", themeQ3: "", themeQ4: "",
};

function storedToCard(s: ReturnType<typeof csmClientsStore.getAll>[number]): CardData {
  const statusLabels: Record<Exclude<StatusKey, "all">, string> = { green: "Sain", amber: "Vigilance", danger: "À risque", blue: "Onboarding", new: "Nouveau" };
  const c = toClient(s);
  return {
    id: s.id,
    name: s.name,
    searchName: s.name.toLowerCase(),
    avatarCode: s.initials,
    avatarBg: s.color,
    csm: s.csm as Exclude<CsmKey, "all">,
    csmLabel: s.csmLabel,
    collab: `${c.collab.toLocaleString("fr")} collab`,
    status: s.statut,
    statusLabel: statusLabels[s.statut] ?? s.statut,
    isEmpty: true,
    row1Label: "Début contrat", row1Val: s.contractStart || "—",
    row2Label: "Fin contrat",   row2Val: s.contractEnd   || "—",
  };
}

export default function SuiviClientsPage() {
  const router = useRouter();
  const [cards, setCards] = useState<CardData[]>(() => csmClientsStore.getAll().map(storedToCard));
  const [csmFilter, setCsmFilter] = useState<CsmKey>("all");
  const [statusFilter, setStatusFilter] = useState<StatusKey>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    return csmClientsStore.subscribe(() => {
      setCards(csmClientsStore.getAll().map(storedToCard));
    });
  }, []);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const set = <K extends keyof typeof EMPTY_FORM>(k: K, v: (typeof EMPTY_FORM)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleProduit = (p: ProduitTeale) =>
    set("produits", form.produits.includes(p) ? form.produits.filter((x) => x !== p) : [...form.produits, p]);

  const openCreate = () => { setForm(EMPTY_FORM); setCreateStep(1); setCreateError(""); setShowCreate(true); };

  const step1Valid = form.name.trim().length > 0 && form.collab.trim().length > 0;

  const submitCreate = async () => {
    setCreateError("");
    setCreating(true);
    const id = slugify(form.name);
    const csmLabels: Record<Exclude<CsmKey, "all">, string> = { lucie: "Lucie", adrien: "Adrien", marie: "Marie", tom: "Tom" };
    const { error } = await csmClientsStore.add({
      id,
      name: form.name.trim(),
      initials: form.initials || autoInitials(form.name),
      color: form.color,
      collab: Number(form.collab) || 0,
      csm: form.csm,
      csmLabel: csmLabels[form.csm],
      statut: form.statut as "green" | "amber" | "danger",
      formule: form.formule,
      atelierTotal: Number(form.atelierTotal) || 0,
      rdvParCollab: Number(form.rdvParCollab) || 0,
      contractStart: form.contractStart,
      contractEnd: form.contractEnd,
      churnNotice: form.churnNotice,
      produits: form.produits,
      arr: 0,
      createdAt: new Date().toISOString().split("T")[0],
    });
    setCreating(false);
    if (error) {
      setCreateError(`La création a échoué : ${error}`);
      return;
    }
    impersonationStore.set({ mode: "csm-preview", clientId: id, clientName: form.name.trim(), color: form.color });
    setShowCreate(false);
    router.push(`/csm/clients/${id}`);
  };

  const filtered = cards.filter((c) => {
    const csmMatch = csmFilter === "all" || c.csm === csmFilter;
    const statusMatch = statusFilter === "all" || c.status === statusFilter;
    const searchMatch = !search || c.searchName.includes(search.toLowerCase());
    return csmMatch && statusMatch && searchMatch;
  });

  const visibleCount = filtered.length;
  const visibleText =
    visibleCount === 0
      ? "Aucun client"
      : `${visibleCount} client${visibleCount > 1 ? "s" : ""} affiché${visibleCount > 1 ? "s" : ""}`;

  return (
    <>
    <div style={{ background: "#050e0d", minHeight: "100%" }} className="px-10 py-8">
      <div className="mx-auto max-w-[1440px]">

        {/* Page header */}
        <header style={{ marginBottom: 32 }}>
          <p
            className="mb-2 text-[11px] font-semibold uppercase tracking-[2.5px]"
            style={{ color: "#84d4a6" }}
          >
            Espace CSM
          </p>
          <h1
            className="mb-3 text-[36px] font-semibold leading-none tracking-[-0.8px]"
            style={{ color: "#ffffff" }}
          >
            Suivi clients
          </h1>
          <p className="text-[13px] leading-[1.55]" style={{ color: "#94a8a0", maxWidth: 740 }}>
            Tous les clients du portefeuille Teale, leur état de santé et l&apos;avancement de leur projet annuel.{" "}
            <span style={{ color: "#ffffff", fontWeight: 600 }}>
              Clique sur un client pour ouvrir son suivi détaillé
            </span>{" "}
            · ou démarre le suivi d&apos;un nouveau compte.
          </p>

          {/* Stats row */}
          <div
            className="mt-6 mb-2 flex gap-8 pb-6"
            style={{ borderBottom: "1px solid #1a2c28" }}
          >
            {[
              { val: "16", label: "Clients actifs", color: "#ffffff" },
              { val: "6",  label: "À ta charge",    color: "#ffffff" },
              { val: "8",  label: "Comptes sains",  color: "#a8e895" },
              { val: "3",  label: "En vigilance",   color: "#fde047" },
              { val: "3",  label: "À risque",       color: "#E6AA99" },
              { val: "4",  label: "Renouv. < 90j",  color: "#ffffff" },
            ].map(({ val, label, color }) => (
              <div key={label} className="flex flex-col gap-1">
                <div
                  className="text-[24px] font-semibold leading-none tracking-[-0.5px]"
                  style={{ color }}
                >
                  {val}
                </div>
                <div
                  className="text-[11px] font-semibold uppercase tracking-[1px]"
                  style={{ color: "#94a8a0" }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>
        </header>

        {/* Filter bar */}
        <div className="mb-[18px] flex flex-wrap items-center gap-3.5">
          {/* Search */}
          <div
            className="flex min-w-[240px] max-w-[340px] flex-1 items-center gap-2 rounded-xl px-3.5 py-2.5"
            style={{ background: "#0e1f1c", border: "1px solid #1a2c28" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7a8a87" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>
            <input
              className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#7a8a87]"
              style={{ color: "#ffffff", border: 0 }}
              placeholder="Rechercher un client…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* CSM label */}
          <span className="text-[11px] font-semibold uppercase tracking-[1px]" style={{ color: "#94a8a0" }}>
            CSM
          </span>

          {/* CSM pills */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setCsmFilter("all")}
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-[7px] text-[13px] font-medium transition-all"
              style={{
                background: csmFilter === "all" ? "#2a1d52" : "transparent",
                border: `1px solid ${csmFilter === "all" ? "#84d4a6" : "#1a2c28"}`,
                color: csmFilter === "all" ? "#ffffff" : "#e8f5ef",
              }}
            >
              Tous{" "}
              <span style={{ color: csmFilter === "all" ? "#a8e895" : "#7a8a87", fontSize: 10.5 }}>
                {CARDS.length}
              </span>
            </button>

            {(["lucie", "adrien", "marie", "tom"] as const).map((csm) => {
              const labels: Record<typeof csm, string> = {
                lucie: "Mes clients", adrien: "Adrien", marie: "Marie", tom: "Tom",
              };
              const initials: Record<typeof csm, string> = {
                lucie: "LM", adrien: "AR", marie: "MD", tom: "TB",
              };
              const active = csmFilter === csm;
              return (
                <button
                  key={csm}
                  onClick={() => setCsmFilter(csm)}
                  className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-[7px] text-[13px] font-medium transition-all"
                  style={{
                    background: active ? "#2a1d52" : "transparent",
                    border: `1px solid ${active ? "#84d4a6" : "#1a2c28"}`,
                    color: active ? "#ffffff" : "#e8f5ef",
                  }}
                >
                  <span
                    className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                    style={{ background: CSM_BG[csm], color: "#06241d" }}
                  >
                    {CSM_INITIAL[csm]}
                  </span>
                  {labels[csm]}{" "}
                  <span style={{ color: active ? "#a8e895" : "#7a8a87", fontSize: 10.5 }}>
                    {CSM_PILL_COUNTS[csm]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Primary button */}
          <div className="ml-auto">
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-[10px] px-[18px] py-2.5 text-[13px] font-semibold transition-all hover:opacity-90"
              style={{ background: "#5eead4", color: "#061a16" }}
            >
              + Créer un nouveau client
            </button>
          </div>
        </div>

        {/* Status sub-filter */}
        <div className="mb-6 flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setStatusFilter("all")}
            className="rounded-[8px] px-[11px] py-[5px] text-[13px] font-medium transition-all"
            style={{
              background: statusFilter === "all" ? "#161f1c" : "transparent",
              color: statusFilter === "all" ? "#ffffff" : "#94a8a0",
              border: 0,
            }}
          >
            Tous statuts
          </button>

          {(["green", "amber", "danger", "new"] as const).map((s) => {
            const labels: Record<typeof s, string> = {
              green: "Sains", amber: "Vigilance", danger: "À risque",
              new: "Sans suivi",
            };
            const active = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className="inline-flex items-center gap-1.5 rounded-[8px] px-[11px] py-[5px] text-[13px] font-medium transition-all"
                style={{
                  background: active ? "#161f1c" : "transparent",
                  color: active ? "#ffffff" : "#94a8a0",
                  border: 0,
                }}
              >
                <span
                  className="inline-block h-[7px] w-[7px] rounded-full"
                  style={{ background: STATUS_TAG_STYLES[s].dot }}
                />
                {labels[s]} ({STATUS_COUNTS[s]})
              </button>
            );
          })}
        </div>

        {/* Grid info */}
        <div className="mb-3.5 text-[12px]" style={{ color: "#94a8a0" }}>
          <span>{visibleText}</span>
        </div>

        {/* Client grid */}
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((card) => (
            <ClientCard
              key={card.id}
              card={card}
              onClick={() => router.push(`/csm/clients/${card.id}`)}
            />
          ))}

          {filtered.length === 0 && (
            <div
              className="col-span-3 py-16 text-center text-[14px]"
              style={{ color: "#94a8a0" }}
            >
              Aucun client ne correspond à ces filtres.
            </div>
          )}
        </div>
      </div>
    </div>

    {/* ── Create client modal ── */}
    {showCreate && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[3px]" onClick={() => setShowCreate(false)}>
        <div className="w-full max-w-[640px] overflow-hidden rounded-[22px] border border-[rgba(94,234,212,0.18)] bg-[#061a16] shadow-2xl" onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#1a3530] px-6 py-4">
            <div>
              <h2 className="text-[16px] font-semibold text-[#e8f5ef]">Créer un nouveau client</h2>
              <p className="mt-0.5 text-[12px] text-[#94a8a0]">Étape {createStep} / 2 — {createStep === 1 ? "Informations client" : "One-year plan"}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                {[1, 2].map((s) => (
                  <span key={s} className="h-1.5 w-6 rounded-full transition-all" style={{ backgroundColor: s <= createStep ? "#5eead4" : "rgba(255,255,255,0.1)" }} />
                ))}
              </div>
              <button onClick={() => setShowCreate(false)} className="grid h-7 w-7 place-items-center rounded-[8px] bg-[rgba(255,255,255,0.05)] text-[16px] text-[#94a8a0] hover:text-[#e8f5ef]">×</button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-[68vh] overflow-y-auto px-6 py-5">
            {createStep === 1 ? (
              <div className="space-y-5">

                {/* Nom + initiales + couleur */}
                <div>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[1px] text-[#94a8a0]">Identité</p>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="mb-1.5 block text-[11px] text-[rgba(232,245,239,0.45)] uppercase tracking-[0.8px] font-semibold">Nom du client *</label>
                      <input
                        autoFocus
                        value={form.name}
                        onChange={(e) => { set("name", e.target.value); if (!form.initials) set("initials", autoInitials(e.target.value)); }}
                        placeholder="Ex : Stripe"
                        className="w-full rounded-[9px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] placeholder-[rgba(232,245,239,0.25)] outline-none focus:border-[rgba(94,234,212,0.5)]"
                      />
                    </div>
                    <div className="w-24">
                      <label className="mb-1.5 block text-[11px] text-[rgba(232,245,239,0.45)] uppercase tracking-[0.8px] font-semibold">Initiales</label>
                      <input
                        value={form.initials}
                        onChange={(e) => set("initials", e.target.value.toUpperCase().slice(0, 2))}
                        placeholder="AB"
                        maxLength={2}
                        className="w-full rounded-[9px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-center text-[13px] font-bold text-[#e8f5ef] placeholder-[rgba(232,245,239,0.25)] outline-none focus:border-[rgba(94,234,212,0.5)]"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="mb-2 block text-[11px] text-[rgba(232,245,239,0.45)] uppercase tracking-[0.8px] font-semibold">Couleur avatar</label>
                    <div className="flex flex-wrap gap-2">
                      {AVATAR_COLORS.map((c) => (
                        <button key={c} onClick={() => set("color", c)} className="h-7 w-7 rounded-full border-2 transition-all" style={{ backgroundColor: c, borderColor: form.color === c ? "#5eead4" : "transparent" }} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Équipe */}
                <div>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[1px] text-[#94a8a0]">Équipe & statut</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-[11px] text-[rgba(232,245,239,0.45)] uppercase tracking-[0.8px] font-semibold">Collaborateurs *</label>
                      <input
                        type="number" min={1} step={1}
                        value={form.collab}
                        onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ""); set("collab", v); }}
                        onKeyDown={(e) => { if (["e", "E", "+", "-", "."].includes(e.key)) e.preventDefault(); }}
                        placeholder="Ex : 800"
                        className="w-full rounded-[9px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] placeholder-[rgba(232,245,239,0.25)] outline-none focus:border-[rgba(94,234,212,0.5)]"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] text-[rgba(232,245,239,0.45)] uppercase tracking-[0.8px] font-semibold">CSM en charge</label>
                      <select value={form.csm} onChange={(e) => set("csm", e.target.value as typeof form.csm)} className="w-full rounded-[9px] border border-[rgba(255,255,255,0.1)] bg-[#0e2520] px-3 py-2.5 text-[13px] text-[#e8f5ef] outline-none focus:border-[rgba(94,234,212,0.5)]">
                        <option value="lucie">Lucie</option>
                        <option value="adrien">Adrien</option>
                        <option value="marie">Marie</option>
                        <option value="tom">Tom</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="mb-2 block text-[11px] text-[rgba(232,245,239,0.45)] uppercase tracking-[0.8px] font-semibold">État de santé</label>
                      <div className="flex flex-wrap gap-2">
                        {(["green", "amber", "danger"] as const).map((s) => {
                          const labels = { green: "Sain", amber: "Vigilance", danger: "À risque" };
                          const active = form.statut === s;
                          return (
                            <button key={s} onClick={() => set("statut", s)}
                              className="rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all"
                              style={active ? { backgroundColor: STATUS_TAG_STYLES[s].bg, color: STATUS_TAG_STYLES[s].text, borderColor: STATUS_TAG_STYLES[s].dot } : { borderColor: "#1a3530", color: "#94a8a0" }}>
                              {labels[s]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contrat */}
                <div>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[1px] text-[#94a8a0]">Contrat</p>
                  <div className="mb-3">
                    <label className="mb-2 block text-[11px] text-[rgba(232,245,239,0.45)] uppercase tracking-[0.8px] font-semibold">Formule</label>
                    <div className="flex gap-2">
                      {(["holistique", "digital + tokens", "digital only"] as ContractFormule[]).map((f) => (
                        <button key={f} onClick={() => set("formule", f)}
                          className="rounded-full border px-4 py-1.5 text-[12px] font-semibold transition-all"
                          style={form.formule === f ? { backgroundColor: FORMULE_STYLE[f].bg, color: FORMULE_STYLE[f].color, borderColor: FORMULE_STYLE[f].color } : { borderColor: "#1a3530", color: "#94a8a0" }}>
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-[11px] text-[rgba(232,245,239,0.45)] uppercase tracking-[0.8px] font-semibold">Ateliers au contrat</label>
                      <input type="number" min={0} value={form.atelierTotal} onChange={(e) => set("atelierTotal", e.target.value)} placeholder="Ex : 20"
                        className="w-full rounded-[9px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] placeholder-[rgba(232,245,239,0.25)] outline-none focus:border-[rgba(94,234,212,0.5)]" />
                    </div>
                    {form.formule !== "digital only" && (
                      <div>
                        <label className="mb-1.5 block text-[11px] text-[rgba(232,245,239,0.45)] uppercase tracking-[0.8px] font-semibold">
                          {form.formule === "digital + tokens" ? "Nombre de tokens" : "RDV / collaborateur"}
                        </label>
                        <input type="number" min={0} value={form.rdvParCollab} onChange={(e) => set("rdvParCollab", e.target.value)}
                          placeholder={form.formule === "digital + tokens" ? "Ex : 500" : "Ex : 2"}
                          className="w-full rounded-[9px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] placeholder-[rgba(232,245,239,0.25)] outline-none focus:border-[rgba(94,234,212,0.5)]" />
                      </div>
                    )}
                    {(["contractStart", "contractEnd", "churnNotice"] as const).map((key) => (
                      <div key={key}>
                        <label className="mb-1.5 block text-[11px] text-[rgba(232,245,239,0.45)] uppercase tracking-[0.8px] font-semibold">
                          {key === "contractStart" ? "Début de contrat" : key === "contractEnd" ? "Fin de contrat" : "Churn notice"}
                        </label>
                        <input type="date" value={form[key]} onChange={(e) => set(key, e.target.value)}
                          style={{ colorScheme: "dark" }}
                          className="w-full rounded-[9px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] outline-none focus:border-[rgba(94,234,212,0.5)]" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Produits */}
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[1px] text-[#94a8a0]">Produits déployés</p>
                  <div className="flex flex-wrap gap-2">
                    {(["Joy", "Dashboard RH", "Pulse", "Call d'orientation", "Ligne d'écoute", "Assistante sociale"] as ProduitTeale[]).map((p) => (
                      <button key={p} onClick={() => toggleProduit(p)}
                        className="rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all"
                        style={form.produits.includes(p) ? { backgroundColor: PRODUIT_STYLE[p].bg, color: PRODUIT_STYLE[p].color, borderColor: PRODUIT_STYLE[p].color } : { borderColor: "#1a3530", color: "#94a8a0" }}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[13px] leading-relaxed text-[#94a8a0]">
                  Définis un thème pour chaque trimestre du one-year plan. Ces thèmes guideront les ateliers, kits et actions planifiées tout au long de l'année.
                </p>
                {QUARTER_THEMES.map(({ key, emoji, placeholder }) => {
                  const fieldKey = `theme${key.toUpperCase()}` as "themeQ1" | "themeQ2" | "themeQ3" | "themeQ4";
                  return (
                    <div key={key} className="rounded-[12px] border border-[#1a3530] bg-[rgba(255,255,255,0.02)] p-4">
                      <label className="mb-2 block text-[12px] font-semibold text-[#e8f5ef]">{emoji} {key.toUpperCase()}</label>
                      <input
                        value={form[fieldKey]}
                        onChange={(e) => set(fieldKey, e.target.value)}
                        placeholder={`${emoji} ${placeholder}`}
                        className="w-full rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-[#e8f5ef] placeholder-[rgba(232,245,239,0.25)] outline-none focus:border-[rgba(94,234,212,0.5)]"
                      />
                    </div>
                  );
                })}
                <p className="text-[11px] text-[#94a8a0]">Les thèmes sont facultatifs — tu pourras les modifier depuis le suivi détaillé du client.</p>
              </div>
            )}
          </div>

          {/* Error */}
          {createError && (
            <div className="mx-6 mb-1 rounded-[8px] bg-[rgba(239,68,68,0.1)] px-3 py-2 text-[12px] text-[#fca5a5]">
              {createError}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[#1a3530] px-6 py-4">
            <button onClick={() => createStep === 1 ? setShowCreate(false) : setCreateStep(1)}
              className="rounded-[9px] px-4 py-2 text-[12px] text-[rgba(232,245,239,0.5)] hover:text-[#e8f5ef]">
              {createStep === 1 ? "Annuler" : "← Retour"}
            </button>
            {createStep === 1 ? (
              <button
                disabled={!step1Valid}
                onClick={() => setCreateStep(2)}
                className="rounded-[9px] bg-[rgba(94,234,212,0.9)] px-5 py-2 text-[12px] font-semibold text-[#061a16] transition-colors hover:bg-[#5eead4] disabled:opacity-40"
              >
                Suivant — One-year plan →
              </button>
            ) : (
              <button
                onClick={submitCreate}
                disabled={creating}
                className="rounded-[9px] bg-[#5eead4] px-5 py-2 text-[12px] font-semibold text-[#061a16] transition-colors hover:bg-[#7df0db] disabled:opacity-40"
              >
                {creating ? "Création…" : "Créer le client →"}
              </button>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function ClientCard({ card, onClick }: { card: CardData; onClick: () => void }) {
  if (card.isEmpty) {
    return (
      <article
        onClick={onClick}
        className="flex cursor-pointer flex-col gap-3.5 rounded-2xl p-5 transition-all duration-150"
        style={{
          background: "transparent",
          border: "1px dashed #243a35",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#84d4a6"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#243a35"; (e.currentTarget as HTMLElement).style.borderStyle = "dashed"; }}
      >
        {/* Head */}
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px] text-[14px] font-bold"
            style={{ background: card.avatarBg, color: "#06241d" }}
          >
            {card.avatarCode}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[16px] font-semibold leading-snug tracking-[-0.2px]" style={{ color: "#ffffff" }}>
              {card.name}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px]" style={{ color: "#94a8a0" }}>
              <span>{card.collab}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <span
                  className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold"
                  style={{ background: CSM_BG[card.csm], color: "#06241d" }}
                >
                  {CSM_INITIAL[card.csm]}
                </span>
                {card.csmLabel}
              </span>
            </div>
          </div>
          <StatusTag status={card.status} label={card.statusLabel} />
        </div>

        {/* Empty message */}
        <div
          className="rounded-[10px] p-3.5 text-[13px] leading-[1.5]"
          style={{
            background: "rgba(94,234,212,0.06)",
            border: "1px solid rgba(94,234,212,0.15)",
            color: "#94a8a0",
          }}
        >
          <strong style={{ color: "#ffffff" }}>Pas encore de suivi projet.</strong>
          <br />
          Configure le one-year plan, les actions prioritaires et les notes pour démarrer l&apos;accompagnement.
        </div>

        {/* Info rows */}
        <div className="flex flex-col gap-2 border-t pt-3.5" style={{ borderColor: "#1a2c28" }}>
          <InfoRow label={card.row1Label} val={card.row1Val} />
          <InfoRow label={card.row2Label} val={card.row2Val} />
        </div>

        {/* CTA */}
        <div className="mt-1.5 flex items-center gap-2">
          <span className="flex-1 text-[13px] font-medium text-[#84d4a6]">Ouvrir la fiche</span>
          <span className="text-lg text-[#7a8a87]">→</span>
        </div>
      </article>
    );
  }

  return (
    <div
      onClick={onClick}
      className="group flex cursor-pointer flex-col gap-3.5 rounded-2xl p-5 transition-all duration-150"
      style={{
        background: "#0e1f1c",
        border: "1px solid #1a2c28",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#84d4a6";
        (e.currentTarget as HTMLDivElement).style.background = "#101f1c";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#1a2c28";
        (e.currentTarget as HTMLDivElement).style.background = "#0e1f1c";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      {/* Head */}
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px] text-[14px] font-bold"
          style={{ background: card.avatarBg, color: "#06241d" }}
        >
          {card.avatarCode}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] font-semibold leading-snug tracking-[-0.2px]" style={{ color: "#ffffff" }}>
            {card.name}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px]" style={{ color: "#94a8a0" }}>
            <span>{card.collab}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <span
                className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold"
                style={{ background: CSM_BG[card.csm], color: "#06241d" }}
              >
                {CSM_INITIAL[card.csm]}
              </span>
              {card.csmLabel}
            </span>
          </div>
        </div>
        <StatusTag status={card.status} label={card.statusLabel} />
      </div>

      {/* Progress */}
      {card.progress !== undefined && (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[12px]" style={{ color: "#94a8a0" }}>
            <span>Avancement projet</span>
            <span className="text-[13px] font-semibold" style={{ color: "#ffffff" }}>
              {card.progress}%
            </span>
          </div>
          <div
            className="h-[6px] overflow-hidden rounded-full"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <div
              className="h-full rounded-full transition-[width]"
              style={{
                width: `${card.progress}%`,
                background: PROGRESS_COLORS[card.status],
              }}
            />
          </div>
          <div className="text-[11px]" style={{ color: "#94a8a0" }}>
            {card.progressMeta}
          </div>
        </div>
      )}

      {/* Info rows */}
      <div className="flex flex-col gap-2 border-t pt-3.5" style={{ borderColor: "#1a2c28" }}>
        <InfoRow
          label={card.row1Label}
          val={card.row1Val}
          valColor={card.prochainColor}
        />
        <InfoRow label={card.row2Label} val={card.row2Val} valColor={card.row2Color} />
      </div>

      {/* CTA */}
      <div className="mt-1.5 flex items-center gap-2">
        <span className="flex-1 text-[13px] font-medium transition-all" style={{ color: "#84d4a6" }}>
          Ouvrir le suivi
        </span>
        <span className="text-lg transition-all" style={{ color: "#7a8a87" }}>
          →
        </span>
      </div>
    </div>
  );
}

function StatusTag({ status, label }: { status: Exclude<StatusKey, "all">; label: string }) {
  const s = STATUS_TAG_STYLES[status];
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-[3px] text-[10px] font-bold uppercase tracking-[0.5px]"
      style={{
        background: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
      }}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
      {label}
    </span>
  );
}

function InfoRow({ label, val, valColor }: { label: string; val: string; valColor?: ValColor }) {
  return (
    <div className="flex justify-between gap-2 text-[12px]">
      <span
        className="text-[10px] font-medium uppercase tracking-[0.5px]"
        style={{ color: "#94a8a0" }}
      >
        {label}
      </span>
      <span
        className="text-right font-medium"
        style={{ color: valColor ? VAL_COLORS[valColor] : "#e8f5ef" }}
      >
        {val}
      </span>
    </div>
  );
}
