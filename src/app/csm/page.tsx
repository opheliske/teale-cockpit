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
    case "SAIN": return { dot: "#22c55e", text: "#22c55e", bg: "rgba(34,197,94,0.12)", label: "Sain" };
    case "VIGILANCE": return { dot: "#f59e0b", text: "#f59e0b", bg: "rgba(245,158,11,0.12)", label: "Vigilance" };
    case "À RISQUE": return { dot: "#ef4444", text: "#ef4444", bg: "rgba(239,68,68,0.12)", label: "À risque" };
  }
}

function consoColor(ratio: number) {
  if (ratio >= 0.7) return "#22c55e";
  if (ratio >= 0.35) return "#f59e0b";
  return "#ef4444";
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
  if (days < 30) return "#ef4444";
  if (days < 60) return "#f59e0b";
  if (days < 90) return "#eab308";
  return "#22c55e";
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

const AGENDA_EVENTS: AgendaEvent[] = [];

function eventStyle(type: AgendaEvent["type"]) {
  switch (type) {
    case "call":    return { icon: "📞", color: "#ef4444", bg: "rgba(239,68,68,0.12)" };
    case "atelier": return { icon: "🎓", color: "#5eead4", bg: "rgba(94,234,212,0.1)" };
    case "csm":     return { icon: "💬", color: "#84d4a6", bg: "rgba(94,234,212,0.12)" };
    case "qbr":     return { icon: "📊", color: "#22c55e", bg: "rgba(34,197,94,0.12)" };
    case "kit":     return { icon: "📢", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" };
  }
}

type RecentActivity = { clientId: string; initials: string; color: string; name: string; ago: string; action: string };

const RECENT_ACTIVITY: RecentActivity[] = [];

// ─── Sub-components ───────────────────────────────────────────────────────────

function DonutChart({ pct, color, size = 64 }: { pct: number; color: string; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(1, pct)));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
    </svg>
  );
}

function ConsoBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(value / max, 1);
  const color = consoColor(pct);
  return (
    <div className="flex flex-col gap-0.5">
      <div className="h-1 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
      </div>
      <span className="text-[11px] tabular-nums text-[rgba(232,245,239,0.6)]">{value} / {max}</span>
    </div>
  );
}

