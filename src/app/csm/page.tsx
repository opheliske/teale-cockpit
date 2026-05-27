"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CLIENTS, HOME_ACTIONS, type Statut, type HomeAction, type Client } from "@/lib/clients-data";
import { clientActionsStore } from "@/lib/client-actions-store";
import { csmEventsStore, type CsmEvent } from "@/lib/csm-events-store";
import { csmClientsStore, type StoredCsmClient } from "@/lib/csm-clients-store";
import { useAuth } from "@/lib/auth";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statutConfig(s: Statut) {
  switch (s) {
    case "SAIN": return { dot: "#5EEAB0", text: "#5EEAB0", bg: "rgba(94,234,176,0.12)", label: "Sain" };
    case "VIGILANCE": return { dot: "#FFB547", text: "#FFB547", bg: "rgba(255,181,71,0.12)", label: "Vigilance" };
    case "À RISQUE": return { dot: "#FF6B6B", text: "#FF6B6B", bg: "rgba(255,107,107,0.12)", label: "À risque" };
  }
}

function consoColor(ratio: number) {
  if (ratio >= 0.7) return "#5EEAB0";
  if (ratio >= 0.35) return "#FFB547";
  return "#FF6B6B";
}

const FR_MONTH_NAMES_FULL = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function formatDateFr(isoDate: string): string {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${parseInt(day)} ${FR_MONTH_NAMES_FULL[parseInt(month) - 1]} ${year}`;
}

function daysUntilDate(d: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function renewalColor(days: number) {
  if (days < 30) return "#FF6B6B";
  if (days < 90) return "#FFB547";
  return "#5EEAB0";
}

function daysUntilIso(iso: string): number {
  return daysUntilDate(new Date(iso));
}

function formatIsoFr(iso: string): string {
  const d = new Date(iso);
  const months = ["janv.", "fév.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Agenda & activity static data ────────────────────────────────────────────

type AgendaEvent = {
  date: string;
  weekday: string;
  time: string;
  title: string;
  client: string;
  clientId: string;
  clientColor: string;
  type: "call" | "atelier" | "csm" | "qbr" | "kit";
};

function eventStyle(type: AgendaEvent["type"]) {
  switch (type) {
    case "call":    return { icon: "📞", color: "#ef4444", bg: "rgba(239,68,68,0.12)" };
    case "atelier": return { icon: "🎓", color: "#5eead4", bg: "rgba(94,234,212,0.1)" };
    case "csm":     return { icon: "💬", color: "#84d4a6", bg: "rgba(94,234,212,0.12)" };
    case "qbr":     return { icon: "📊", color: "#22c55e", bg: "rgba(34,197,94,0.12)" };
    case "kit":     return { icon: "📢", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" };
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DonutChart({ pct, color, size = 64 }: { pct: number; color: string; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(1, pct)));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1A2129" strokeWidth="9" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="9"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
    </svg>
  );
}

function ConsoBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(value / max, 1);
  const color = consoColor(pct);
  return (
    <div className="flex flex-col gap-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1A2129]">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
      </div>
      <span className="text-[11px] tabular-nums text-[#6B7585]">{value} / {max} ateliers</span>
    </div>
  );
}

function StatutBadge({ statut }: { statut: Statut }) {
  const cfg = statutConfig(statut);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}>
      <span className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function ClientAvatar({ initials, color, size = 32 }: { initials: string; color: string; size?: number }) {
  return (
    <div className="flex shrink-0 items-center justify-center rounded-[10px] text-[13px] font-semibold"
      style={{ width: size, height: size, backgroundColor: color + "22", color }}>
      {initials}
    </div>
  );
}

function storeToClient(s: StoredCsmClient): Client {
  const statutMap: Record<StoredCsmClient["statut"], Statut> = {
    green: "SAIN", amber: "VIGILANCE", danger: "À RISQUE",
  };
  return {
    id: s.id,
    initials: s.initials,
    color: s.color,
    name: s.name,
    collab: s.collab,
    statut: statutMap[s.statut] ?? "SAIN",
    consoAteliers: [0, s.atelierTotal || 1],
    action: "—",
    actionDate: "",
    renouvDate: s.contractEnd || "—",
    churnNotice: s.churnNotice || "",
    arr: s.arr || 0,
  };
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Filter = "Tous" | "Sains" | "Vigilance" | "Risque" | "Renouvellement";
const FILTERS: Filter[] = ["Tous", "Sains", "Vigilance", "Risque", "Renouvellement"];
const FILTER_SHORT: Record<Filter, string> = {
  Tous: "Tous", Sains: "Sains", Vigilance: "Vigilance", Risque: "Risque",
  Renouvellement: "Renouv < 90j",
};

export default function CsmHomePage() {
  const router = useRouter();
  const { profile } = useAuth();
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? "";
  const [activeTab, setActiveTab] = useState<"Portfolio" | "Activites" | "Alertes">("Portfolio");
  const [filter, setFilter] = useState<Filter>("Tous");
  const [search, setSearch] = useState("");
  const [doneIds, setDoneIds] = useState<Set<number>>(
    () => new Set(HOME_ACTIONS.filter((a) => a.done).map((a) => a.id))
  );
  const [actions, setActions] = useState<HomeAction[]>(() => [
    ...HOME_ACTIONS,
    ...clientActionsStore.getExtra(),
  ]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newText, setNewText] = useState("");
  const [newEcheance, setNewEcheance] = useState("");
  const [extraCsmEvents, setExtraCsmEvents] = useState<CsmEvent[]>(() => csmEventsStore.getEvents());
  const [storeClients, setStoreClients] = useState<Client[]>(() => csmClientsStore.getAll().map(storeToClient));

  useEffect(() => {
    return csmClientsStore.subscribe(() => {
      setStoreClients(csmClientsStore.getAll().map(storeToClient));
    });
  }, []);

  useEffect(() => {
    return clientActionsStore.subscribe(() => {
      setActions((prev) => {
        const extra = clientActionsStore.getExtra();
        const existingIds = new Set(prev.map((a) => a.id));
        const newOnes = extra.filter((a) => !existingIds.has(a.id));
        return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
      });
    });
  }, []);

  useEffect(() => {
    return csmEventsStore.subscribe(() => {
      setExtraCsmEvents([...csmEventsStore.getEvents()]);
    });
  }, []);

  const allClients = useMemo(() => [...CLIENTS, ...storeClients], [storeClients]);

  // Contracts renewing within 90 days, derived from the real client list.
  const renewals = useMemo(
    () =>
      allClients
        .map((c) => ({ ...c, days: daysUntilIso(c.renouvDate) }))
        .filter((c) => Number.isFinite(c.days) && c.days >= 0 && c.days <= 90)
        .sort((a, b) => a.days - b.days),
    [allClients],
  );
  const urgentRenewals = useMemo(
    () => renewals.filter((r) => r.days <= 30),
    [renewals],
  );

  // ── KPIs ──
  const total = allClients.length;
  const sainCount = allClients.filter((c) => c.statut === "SAIN").length;
  const vigilanceCount = allClients.filter((c) => c.statut === "VIGILANCE").length;
  const risqueCount = allClients.filter((c) => c.statut === "À RISQUE").length;
  const renewalARR = renewals.reduce((s, r) => s + (r.arr || 0), 0);
  const pendingActionsCount = actions.filter((a) => !doneIds.has(a.id)).length;
  const overdueActionsCount = actions.filter((a) => !!a.overdue && !doneIds.has(a.id)).length;
  const healthPct = total > 0 ? Math.round((sainCount / total) * 100) : 0;

  const filterCounts: Record<Filter, number> = {
    Tous: total,
    Sains: sainCount,
    Vigilance: vigilanceCount,
    Risque: risqueCount,
    Renouvellement: renewals.length,
  };

  const dateStr = useMemo(() => {
    const s = new Date().toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, []);

  const filtered = allClients.filter((c) => {
    if (!c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "Sains") return c.statut === "SAIN";
    if (filter === "Vigilance") return c.statut === "VIGILANCE";
    if (filter === "Risque") return c.statut === "À RISQUE";
    if (filter === "Renouvellement") return renewals.some((r) => r.id === c.id);
    return true;
  });

  const toggleDone = (id: number) => {
    setDoneIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAddAction = async () => {
    if (!newText.trim()) return;
    // Persist to Supabase; the clientActionsStore subscription merges the
    // saved row back into `actions`.
    await clientActionsStore.add({
      text: newText.trim(),
      clients: [],
      echeance: newEcheance ? formatDateFr(newEcheance) : "Sans échéance",
    });
    setNewText("");
    setNewEcheance("");
    setShowAddModal(false);
  };

  const alertClients = allClients.filter((c) => c.statut === "À RISQUE" || c.statut === "VIGILANCE");
  const overdueActionsList = actions.filter((a) => !!a.overdue && !doneIds.has(a.id));

  return (
    <div className="min-h-screen px-9 pb-16 pt-7 text-[#F2F5F8]">
      {/* ── Topbar ── */}
      <div className="mb-7">
        <div className="inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.04em] text-[#A7B0BC]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#5EEAB0]" />
          {dateStr}
        </div>
      </div>

      {/* ── Hero ── */}
      <section className="mb-7 flex items-end justify-between gap-6 border-b border-[#1F2832] pb-6">
        <div>
          <h1 className="m-0 mb-1.5 text-[28px] font-semibold tracking-[-0.02em]">
            Bonjour{firstName ? <> <span className="text-[#5EEAB0]">{firstName}</span></> : ""}
          </h1>
          <p className="m-0 max-w-[560px] text-[14px] leading-relaxed text-[#A7B0BC]">
            Voici l&apos;état de votre portefeuille de {total} compte{total > 1 ? "s" : ""} Teale.{" "}
            {vigilanceCount + risqueCount > 0
              ? `${vigilanceCount + risqueCount} client${vigilanceCount + risqueCount > 1 ? "s" : ""} demandent votre attention`
              : "Tous les clients sont en bonne santé"}
            {urgentRenewals.length > 0
              ? `, et vous avez ${urgentRenewals.length} renouvellement${urgentRenewals.length > 1 ? "s" : ""} à prioriser ce mois-ci.`
              : "."}
          </p>
        </div>
        <button
          onClick={() => router.push("/csm/suivi-clients")}
          className="inline-flex shrink-0 items-center gap-2 rounded-[8px] bg-[#5EEAB0] px-4 py-2.5 text-[13px] font-semibold text-[#0A2018] transition-[filter] hover:brightness-105"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nouveau client
        </button>
      </section>

      {/* ── Tabs ── */}
      <div className="mb-6 flex gap-1 border-b border-[#1F2832]">
        {([
          { label: "Portfolio",        key: "Portfolio" as const },
          { label: "Activités et RDV", key: "Activites" as const },
          { label: "Alertes & risques",key: "Alertes" as const },
        ]).map(({ label, key }) => {
          const isActive = activeTab === key;
          const alertBadge = vigilanceCount + risqueCount + overdueActionsCount;
          return (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`-mb-px border-b-2 px-3.5 py-2.5 text-[13.5px] font-medium transition-colors ${
                isActive
                  ? "border-[#5EEAB0] text-[#F2F5F8]"
                  : "border-transparent text-[#A7B0BC] hover:text-[#F2F5F8]"
              }`}
            >
              {label}
              {key === "Alertes" && alertBadge > 0 && (
                <span className={`ml-2 rounded-[4px] px-1.5 py-0.5 text-[11px] font-semibold ${
                  isActive ? "bg-[rgba(94,234,176,0.12)] text-[#5EEAB0]" : "bg-[#1A2129] text-[#A7B0BC]"
                }`}>
                  {alertBadge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Portfolio tab ── */}
      {activeTab === "Portfolio" && (
        <>
          {/* KPI cards */}
          <div className="mb-7 grid grid-cols-3 gap-4">
            {/* Santé du portefeuille */}
            <div className="rounded-[14px] border border-[#1F2832] bg-[rgba(255,255,255,0.02)] p-5 transition-colors hover:border-[#2A3441]">
              <div className="mb-4 flex items-center justify-between">
                <p className="m-0 text-[12px] font-medium uppercase tracking-[0.06em] text-[#A7B0BC]">Santé du portefeuille</p>
                <span className="rounded-full bg-[rgba(94,234,176,0.12)] px-[7px] py-0.5 text-[11px] font-semibold text-[#5EEAB0]">
                  {risqueCount + vigilanceCount === 0 ? "stable" : "à surveiller"}
                </span>
              </div>
              <div className="flex items-center gap-[18px]">
                <div className="relative h-20 w-20 shrink-0">
                  <DonutChart pct={total > 0 ? sainCount / total : 0} color="#5EEAB0" size={80} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[20px] font-semibold leading-none text-[#F2F5F8]">{healthPct}%</span>
                    <span className="mt-0.5 text-[11px] text-[#6B7585]">sains</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-3.5 gap-y-2">
                  {[
                    { c: "#5EEAB0", n: sainCount, l: "sain" },
                    { c: "#FFB547", n: vigilanceCount, l: "vigilance" },
                    { c: "#FF6B6B", n: risqueCount, l: "risque" },
                  ].map(({ c, n, l }) => (
                    <div key={l} className="flex items-center gap-1.5 text-[12px] text-[#A7B0BC]">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c }} />
                      <strong className="font-semibold text-[#F2F5F8]">{n}</strong> {l}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3.5 border-t border-dashed border-[#1F2832] pt-3.5 text-[12px] text-[#6B7585]">
                {total} compte{total > 1 ? "s" : ""} actif{total > 1 ? "s" : ""} · {risqueCount} à risque de churn
              </div>
            </div>

            {/* Renouvellements à venir */}
            <div className="rounded-[14px] border border-[#1F2832] bg-[rgba(255,255,255,0.02)] p-5 transition-colors hover:border-[#2A3441]">
              <div className="mb-4 flex items-center justify-between">
                <p className="m-0 text-[12px] font-medium uppercase tracking-[0.06em] text-[#A7B0BC]">Renouvellements à venir</p>
                <span className="rounded-full bg-[rgba(255,181,71,0.12)] px-[7px] py-0.5 text-[11px] font-semibold text-[#FFB547]">90 j</span>
              </div>
              <div className="flex items-center gap-[18px]">
                <div className="relative h-20 w-20 shrink-0">
                  <DonutChart pct={total > 0 ? renewals.length / total : 0} color="#FFB547" size={80} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[20px] font-semibold leading-none text-[#F2F5F8]">{renewals.length}/{total}</span>
                    <span className="mt-0.5 text-[11px] text-[#6B7585]">à fermer</span>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[32px] font-semibold leading-none tracking-[-0.02em]">{renewalARR}</span>
                    <span className="text-[14px] text-[#6B7585]">k€ ARR concerné</span>
                  </div>
                  <p className="m-0 mt-2 text-[12px] text-[#6B7585]">
                    {renewals.length} contrat{renewals.length > 1 ? "s" : ""} à fermer d&apos;ici 90 jours sur {total} compte{total > 1 ? "s" : ""}.
                  </p>
                </div>
              </div>
              <div className="mt-3.5 border-t border-dashed border-[#1F2832] pt-3.5 text-[12px] text-[#6B7585]">
                {renewals.length > 0 ? "Échéances contractuelles sous 90 jours" : "Prochaine échéance contractuelle dans > 90j"}
              </div>
            </div>

            {/* Actions CSM */}
            <div className="rounded-[14px] border border-[#1F2832] bg-[rgba(255,255,255,0.02)] p-5 transition-colors hover:border-[#2A3441]">
              <div className="mb-4 flex items-center justify-between">
                <p className="m-0 text-[12px] font-medium uppercase tracking-[0.06em] text-[#A7B0BC]">Actions CSM</p>
                <span className={`rounded-full px-[7px] py-0.5 text-[11px] font-semibold ${
                  overdueActionsCount > 0
                    ? "bg-[rgba(255,107,107,0.12)] text-[#FF6B6B]"
                    : "bg-[rgba(94,234,176,0.12)] text-[#5EEAB0]"
                }`}>
                  {overdueActionsCount > 0 ? `${overdueActionsCount} en retard` : "à jour"}
                </span>
              </div>
              <div className="flex items-center gap-[18px]">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#1A2129]">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#5EEAB0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[32px] font-semibold leading-none tracking-[-0.02em]">{pendingActionsCount}</span>
                    <span className="text-[14px] text-[#6B7585]">à traiter</span>
                  </div>
                  <p className="m-0 mt-2 text-[12px] text-[#6B7585]">Tâches cross-clients en cours.</p>
                </div>
              </div>
              <div className="mt-3.5 border-t border-dashed border-[#1F2832] pt-3.5 text-[12px] text-[#6B7585]">
                {overdueActionsCount > 0 ? `${overdueActionsCount} action${overdueActionsCount > 1 ? "s" : ""} en retard` : "Tu es à jour. Bravo 🌿"}
              </div>
            </div>
          </div>

          {/* Content grid */}
          <div className="grid grid-cols-[1fr_320px] gap-5">
            {/* Portefeuille panel */}
            <div className="rounded-[14px] border border-[#1F2832] bg-[rgba(255,255,255,0.02)] p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="m-0 flex items-center gap-2.5 text-[16px] font-semibold tracking-[-0.01em]">
                  Mon portefeuille
                  <span className="rounded-full bg-[#1A2129] px-2 py-0.5 text-[11px] font-medium text-[#A7B0BC]">
                    {total} compte{total > 1 ? "s" : ""}
                  </span>
                </h2>
                <span className="text-[12px] text-[#6B7585]">Année contrat 2025 — 2026</span>
              </div>

              {/* Filters */}
              <div className="mb-4 flex flex-wrap items-center gap-1.5">
                {FILTERS.map((f) => {
                  const isActive = filter === f;
                  const isWarn = f === "Renouvellement";
                  return (
                    <button key={f} onClick={() => setFilter(f)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                        isActive
                          ? "border-[rgba(94,234,176,0.25)] bg-[rgba(94,234,176,0.12)] text-[#5EEAB0]"
                          : isWarn
                            ? "border-transparent bg-[rgba(255,181,71,0.12)] text-[#FFB547] hover:brightness-110"
                            : "border-transparent bg-[#1A2129] text-[#A7B0BC] hover:text-[#F2F5F8]"
                      }`}>
                      {FILTER_SHORT[f]}
                      <span className="text-[11px] tabular-nums opacity-85">{filterCounts[f]}</span>
                    </button>
                  );
                })}
                <button onClick={() => router.push("/csm/suivi-clients")}
                  className="ml-auto rounded-full border border-dashed border-[rgba(94,234,176,0.25)] bg-transparent px-3 py-1.5 text-[12.5px] font-medium text-[#5EEAB0] transition-colors hover:bg-[rgba(94,234,176,0.06)]">
                  + Nouveau
                </button>
              </div>

              {/* Search */}
              <div className="mb-3 flex items-center gap-2 rounded-[10px] bg-[#1A2129] px-3.5 py-2.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7585" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input type="text" placeholder="Rechercher un client…" value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-[13px] text-[#F2F5F8] placeholder-[#6B7585] outline-none" />
              </div>

              {/* Column headers */}
              <div
                className="grid items-center gap-4 px-3 pb-2 pt-1"
                style={{ gridTemplateColumns: "1.6fr 0.9fr 1.1fr 1.4fr 0.9fr" }}
              >
                {["Client", "Statut", "Conso ateliers", "Action prioritaire", "Renouvellement"].map((h, i) => (
                  <div key={h} className={`text-[11px] font-medium uppercase tracking-[0.06em] text-[#4A5260] ${i === 4 ? "text-right" : ""}`}>
                    {h}
                  </div>
                ))}
              </div>

              {/* Client rows */}
              {filtered.map((c) => {
                const hasAction = c.action && c.action !== "—";
                return (
                  <div key={c.id} onClick={() => router.push(`/csm/clients/${c.id}`)}
                    className="grid cursor-pointer items-center gap-4 rounded-[10px] border border-transparent px-3 py-3.5 transition-colors hover:border-[#1F2832] hover:bg-[#1A2129]"
                    style={{ gridTemplateColumns: "1.6fr 0.9fr 1.1fr 1.4fr 0.9fr" }}>
                    <div className="flex items-center gap-3">
                      <ClientAvatar initials={c.initials} color={c.color} size={38} />
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-medium leading-tight">{c.name}</div>
                        <div className="mt-0.5 text-[12px] leading-tight text-[#6B7585]">
                          {c.collab.toLocaleString("fr")} collaborateurs
                        </div>
                      </div>
                    </div>
                    <div><StatutBadge statut={c.statut} /></div>
                    <div><ConsoBar value={c.consoAteliers[0]} max={c.consoAteliers[1]} /></div>
                    <div className={`text-[12.5px] leading-tight ${hasAction ? "text-[#F2F5F8]" : "italic text-[#4A5260]"}`}>
                      {hasAction ? c.action : "Aucune action urgente"}
                      {hasAction && c.actionDate && (
                        <div className="mt-0.5 text-[11px] text-[#6B7585]">{c.actionDate}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-[12.5px] font-medium text-[#F2F5F8]">{c.arr > 0 ? `${c.arr} k€` : "— k€"}</div>
                      <div className="mt-0.5 text-[11px] text-[#6B7585]">
                        {c.renouvDate && c.renouvDate !== "—" ? formatIsoFr(c.renouvDate) : "À configurer"}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="px-3 py-10 text-center text-[13px] text-[#6B7585]">
                  Aucun client ne correspond à ce filtre.
                </div>
              )}

              {/* Foot */}
              <div className="mt-3.5 flex items-center justify-between border-t border-[#1F2832] pt-3.5 text-[12px] text-[#6B7585]">
                <span>{filtered.length} affiché{filtered.length > 1 ? "s" : ""} sur {total} · trié par alerte décroissante</span>
                <button onClick={() => router.push("/csm/suivi-clients")}
                  className="font-medium text-[#5EEAB0] hover:brightness-110">
                  Voir tous les comptes →
                </button>
              </div>
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-4">
              {/* Actions CSM */}
              <div className="rounded-[14px] border border-[#1F2832] bg-[rgba(255,255,255,0.02)] p-[18px]">
                <div className="mb-3.5 flex items-center justify-between">
                  <h3 className="m-0 text-[14px] font-semibold">Actions CSM</h3>
                  <span className="rounded-full bg-[#1A2129] px-2 py-0.5 text-[11px] font-semibold text-[#A7B0BC]">
                    {pendingActionsCount} à traiter
                  </span>
                </div>
                {actions.length === 0 ? (
                  <div className="flex flex-col items-center gap-2.5 px-2 py-4 text-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1A2129] text-[#6B7585]">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                      </svg>
                    </div>
                    <p className="m-0 text-[12.5px] leading-relaxed text-[#A7B0BC]">
                      Tu n&apos;as pas de tâche cross-clients en cours. Profite-en pour anticiper.
                    </p>
                  </div>
                ) : (
                  <ul className="m-0 list-none divide-y divide-[#1F2832] p-0">
                    {actions.map((a) => {
                      const isDone = doneIds.has(a.id);
                      return (
                        <li key={a.id} className="py-2.5 first:pt-0">
                          <div className="flex gap-2.5">
                            <button onClick={() => toggleDone(a.id)}
                              className={`mt-0.5 h-3.5 w-3.5 shrink-0 rounded border transition-colors ${
                                isDone ? "border-[#5EEAB0] bg-[rgba(94,234,176,0.2)]" : "border-[#2A3441] hover:border-[#4A5260]"
                              }`}>
                              {isDone && <svg viewBox="0 0 12 12" fill="none" className="h-full w-full p-0.5"><path d="M2 6l3 3 5-5" stroke="#5EEAB0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                            </button>
                            <div className="min-w-0 flex-1">
                              <p className={`m-0 text-[12.5px] leading-snug ${isDone ? "text-[#4A5260] line-through" : "text-[#F2F5F8]"}`}>{a.text}</p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                                {a.clients.slice(0, 3).map((cl) => (
                                  <span key={cl.name} className="rounded px-1.5 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: cl.color + "30", color: cl.color }}>{cl.name}</span>
                                ))}
                                {a.clients.length > 3 && <span className="rounded bg-[#1A2129] px-1.5 py-0.5 text-[9px] text-[#6B7585]">+{a.clients.length - 3}</span>}
                                {a.overdue && !isDone && <span className="rounded bg-[rgba(255,107,107,0.12)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.04em] text-[#FF6B6B]">En retard</span>}
                              </div>
                              <p className="m-0 mt-1 text-[10px] text-[#4A5260]">{a.echeance}</p>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <button onClick={() => setShowAddModal(true)}
                  className="mt-3 flex w-full items-center gap-2 rounded-[10px] border border-dashed border-[#2A3441] bg-[#1A2129] px-3 py-2.5 text-[12.5px] font-medium text-[#A7B0BC] transition-colors hover:border-[rgba(94,234,176,0.25)] hover:text-[#5EEAB0]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Ajouter une action
                </button>
              </div>

              {/* Prochaines churn notices */}
              {(() => {
                const sorted = allClients
                  .filter((c) => !!c.churnNotice)
                  .map((c) => ({ ...c, days: daysUntilIso(c.churnNotice ?? "") }))
                  .filter((c) => Number.isFinite(c.days))
                  .sort((a, b) => a.days - b.days)
                  .slice(0, 5);
                return (
                  <div className="rounded-[14px] border border-[#1F2832] bg-[rgba(255,255,255,0.02)] p-[18px]">
                    <div className="mb-3.5 flex items-center justify-between">
                      <h3 className="m-0 text-[14px] font-semibold">Prochaines churn notices</h3>
                      <span className="rounded-full bg-[#1A2129] px-2 py-0.5 text-[11px] font-semibold text-[#A7B0BC]">Top 5</span>
                    </div>
                    {sorted.length === 0 ? (
                      <div className="flex flex-col items-center gap-2.5 px-2 py-4 text-center">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(94,234,176,0.12)] text-[#5EEAB0]">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                          </svg>
                        </div>
                        <p className="m-0 text-[12.5px] leading-relaxed text-[#A7B0BC]">
                          Aucune churn notice à venir. Tes contrats sont sécurisés sur les 90 prochains jours.
                        </p>
                      </div>
                    ) : (
                      <ul className="m-0 list-none divide-y divide-[#1F2832] p-0">
                        {sorted.map((c) => {
                          const col = renewalColor(c.days);
                          const cfg = statutConfig(c.statut);
                          return (
                            <li key={c.id} onClick={() => router.push(`/csm/clients/${c.id}`)}
                              className="flex cursor-pointer items-center gap-3 py-2.5 first:pt-0">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[11px] font-semibold"
                                style={{ backgroundColor: c.color + "22", color: c.color }}>
                                {c.initials}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="truncate text-[12.5px] font-semibold text-[#F2F5F8]">{c.name}</span>
                                  <span className="shrink-0 text-[11px] font-semibold tabular-nums" style={{ color: col }}>{c.days}j</span>
                                </div>
                                <div className="mt-0.5 flex items-center gap-1.5">
                                  <span className="text-[10px] text-[#6B7585]">{formatIsoFr(c.churnNotice ?? "")}</span>
                                  <span className="text-[#2A3441]">·</span>
                                  <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: cfg.text }}>
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
                                    {cfg.label}
                                  </span>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </>
      )}

      {/* ── Activités et RDV tab ── */}
      {activeTab === "Activites" && (
        <div>

          {/* Agenda */}
          {(() => {
            const dynamicCsm: AgendaEvent[] = extraCsmEvents.map((e) => ({
              date: e.date,
              weekday: e.weekday,
              time: e.time,
              title: e.title,
              client: e.clientName,
              clientId: e.clientId,
              clientColor: e.clientColor,
              type: "csm" as const,
            }));
            const allEvents = dynamicCsm;
            return (
              <div className="rounded-[14px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)]">
                <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] px-4 py-3">
                  <h3 className="text-[13px] font-semibold text-brand-cream">Agenda · prochains RDV &amp; ateliers</h3>
                  <span className="text-[11px] text-[rgba(232,245,239,0.4)]">{allEvents.length} événements{dynamicCsm.length > 0 && <span className="ml-1.5 rounded-full bg-[rgba(94,234,212,0.15)] px-1.5 py-0.5 text-[#5eead4]">+{dynamicCsm.length} ajoutés</span>}</span>
                </div>
                <ul className="divide-y divide-[rgba(255,255,255,0.04)]">
                  {allEvents.map((ev, i) => {
                    const st = eventStyle(ev.type);
                    const isFirst = i === 0;
                    return (
                      <li key={i}
                        onClick={() => router.push(`/csm/clients/${ev.clientId}`)}
                        className="flex cursor-pointer items-start gap-3 px-4 py-2.5 transition-colors hover:bg-[rgba(255,255,255,0.02)]">
                        <div className={`flex w-[42px] shrink-0 flex-col items-center rounded-[8px] py-1.5 ${isFirst ? "bg-[rgba(94,234,212,0.15)]" : "bg-[rgba(255,255,255,0.04)]"}`}>
                          <span className={`text-[9px] font-semibold uppercase tracking-[0.5px] ${isFirst ? "text-[#a8e895]" : "text-[rgba(232,245,239,0.4)]"}`}>{ev.weekday}</span>
                          <span className={`text-[13px] font-bold tabular-nums leading-none ${isFirst ? "text-[#a8e895]" : "text-brand-cream"}`}>{ev.date.split(" ")[0]}</span>
                          <span className={`text-[9px] ${isFirst ? "text-[#84d4a6]" : "text-[rgba(232,245,239,0.35)]"}`}>{ev.date.split(" ")[1]}</span>
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[12px] font-medium leading-snug text-brand-cream">{ev.title}</p>
                            <span className="mt-0.5 shrink-0 rounded-[4px] px-1.5 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: st.bg, color: st.color }}>
                              {st.icon}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: ev.clientColor + "28", color: ev.clientColor }}>
                              {ev.client}
                            </span>
                            <span className="text-[10px] text-[rgba(232,245,239,0.35)]">{ev.time}</span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                  {allEvents.length === 0 && (
                    <li className="px-4 py-8 text-center text-[12px] text-[rgba(232,245,239,0.3)]">Aucun événement planifié.</li>
                  )}
                </ul>
              </div>
            );
          })()}

        </div>
      )}

      {/* ── Alertes & risques tab ── */}
      {activeTab === "Alertes" && (
        <div className="space-y-6">
          <div>
            <h2 className="mb-3 text-[14px] font-semibold text-brand-cream">
              Comptes à surveiller
              <span className="ml-2 rounded-full bg-[rgba(239,68,68,0.15)] px-2 py-0.5 text-[11px] text-[#ef4444]">{alertClients.length}</span>
            </h2>
            {alertClients.length === 0 ? (
              <div className="rounded-[12px] border border-[rgba(255,255,255,0.07)] px-6 py-8 text-center">
                <p className="text-[13px] text-[rgba(232,245,239,0.45)]">Aucun compte en vigilance ou à risque.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {alertClients.map((c) => {
                  const renewal = renewals.find((r) => r.id === c.id);
                  const cfg = statutConfig(c.statut);
                  return (
                    <div key={c.id} onClick={() => router.push(`/csm/clients/${c.id}`)}
                      className="cursor-pointer rounded-[12px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)] p-4 transition-colors hover:bg-[rgba(255,255,255,0.04)]"
                      style={{ borderLeftColor: cfg.dot, borderLeftWidth: 3 }}>
                      <div className="mb-3 flex items-center gap-2">
                        <ClientAvatar initials={c.initials} color={c.color} size={32} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-semibold text-brand-cream">{c.name}</span>
                            <StatutBadge statut={c.statut} />
                          </div>
                          <div className="mt-0.5 text-[10px] text-[rgba(232,245,239,0.4)]">{c.collab.toLocaleString("fr")} collab</div>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[rgba(232,245,239,0.25)]">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </div>
                      <div className="mb-2">
                        <p className="mb-1 text-[9px] font-semibold uppercase tracking-[1px] text-[rgba(232,245,239,0.35)]">Ateliers</p>
                        <ConsoBar value={c.consoAteliers[0]} max={c.consoAteliers[1]} />
                      </div>
                      {renewal && (
                        <div className="mb-2 flex items-center gap-1.5 rounded bg-[rgba(239,68,68,0.1)] px-2 py-1">
                          <span className="text-[10px] text-[#ef4444]">⏰ Renouvellement dans {renewal.days}j · {renewal.arr} k€</span>
                        </div>
                      )}
                      <p className="text-[10px] text-[rgba(232,245,239,0.45)]">
                        Action : <span className="text-brand-cream">{c.action}</span> · {c.actionDate}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-3 text-[14px] font-semibold text-brand-cream">
              Actions en retard
              <span className="ml-2 rounded-full bg-[rgba(239,68,68,0.15)] px-2 py-0.5 text-[11px] text-[#ef4444]">{overdueActionsList.length}</span>
            </h2>
            {overdueActionsList.length === 0 ? (
              <div className="rounded-[12px] border border-[rgba(255,255,255,0.07)] px-6 py-8 text-center">
                <p className="text-[13px] text-[rgba(232,245,239,0.45)]">Aucune action en retard.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-[12px] border border-[rgba(255,255,255,0.07)]">
                <ul className="divide-y divide-[rgba(255,255,255,0.04)]">
                  {overdueActionsList.map((a) => (
                    <li key={a.id} className="flex items-start gap-3 bg-[rgba(255,255,255,0.01)] px-4 py-3">
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#ef4444]" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] text-brand-cream">{a.text}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {a.clients.map((cl) => (
                            <span key={cl.name} className="rounded px-1.5 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: cl.color + "30", color: cl.color }}>{cl.name}</span>
                          ))}
                          <span className="rounded bg-[rgba(239,68,68,0.15)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.5px] text-[#ef4444]">En retard</span>
                        </div>
                        <p className="mt-1 text-[10px] text-[rgba(232,245,239,0.35)]">{a.echeance}</p>
                      </div>
                      <button onClick={() => toggleDone(a.id)}
                        className="shrink-0 rounded border border-[rgba(255,255,255,0.15)] px-2 py-0.5 text-[10px] text-[rgba(232,245,239,0.5)] transition-colors hover:border-[#22c55e] hover:text-[#22c55e]">
                        Fait
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {urgentRenewals.length > 0 && (
            <div>
              <h2 className="mb-3 text-[14px] font-semibold text-brand-cream">
                Renouvellements urgents (&lt; 30j)
                <span className="ml-2 rounded-full bg-[rgba(239,68,68,0.15)] px-2 py-0.5 text-[11px] text-[#ef4444]">{urgentRenewals.length}</span>
              </h2>
              <div className="overflow-hidden rounded-[12px] border border-[rgba(255,255,255,0.07)]">
                <ul className="divide-y divide-[rgba(255,255,255,0.04)]">
                  {urgentRenewals.map((r) => {
                    const cfg = statutConfig(r.statut);
                    return (
                      <li key={r.id} onClick={() => router.push(`/csm/clients/${r.id}`)}
                        className="flex cursor-pointer items-center gap-3 bg-[rgba(255,255,255,0.01)] px-4 py-3 transition-colors hover:bg-[rgba(255,255,255,0.03)]">
                        <div className="relative shrink-0">
                          <DonutChart pct={1 - r.days / 90} color="#ef4444" size={40} />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[9px] font-bold text-brand-cream">{r.days}j</span>
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[13px] font-semibold text-brand-cream">{r.name}</span>
                            <span className="text-[12px] font-semibold text-[#84d4a6]">{r.arr} k€</span>
                          </div>
                          <p className="mt-0.5 inline-flex items-center gap-1 text-[10px]" style={{ color: cfg.text }}>
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
                            {cfg.label}
                          </p>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[rgba(232,245,239,0.3)]"><path d="M9 18l6-6-6-6" /></svg>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Add action modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAddModal(false)}>
          <div className="w-full max-w-md rounded-[16px] border border-[#1F2832] bg-[#131922] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-[14px] font-semibold text-[#F2F5F8]">Nouvelle action CSM</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[#A7B0BC]">Action</label>
                <input autoFocus type="text" value={newText} onChange={(e) => setNewText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddAction()}
                  placeholder="Décrivez l'action..."
                  className="w-full rounded-[8px] border border-[#1F2832] bg-[#1A2129] px-3 py-2 text-[13px] text-[#F2F5F8] placeholder-[#6B7585] outline-none focus:border-[rgba(94,234,176,0.5)]" />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[#A7B0BC]">Échéance</label>
                <input type="date" value={newEcheance} onChange={(e) => setNewEcheance(e.target.value)}
                  style={{ colorScheme: "dark" }}
                  className="w-full rounded-[8px] border border-[#1F2832] bg-[#1A2129] px-3 py-2 text-[13px] text-[#F2F5F8] outline-none focus:border-[rgba(94,234,176,0.5)]" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowAddModal(false)}
                className="rounded-[8px] px-4 py-2 text-[12px] text-[#A7B0BC] hover:text-[#F2F5F8]">
                Annuler
              </button>
              <button onClick={handleAddAction} disabled={!newText.trim()}
                className="rounded-[8px] bg-[#5EEAB0] px-4 py-2 text-[12px] font-semibold text-[#0A2018] transition-[filter] hover:brightness-105 disabled:opacity-40">
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
