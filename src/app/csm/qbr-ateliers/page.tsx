"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { csmEventsStore, type CsmEvent } from "@/lib/csm-events-store";
import { supabase, ensureSession } from "@/lib/supabase";
import { csmClientsStore } from "@/lib/csm-clients-store";
import type { StoredPlanItem } from "@/lib/plan-store";

type QbrItem = {
  id: number;
  clientId: string;
  initials: string;
  color: string;
  clientName: string;
  title: string;
  dateLabel: string;
  daysUntil: number;
  deckCreated: boolean;
  meta: string;
  monthGroup: string;
};

type AtelierItem = {
  id: number;
  clientId: string;
  initials: string;
  color: string;
  clientName: string;
  title: string;
  dateLabel: string;
  daysUntil: number;
  participants?: number;
  format?: string;
  monthGroup: string;
};

const FR_MONTHS_LONG = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function parseDayFromMeta(meta: string): number | undefined {
  const m = meta.match(/(?:^|\s)(\d{1,2})\s+(?:janv|fév|mars|avr|mai|juin|juil|ao[uû]t|sept|oct|nov|déc)/i);
  if (!m) return undefined;
  const d = parseInt(m[1], 10);
  return Number.isFinite(d) && d >= 1 && d <= 31 ? d : undefined;
}

function qbrAccentColor(daysUntil: number) {
  if (daysUntil <= 14) return { bar: "#ef4444", badgeBg: "rgba(239,68,68,0.12)", badgeText: "#ef4444", cardBg: "rgba(239,68,68,0.04)", label: `dans ${daysUntil}j` };
  if (daysUntil <= 45) return { bar: "#f59e0b", badgeBg: "rgba(245,158,11,0.12)", badgeText: "#f59e0b", cardBg: "rgba(245,158,11,0.04)", label: `dans ${daysUntil}j` };
  return { bar: "#5eead4", badgeBg: "rgba(94,234,212,0.1)", badgeText: "#5eead4", cardBg: "rgba(94,234,212,0.03)", label: daysUntil >= 230 ? "À planifier" : `dans ${daysUntil}j` };
}

// Persists the deckCreated flag on a single plan item, directly on plan_state.
async function persistDeckCreated(clientId: string, itemId: number, deckCreated: boolean) {
  const { data } = await supabase
    .from("plan_state")
    .select("items")
    .eq("client_id", clientId)
    .single();
  if (!data) return;
  const items = ((data.items as StoredPlanItem[]) ?? []).map((i) =>
    i.id === itemId ? { ...i, deckCreated } : i,
  );
  await supabase
    .from("plan_state")
    .update({ items, updated_at: new Date().toISOString() })
    .eq("client_id", clientId);
}