function StatutBadge({ statut }: { statut: Statut }) {
  const cfg = statutConfig(statut);
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function ClientAvatar({ initials, color, size = 32 }: { initials: string; color: string; size?: number }) {
  return (
    <div className="flex shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
      style={{ width: size, height: size, backgroundColor: color + "33", color }}>
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
  const sainCount = allClients.filter((c) => c.statut === "SAIN").length;
  const vigilanceCount = allClients.filter((c) => c.statut === "VIGILANCE").length;
  const risqueCount = allClients.filter((c) => c.statut === "À RISQUE").length;
  const renewalARR = renewals.reduce((s, r) => s + (r.arr || 0), 0);
  const pendingActionsCount = actions.filter((a) => !doneIds.has(a.id)).length;
  const overdueActionsCount = actions.filter((a) => !!a.overdue && !doneIds.has(a.id)).length;

  const FILTER_LABELS: Record<Filter, string> = {
    Tous: `Tous (${allClients.length})`,
    Sains: `Sains (${sainCount})`,
    Vigilance: `Vigilance (${vigilanceCount})`,
    Risque: `Risque (${risqueCount})`,
    Renouvellement: "Renouvellement < 90j",
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
    <div className="min-h-screen px-7 py-6 text-brand-cream">
      {/* Header */}
      <div className="mb-5">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[2px] text-[#22c55e]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
          {dateStr}
        </div>
        <h1 className="text-[28px] font-bold tracking-[-0.5px] text-brand-cream">
          Bonjour{firstName ? ` ${firstName}` : ""} 👋
        </h1>
        <p className="mt-1 max-w-[640px] text-[13px] leading-relaxed text-[#94a8a0]">
          Voici l&apos;état de votre portefeuille de {allClients.length} comptes Teale.{" "}
          {vigilanceCount + risqueCount > 0
            ? `${vigilanceCount + risqueCount} client${vigilanceCount + risqueCount > 1 ? "s" : ""} demandent votre attention`
            : "Tous les clients sont en bonne santé"}
          {urgentRenewals.length > 0
            ? `, et vous avez ${urgentRenewals.length} renouvellement${urgentRenewals.length > 1 ? "s" : ""} à prioriser ce mois-ci.`
            : "."}
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 border-b border-[rgba(255,255,255,0.06)] pb-0">
        {([
          { label: "Portfolio",        key: "Portfolio" as const },
          { label: "Activités et RDV", key: "Activites" as const },
          { label: "Alertes & risques",key: "Alertes" as const },
        ]).map(({ label, key }) => {
          const isActive = activeTab === key;
          const alertBadge = vigilanceCount + risqueCount + overdueActionsCount;
          return (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`-mb-px rounded-t-md px-4 py-2 text-[13px] font-medium transition-colors ${
                isActive
                  ? "border border-b-[#061a16] border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] text-brand-cream"
                  : "text-[rgba(232,245,239,0.45)] hover:text-[rgba(232,245,239,0.8)]"
              }`}
            >
              {label}
              {key === "Alertes" && alertBadge > 0 && (
                <span className="ml-1.5 rounded-full bg-[rgba(239,68,68,0.2)] px-1.5 py-0.5 text-[10px] font-bold text-[#ef4444]">
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
          <div className="mb-6 grid grid-cols-4 gap-3">
            <div className="rounded-[14px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] p-4">
              <p className="mb-3 text-[11px] font-semibold text-brand-cream">Santé du portefeuille</p>
              <div className="mb-2 flex items-end gap-3">
                <div className="text-center">
                  <div className="text-[26px] font-bold tabular-nums leading-none text-[#22c55e]">{sainCount}</div>
                  <div className="mt-1 text-[9px] font-semibold uppercase tracking-[1px] text-[rgba(232,245,239,0.4)]">Sains</div>
                </div>
                <div className="text-center">
                  <div className="text-[26px] font-bold tabular-nums leading-none text-[#f59e0b]">{vigilanceCount}</div>
                  <div className="mt-1 text-[9px] font-semibold uppercase tracking-[1px] text-[rgba(232,245,239,0.4)]">Vigilance</div>
                </div>
                <div className="text-center">
                  <div className="text-[26px] font-bold tabular-nums leading-none text-[#ef4444]">{risqueCount}</div>
                  <div className="mt-1 text-[9px] font-semibold uppercase tracking-[1px] text-[rgba(232,245,239,0.4)]">Risque</div>
                </div>
              </div>
              <p className="text-[11px] text-[rgba(232,245,239,0.45)]">{allClients.length} comptes actifs · {risqueCount} à risque de churn</p>
            </div>

            <div className="rounded-[14px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] p-4">
              <p className="mb-2 text-[11px] font-semibold text-brand-cream">Renouvellements à venir</p>
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <DonutChart pct={allClients.length > 0 ? renewals.length / allClients.length : 0} color="#f59e0b" size={68} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[14px] font-bold text-brand-cream">{renewals.length}/{allClients.length}</span>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-[rgba(232,245,239,0.55)]">{renewals.length} contrats à fermer d&apos;ici 90 jours sur {allClients.length} comptes</p>
                  <p className="mt-1.5 text-[12px] font-semibold text-brand-cream">{renewalARR} k€ ARR concerné</p>
                </div>
              </div>
            </div>

            <div className="rounded-[14px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] p-4">
              <p className="mb-2 text-[11px] font-semibold text-brand-cream">Actions CSM</p>
              <div className="mb-1 text-[40px] font-bold tabular-nums leading-none text-brand-cream">{pendingActionsCount}</div>
              <div className="mb-1 text-[9px] font-semibold uppercase tracking-[1.5px] text-[rgba(232,245,239,0.4)]">À traiter</div>
              <p className="text-[11px] text-[rgba(232,245,239,0.45)]">Tâches cross-clients en cours</p>
              {overdueActionsCount > 0 && (
                <p className="mt-1 text-[11px] font-medium text-[#ef4444]">{overdueActionsCount} en retard</p>
              )}
            </div>
          </div>

          {/* Two-column layout: table + right col */}
          <div className="grid grid-cols-[1fr_300px] gap-4">
            {/* Portfolio table */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[16px] font-semibold text-brand-cream">Mon portefeuille</h2>
                <span className="text-[11px] text-[rgba(232,245,239,0.4)]">{allClients.length} comptes · Année contrat 2025—2026</span>
              </div>
              <div className="mb-3 flex gap-1">
                {FILTERS.map((f) => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                      filter === f ? "bg-[rgba(94,234,212,0.2)] text-[#a8e895]" : "text-[rgba(232,245,239,0.5)] hover:text-[rgba(232,245,239,0.8)]"
                    }`}>
                    {FILTER_LABELS[f]}
                  </button>
                ))}
              </div>
              <div className="mb-3 flex h-8 items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[rgba(232,245,239,0.3)]">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input type="text" placeholder="Rechercher un client..." value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-[12px] text-brand-cream placeholder-[rgba(232,245,239,0.3)] outline-none" />
              </div>
              <div className="overflow-hidden rounded-[12px] border border-[rgba(255,255,255,0.07)]">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
                      {["Client", "Statut", "Conso ateliers", "Action prioritaire", "Renouvellement"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[1.2px] text-[rgba(232,245,239,0.35)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c, i) => (
                      <tr key={c.name} onClick={() => router.push(`/csm/clients/${c.id}`)}
                        className={`cursor-pointer border-b border-[rgba(255,255,255,0.04)] transition-colors hover:bg-[rgba(255,255,255,0.03)] ${i === filtered.length - 1 ? "border-b-0" : ""}`}>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <ClientAvatar initials={c.initials} color={c.color} size={28} />
                            <div>
                              <div className="text-[12px] font-medium text-brand-cream leading-none">{c.name}</div>
                              <div className="mt-0.5 text-[10px] text-[rgba(232,245,239,0.4)]">
                                {c.collab.toLocaleString("fr")} collab
                                {c.tag ? <> · <span className="text-[rgba(94,234,212,0.7)]">{c.tag}</span></> : ""}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5"><StatutBadge statut={c.statut} /></td>
                        <td className="px-3 py-2.5 w-[100px]"><ConsoBar value={c.consoAteliers[0]} max={c.consoAteliers[1]} /></td>
                        <td className="px-3 py-2.5">
                          <div className="text-[11px] text-brand-cream">{c.action}</div>
                          <div className="text-[10px] text-[rgba(232,245,239,0.4)]">{c.actionDate}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="text-[11px] text-brand-cream">{c.renouvDate}</div>
                          <div className="text-[10px] font-medium text-[rgba(94,234,212,0.8)]">{c.arr} k€</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.06)] px-4 py-2.5">
                  <span className="text-[11px] text-[rgba(232,245,239,0.35)]">
                    {filtered.length} affichés sur {allClients.length} · trié par alerte décroissante
                  </span>
                  <button onClick={() => router.push("/csm/suivi-clients")}
                    className="text-[11px] font-medium text-[#84d4a6] hover:text-[#a8e895]">
                    Voir tous les comptes →
                  </button>
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-4">
              {/* Actions CSM */}
              <div className="rounded-[14px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)]">
                <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] px-4 py-3">
                  <h3 className="text-[13px] font-semibold text-brand-cream">Actions CSM</h3>
                  <span className="text-[11px] text-[rgba(232,245,239,0.4)]">{pendingActionsCount} à traiter</span>
                </div>
                <ul className="divide-y divide-[rgba(255,255,255,0.04)]">
                  {actions.map((a) => {
                    const isDone = doneIds.has(a.id);
                    return (
                      <li key={a.id} className="px-4 py-3">
                        <div className="flex gap-2.5">
                          <button onClick={() => toggleDone(a.id)}
                            className={`mt-0.5 h-3.5 w-3.5 shrink-0 rounded border transition-colors ${
                              isDone ? "border-[#22c55e] bg-[rgba(34,197,94,0.2)]" : "border-[rgba(255,255,255,0.2)] hover:border-[rgba(255,255,255,0.4)]"
                            }`}>
                            {isDone && <svg viewBox="0 0 12 12" fill="none" className="h-full w-full p-0.5"><path d="M2 6l3 3 5-5" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className={`text-[12px] leading-snug ${isDone ? "text-[rgba(232,245,239,0.4)] line-through" : "text-brand-cream"}`}>{a.text}</p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1">
                              {a.clients.slice(0, 3).map((cl) => (
                                <span key={cl.name} className="rounded px-1.5 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: cl.color + "30", color: cl.color }}>{cl.name}</span>
                              ))}
                              {a.clients.length > 3 && <span className="rounded bg-[rgba(255,255,255,0.07)] px-1.5 py-0.5 text-[9px] text-[rgba(232,245,239,0.5)]">+{a.clients.length - 3}</span>}
                              {a.overdue && !isDone && <span className="rounded bg-[rgba(239,68,68,0.15)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.5px] text-[#ef4444]">En retard</span>}
                            </div>
                            <p className="mt-1 text-[10px] text-[rgba(232,245,239,0.35)]">{a.echeance}</p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div className="border-t border-[rgba(255,255,255,0.06)] px-4 py-2.5">
                  <button onClick={() => setShowAddModal(true)}
                    className="text-[11px] font-medium text-[rgba(94,234,212,0.7)] hover:text-[#a8e895]">
                    + Ajouter une action
                  </button>
                </div>
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
                  <div className="rounded-[14px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)]">
                    <div className="border-b border-[rgba(255,255,255,0.06)] px-4 py-3">
                      <h3 className="text-[13px] font-semibold text-brand-cream">Prochaines churn notices</h3>
                      <p className="mt-0.5 text-[10px] text-[rgba(232,245,239,0.4)]">Top 5 · triés par date d&apos;échéance</p>
                    </div>
                    <ul className="divide-y divide-[rgba(255,255,255,0.04)]">
                      {sorted.length === 0 && (
                        <li className="px-4 py-6 text-center text-[11px] text-[rgba(232,245,239,0.4)]">
                          Aucune churn notice à venir.
                        </li>
                      )}
                      {sorted.map((c) => {
                        const col = renewalColor(c.days);
                        const cfg = statutConfig(c.statut);
                        return (
                          <li key={c.id}
                            onClick={() => router.push(`/csm/clients/${c.id}`)}
                            className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-[rgba(255,255,255,0.02)]">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[11px] font-bold"
                              style={{ backgroundColor: c.color + "30", color: c.color }}>
                              {c.initials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate text-[12px] font-semibold text-brand-cream">{c.name}</span>
                                <span className="shrink-0 text-[11px] font-bold tabular-nums" style={{ color: col }}>{c.days}j</span>
                              </div>
                              <div className="mt-0.5 flex items-center gap-1.5">
                                <span className="text-[10px] text-[rgba(232,245,239,0.4)]">{formatIsoFr(c.churnNotice ?? "")}</span>
                                <span className="text-[rgba(232,245,239,0.2)]">·</span>
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
                  </div>
                );
              })()}

            </div>
          </div>

        </>
      )}

      {/* ── Activités et RDV tab ── */}
      {activeTab === "Activites" && (
        <div className="grid grid-cols-[1fr_320px] gap-4">

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
            const allEvents = [...AGENDA_EVENTS, ...dynamicCsm];
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

          {/* Activité récente */}
          <div className="rounded-[14px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)]">
            <div className="border-b border-[rgba(255,255,255,0.06)] px-4 py-3">
              <h3 className="text-[13px] font-semibold text-brand-cream">Activité récente</h3>
              <p className="mt-0.5 text-[10px] text-[rgba(232,245,239,0.4)]">Clients connectés à leur espace</p>
            </div>
            <ul className="divide-y divide-[rgba(255,255,255,0.04)]">
              {RECENT_ACTIVITY.map((a) => (
                <li key={a.clientId}
                  onClick={() => router.push(`/csm/clients/${a.clientId}`)}
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-[rgba(255,255,255,0.02)]">
                  <ClientAvatar initials={a.initials} color={a.color} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[12px] font-semibold text-brand-cream">{a.name}</span>
                      <span className="shrink-0 text-[10px] text-[rgba(232,245,239,0.35)]">{a.ago}</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-[rgba(232,245,239,0.5)]">{a.action}</p>
                  </div>
                  <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: a.ago.includes("h") ? "#22c55e" : "rgba(255,255,255,0.2)" }} />
                </li>
              ))}
              {RECENT_ACTIVITY.length === 0 && (
                <li className="px-4 py-8 text-center text-[12px] text-[rgba(232,245,239,0.3)]">Aucune activité récente.</li>
              )}
            </ul>
            <div className="border-t border-[rgba(255,255,255,0.06)] px-4 py-2.5 text-[10px] text-[rgba(232,245,239,0.3)]">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
                Vert = connecté dans les dernières 24h
              </span>
            </div>
          </div>

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
          <div className="w-full max-w-md rounded-[16px] border border-[rgba(255,255,255,0.1)] bg-[#061a16] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-[14px] font-semibold text-brand-cream">Nouvelle action CSM</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[rgba(232,245,239,0.5)]">Action</label>
                <input autoFocus type="text" value={newText} onChange={(e) => setNewText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddAction()}
                  placeholder="Décrivez l'action..."
                  className="w-full rounded-[8px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-[13px] text-brand-cream placeholder-[rgba(232,245,239,0.3)] outline-none focus:border-[rgba(94,234,212,0.5)]" />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-[rgba(232,245,239,0.5)]">Échéance</label>
                <input type="date" value={newEcheance} onChange={(e) => setNewEcheance(e.target.value)}
                  style={{ colorScheme: "dark" }}
                  className="w-full rounded-[8px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-[13px] text-brand-cream outline-none focus:border-[rgba(94,234,212,0.5)]" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowAddModal(false)}
                className="rounded-[8px] px-4 py-2 text-[12px] text-[rgba(232,245,239,0.5)] hover:text-brand-cream">
                Annuler
              </button>
              <button onClick={handleAddAction} disabled={!newText.trim()}
                className="rounded-[8px] bg-[rgba(94,234,212,0.9)] px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#5eead4] disabled:opacity-40">
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