export default function QbrAteliersPage() {
  const [qbrItems, setQbrItems] = useState<QbrItem[]>([]);
  const [atelierItems, setAtelierItems] = useState<AtelierItem[]>([]);
  // External-store subscription (no setState-in-effect).
  const csmEvents = useSyncExternalStore<CsmEvent[]>(
    csmEventsStore.subscribe,
    csmEventsStore.getEvents,
    csmEventsStore.getEvents,
  );

  // Load upcoming QBR/atelier items from plan_state across every client. The
  // CSM RLS permits the SELECT; client info is taken from the loaded store.
  const loadPlanItems = useCallback(async () => {
    await ensureSession();
    const { data } = await supabase.from("plan_state").select("*");
    if (!data) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yearNow = today.getFullYear();
    const qbr: QbrItem[] = [];
    const atelier: AtelierItem[] = [];
    for (const row of data as Array<{ client_id: string; items: StoredPlanItem[] | null }>) {
      const client = csmClientsStore.get(row.client_id);
      if (!client) continue;
      for (const it of row.items ?? []) {
        if (it.type !== "qbr" && it.type !== "atelier") continue;
        if (it.month == null) continue;
        const year = it.year === "next" ? yearNow + 1 : yearNow;
        const day = parseDayFromMeta(it.meta) ?? 15;
        const date = new Date(year, it.month, day);
        date.setHours(0, 0, 0, 0);
        if (date.getTime() < today.getTime()) continue;
        const daysUntil = Math.max(0, Math.round((date.getTime() - today.getTime()) / 86_400_000));
        const monthName = FR_MONTHS_LONG[it.month];
        const monthGroup = `${monthName} ${year}`;
        const dateLabel = `${day} ${monthName.toLowerCase()} ${year}`;
        const base = {
          id: it.id,
          clientId: row.client_id,
          clientName: client.name,
          initials: client.initials,
          color: client.color,
          title: it.title,
          dateLabel,
          daysUntil,
          monthGroup,
        };
        if (it.type === "qbr") {
          qbr.push({ ...base, deckCreated: it.deckCreated ?? false, meta: it.meta });
        } else {
          atelier.push({ ...base });
        }
      }
    }
    qbr.sort((a, b) => a.daysUntil - b.daysUntil);
    atelier.sort((a, b) => a.daysUntil - b.daysUntil);
    setQbrItems(qbr);
    setAtelierItems(atelier);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect --
     setState in loadPlanItems happens AFTER an async Supabase fetch (and on
     a subsequent client-store notification); the linter can't see through
     the await chain so it flags it. The pattern is intentional. */
  useEffect(() => {
    void loadPlanItems();
    return csmClientsStore.subscribe(() => { void loadPlanItems(); });
  }, [loadPlanItems]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const onCreateDeck = async (item: QbrItem) => {
    setQbrItems((prev) => prev.map((q) => (q.id === item.id ? { ...q, deckCreated: true } : q)));
    await persistDeckCreated(item.clientId, item.id, true);
  };

  const qbrByMonth = qbrItems.reduce<Record<string, QbrItem[]>>((acc, item) => {
    if (!acc[item.monthGroup]) acc[item.monthGroup] = [];
    acc[item.monthGroup].push(item);
    return acc;
  }, {});

  const ateliersByMonth = atelierItems.reduce<Record<string, AtelierItem[]>>((acc, item) => {
    if (!acc[item.monthGroup]) acc[item.monthGroup] = [];
    acc[item.monthGroup].push(item);
    return acc;
  }, {});

  return (
    <div className="px-9 py-8">
      <div className="mx-auto max-w-[1280px]">
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[2.5px] text-[#84d4a6]">
          Espace CSM
        </p>
        <h1 className="mb-8 text-[28px] font-semibold tracking-[-0.4px] text-brand-cream">
          QBR et Ateliers
        </h1>

        <div className="grid grid-cols-[1fr_360px] items-start gap-8">
          {/* ── Left: QBR ── */}
          <div>
            <div className="mb-5 flex items-center gap-3">
              <h2 className="text-[15px] font-semibold text-brand-cream">QBR à préparer</h2>
              <span className="rounded-full bg-[rgba(94,234,212,0.1)] px-2 py-0.5 text-[11px] font-semibold text-[#5eead4]">
                {qbrItems.length}
              </span>
            </div>

            <div className="flex flex-col gap-7">
              {Object.entries(qbrByMonth).map(([month, items]) => (
                <div key={month}>
                  <div className="mb-3 flex items-center gap-3">
                    <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[1.5px] text-[rgba(94,234,212,0.45)]">
                      {month}
                    </span>
                    <div className="h-px flex-1 bg-[rgba(94,234,212,0.1)]" />
                  </div>
                  <div className="flex flex-col gap-3">
                    {items.map((item) => {
                      const accent = qbrAccentColor(item.daysUntil);
                      const created = item.deckCreated;
                      const deckPct = created ? 100 : 0;
                      const deckStatusLabel = created ? "Deck prêt" : "Deck à préparer";
                      return (
                        <div
                          key={item.id}
                          className="flex overflow-hidden rounded-xl border border-[rgba(94,234,212,0.1)]"
                        >
                          <div className="w-1 shrink-0" style={{ backgroundColor: accent.bar }} />
                          <div className="flex-1 p-4" style={{ backgroundColor: accent.cardBg }}>
                            {/* Top row */}
                            <div className="mb-3 flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                                  style={{ backgroundColor: item.color }}
                                >
                                  {item.initials}
                                </div>
                                <div>
                                  <Link
                                    href={`/csm/clients/${item.clientId}`}
                                    className="block text-[13px] font-semibold leading-tight text-brand-cream transition-colors hover:text-[#a8e895]"
                                  >
                                    {item.clientName}
                                  </Link>
                                  <div className="text-[11px] text-[rgba(232,245,239,0.5)]">
                                    {item.title}
                                  </div>
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <div className="text-[12px] font-medium text-brand-cream">
                                  {item.dateLabel}
                                </div>
                                <span
                                  className="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
                                  style={{ backgroundColor: accent.badgeBg, color: accent.badgeText }}
                                >
                                  {accent.label}
                                </span>
                              </div>
                            </div>

                            {/* Deck progress */}
                            <div className="mb-3">
                              <div className="mb-1.5 flex items-center justify-between">
                                <span className="text-[11px] text-[rgba(232,245,239,0.45)]">
                                  {deckStatusLabel}
                                </span>
                                <span className="text-[11px] font-semibold text-brand-cream">
                                  {deckPct}%
                                </span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(94,234,212,0.1)]">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${deckPct}%`,
                                    backgroundColor: accent.bar,
                                    opacity: 0.8,
                                  }}
                                />
                              </div>
                            </div>

                            {/* Footer: meta + CTA */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="min-w-0 truncate text-[11px] text-[rgba(232,245,239,0.38)]">
                                {item.meta}
                              </span>
                              <button
                                onClick={() => void onCreateDeck(item)}
                                disabled={created}
                                className={`shrink-0 rounded-md px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                                  created
                                    ? "cursor-default bg-[rgba(168,232,149,0.1)] text-[#a8e895]"
                                    : "bg-[rgba(94,234,212,0.1)] text-[#5eead4] hover:bg-[rgba(94,234,212,0.18)]"
                                }`}
                              >
                                {created ? "Deck créé ✓" : "Créer le deck →"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Ateliers ── */}
          <div>
            <div className="mb-5 flex items-center gap-3">
              <h2 className="text-[15px] font-semibold text-brand-cream">Ateliers à venir</h2>
              <span className="rounded-full bg-[rgba(94,234,212,0.1)] px-2 py-0.5 text-[11px] font-semibold text-[#5eead4]">
                {atelierItems.length}
              </span>
            </div>

            <div className="flex flex-col gap-7">
              {Object.entries(ateliersByMonth).map(([month, items]) => (
                <div key={month}>
                  <div className="mb-3 flex items-center gap-3">
                    <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[1.5px] text-[rgba(94,234,212,0.45)]">
                      {month}
                    </span>
                    <div className="h-px flex-1 bg-[rgba(94,234,212,0.1)]" />
                  </div>
                  <div className="flex flex-col gap-2">
                    {items.map((item, i) => {
                      const parts = item.dateLabel.split(" ");
                      const isNumeric = /^\d+$/.test(parts[0]);
                      const dayNum = isNumeric ? parts[0] : "~";
                      const monthLabel = isNumeric ? parts.slice(1).join(" ") : parts[0];
                      const dayColor =
                        item.daysUntil <= 3
                          ? "#ef4444"
                          : item.daysUntil <= 14
                          ? "#f59e0b"
                          : "rgba(232,245,239,0.55)";

                      return (
                        <div
                          key={i}
                          className="flex gap-3 rounded-lg border border-[rgba(94,234,212,0.07)] bg-[rgba(94,234,212,0.025)] p-3 transition-colors hover:bg-[rgba(94,234,212,0.05)]"
                        >
                          {/* Date column */}
                          <div className="flex w-9 shrink-0 flex-col items-center pt-0.5">
                            <span
                              className="text-[14px] font-bold leading-none"
                              style={{ color: dayColor }}
                            >
                              {dayNum}
                            </span>
                            <span className="mt-0.5 text-[9px] uppercase tracking-wide text-[rgba(232,245,239,0.3)]">
                              {monthLabel}
                            </span>
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <div className="mb-0.5 flex items-center gap-1.5">
                              <div
                                className="h-1.5 w-1.5 shrink-0 rounded-full"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="truncate text-[12px] font-semibold leading-tight text-brand-cream">
                                {item.title}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                              <Link
                                href={`/csm/clients/${item.clientId}`}
                                className="text-[11px] text-[rgba(232,245,239,0.5)] transition-colors hover:text-[#a8e895]"
                              >
                                {item.clientName}
                              </Link>
                              {item.participants && (
                                <span className="text-[10px] text-[rgba(232,245,239,0.35)]">
                                  · {item.participants} inscrits
                                </span>
                              )}
                              {item.format && (
                                <span className="text-[10px] text-[rgba(232,245,239,0.28)]">
                                  · {item.format}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Points CSM ajoutés depuis le plan ── */}
            {csmEvents.length > 0 && (
              <div className="mt-8">
                <div className="mb-5 flex items-center gap-3">
                  <h2 className="text-[15px] font-semibold text-brand-cream">Points CSM planifiés</h2>
                  <span className="rounded-full bg-[rgba(94,234,212,0.1)] px-2 py-0.5 text-[11px] font-semibold text-[#5eead4]">
                    {csmEvents.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {csmEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-center gap-3 overflow-hidden rounded-xl border border-[rgba(94,234,212,0.12)] bg-[rgba(94,234,212,0.03)] px-4 py-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: ev.clientColor }}>
                        {ev.clientInitials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium leading-snug text-brand-cream">{ev.title}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-[rgba(232,245,239,0.45)]">
                          <Link href={`/csm/clients/${ev.clientId}`} className="hover:text-[#a8e895]">{ev.clientName}</Link>
                          {ev.date && <span>· {ev.date}</span>}
                          {ev.time && <span>· {ev.time}</span>}
                          {ev.responsable && <span>· {ev.responsable}</span>}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-[rgba(94,234,212,0.1)] px-2 py-0.5 text-[10px] font-semibold text-[#5eead4]">
                        📞 CSM
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
