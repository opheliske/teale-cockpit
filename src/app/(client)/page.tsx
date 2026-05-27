"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useActiveClient } from "@/lib/client-context";
import { csmClientsStore, type StoredCsmClient } from "@/lib/csm-clients-store";
import { planStore, type StoredPlanState } from "@/lib/plan-store";
import { csmEventsStore, type CsmEvent } from "@/lib/csm-events-store";
import { docsStore, type StoredDocument } from "@/lib/docs-store";
import { openClientFile } from "@/lib/storage";
import { countAtelierConsumed } from "@/lib/plan-dates";

// ─── Date helpers ─────────────────────────────────────────────────────────────

const FR_MONTHS: Record<string, number> = {
  janvier: 0, février: 1, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5,
  juillet: 6, août: 7, aout: 7, septembre: 8, octobre: 9, novembre: 10,
  décembre: 11, decembre: 11,
};

/** Parses a French date like "15 juin 2026" into a Date (or null). */
function parseFrDate(s: string): Date | null {
  const p = s.trim().toLowerCase().replace(/\./g, "").split(/\s+/);
  if (p.length < 3) return null;
  const d = parseInt(p[0]);
  const m = FR_MONTHS[p[1]];
  const y = parseInt(p[2]);
  if (Number.isNaN(d) || m === undefined || Number.isNaN(y)) return null;
  return new Date(y, m, d);
}

const QUARTER_OF_MONTH = ["Q1", "Q1", "Q1", "Q2", "Q2", "Q2", "Q3", "Q3", "Q3", "Q4", "Q4", "Q4"] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientHomePage() {
  // Active client resolved by ClientGuard (no module-load race).
  const { clientId: CLIENT_ID } = useActiveClient();
  const [company, setCompany] = useState<StoredCsmClient | undefined>(
    () => csmClientsStore.get(CLIENT_ID),
  );
  const [clientsLoaded, setClientsLoaded] = useState(() => csmClientsStore.isLoaded());
  const [plan, setPlan] = useState<StoredPlanState | null>(() => planStore.getState());
  const [events, setEvents] = useState<CsmEvent[]>(() => csmEventsStore.getEvents());
  const [docs, setDocs] = useState<StoredDocument[]>(() => docsStore.getDocs());

  useEffect(() => {
    const unsubClients = csmClientsStore.subscribe(() => {
      setCompany(csmClientsStore.get(CLIENT_ID));
      setClientsLoaded(true);
    });
    planStore.load(CLIENT_ID);
    const unsubPlan = planStore.subscribe(() => setPlan(planStore.getState()));
    const unsubEvents = csmEventsStore.subscribe(() => setEvents([...csmEventsStore.getEvents()]));
    docsStore.load(CLIENT_ID);
    const unsubDocs = docsStore.subscribe(() => setDocs([...docsStore.getDocs()]));
    return () => {
      unsubClients();
      unsubPlan();
      unsubEvents();
      unsubDocs();
    };
  }, [CLIENT_ID]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const dateLabel = useMemo(() => {
    const s = new Date().toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, []);

  // Upcoming events for this client, soonest first.
  const upcoming = useMemo(() => {
    return events
      .filter((e) => e.clientId === CLIENT_ID)
      .map((e) => ({ ...e, when: parseFrDate(e.date) }))
      .filter((e): e is CsmEvent & { when: Date } =>
        e.when !== null && e.when.getTime() >= today.getTime())
      .sort((a, b) => a.when.getTime() - b.when.getTime());
  }, [events, today, CLIENT_ID]);

  // Memo so its identity is stable across renders — otherwise the
  // useMemo deriving `ateliersConsommes` below would re-run every render.
  const planItems = useMemo(() => plan?.items ?? [], [plan]);
  const planDone = planItems.filter((i) => i.done).length;
  const planPct = planItems.length > 0 ? Math.round((planDone / planItems.length) * 100) : 0;

  const atelierTotal = company?.atelierTotal ?? 0;
  // Same semantics as the CSM detail view: an atelier counts as consumed
  // only when its date has passed AND it wasn't cancelled, scoped to the
  // current contract year. `done` is not used as a criterion any more.
  const ateliersConsommes = useMemo(() => {
    const yearNow = today.getFullYear();
    const adapted = planItems.map((i) => ({
      type: i.type,
      month: i.month,
      meta: i.meta,
      cancelled: i.cancelled,
      calendarYear: i.year === "next" ? yearNow + 1 : yearNow,
    }));
    return countAtelierConsumed(adapted, company?.contractStart ?? "", today);
  }, [planItems, company?.contractStart, today]);

  const currentQuarter = QUARTER_OF_MONTH[new Date().getMonth()];
  const quarterItems = planItems.filter((i) => i.quarter === currentQuarter);
  const quarterTheme = plan?.themes?.[currentQuarter] ?? "";

  // ── Loading / not-found states ──
  if (!clientsLoaded) {
    return (
      <div className="flex h-full items-center justify-center bg-[#061a16] text-[#94a8a0]">
        Chargement de votre espace…
      </div>
    );
  }
  if (!company) {
    return (
      <div className="flex h-full items-center justify-center bg-[#061a16] px-6 text-center text-[#94a8a0]">
        <div>
          <p className="text-[15px] text-[#e8f5ef]">Espace client introuvable.</p>
          <p className="mt-1 text-[13px]">Contactez votre CSM Teale.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#061a16] px-9 py-8">
      <div className="mx-auto max-w-[1100px]">

        {/* ── Header ── */}
        <header className="mb-7">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[2.5px] text-[#94a8a0]">
            <span className="h-2 w-2 rounded-full bg-[#5eead4]" />
            {dateLabel}
          </div>
          <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.5px] text-[#e8f5ef]">
            Bonjour, {company.name} 👋
          </h1>
          <p className="mt-1 text-[13px] text-[#94a8a0]">
            Aperçu de votre accompagnement Teale.
          </p>
        </header>

        {/* ── KPI row ── */}
        <div className="mb-7 grid grid-cols-4 gap-3">
          <StatCard
            label="Ateliers consommés"
            value={`${ateliersConsommes} / ${atelierTotal}`}
          />
          <StatCard label="Avancement du plan" value={`${planPct} %`} />
          <StatCard
            label="Prochain rendez-vous"
            value={upcoming[0]?.date ?? "—"}
            small
          />
          <StatCard
            label="Collaborateurs"
            value={company.collab.toLocaleString("fr-FR")}
          />
        </div>

        {/* ── Two columns ── */}
        <div className="grid grid-cols-12 gap-4">

          {/* Plan */}
          <section className="col-span-7 rounded-[14px] border border-[#1a3530] bg-[rgba(14,37,32,0.4)] p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-[#e8f5ef]">
                Votre plan annuel — {currentQuarter}
              </h2>
              <Link href="/mon-planning" className="text-[12px] text-[#5eead4] hover:underline">
                Voir tout →
              </Link>
            </div>
            {quarterTheme && (
              <p className="mb-3 text-[12px] text-[#94a8a0]">{quarterTheme}</p>
            )}
            {quarterItems.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-[#94a8a0]">
                Rien de planifié pour ce trimestre.
              </p>
            ) : (
              <ul className="space-y-2">
                {quarterItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-2.5 rounded-[10px] border border-[#1a3530] bg-[rgba(255,255,255,0.02)] px-3 py-2.5"
                  >
                    <span className="mt-0.5 shrink-0 text-sm">{item.icon || "•"}</span>
                    <div className="min-w-0 flex-1">
                      <div className={`text-[13px] font-medium leading-snug ${item.done ? "text-[#94a8a0] line-through" : "text-[#e8f5ef]"}`}>
                        {item.title}
                      </div>
                      {item.meta && (
                        <div className="mt-0.5 text-[11px] text-[#94a8a0]">{item.meta}</div>
                      )}
                    </div>
                    {item.done && (
                      <span className="mt-0.5 shrink-0 text-[11px] font-bold text-[#a8e895]">✓</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Right column */}
          <div className="col-span-5 flex flex-col gap-4">

            {/* Upcoming events */}
            <section className="rounded-[14px] border border-[#1a3530] bg-[rgba(14,37,32,0.4)] p-5">
              <h2 className="mb-3 text-[15px] font-semibold text-[#e8f5ef]">
                Prochains rendez-vous
              </h2>
              {upcoming.length === 0 ? (
                <p className="py-4 text-center text-[13px] text-[#94a8a0]">
                  Aucun rendez-vous à venir.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {upcoming.slice(0, 5).map((e) => (
                    <li key={e.id} className="flex items-center gap-3">
                      <div className="w-11 shrink-0 rounded-[8px] bg-[rgba(94,234,212,0.08)] px-1.5 py-1 text-center">
                        <div className="text-[9px] uppercase tracking-[0.5px] text-[#5eead4]">{e.weekday}</div>
                        <div className="text-[11px] font-semibold text-[#e8f5ef]">{e.time}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-[#e8f5ef]">{e.title}</div>
                        <div className="text-[11px] text-[#94a8a0]">{e.date}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Documents */}
            <section className="rounded-[14px] border border-[#1a3530] bg-[rgba(14,37,32,0.4)] p-5">
              <h2 className="mb-3 text-[15px] font-semibold text-[#e8f5ef]">
                Documents partagés
              </h2>
              {docs.length === 0 ? (
                <p className="py-4 text-center text-[13px] text-[#94a8a0]">
                  Aucun document partagé.
                </p>
              ) : (
                <ul className="space-y-2">
                  {docs.slice(0, 5).map((doc) => {
                    const file = doc.files?.[0];
                    const row = (
                      <>
                        <span className="shrink-0 text-sm">📄</span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-medium text-[#e8f5ef]">{doc.title}</div>
                          <div className="text-[11px] text-[#94a8a0]">{doc.type} · {doc.date}</div>
                        </div>
                      </>
                    );
                    return (
                      <li key={doc.id}>
                        {file ? (
                          <button
                            type="button"
                            onClick={() => void openClientFile(file.path, file.name)}
                            className="flex w-full items-center gap-2.5 rounded-[10px] border border-[#1a3530] bg-[rgba(255,255,255,0.02)] px-3 py-2.5 text-left transition-colors hover:border-[rgba(94,234,212,0.3)]"
                          >
                            {row}
                          </button>
                        ) : (
                          <div className="flex items-center gap-2.5 rounded-[10px] border border-[#1a3530] bg-[rgba(255,255,255,0.02)] px-3 py-2.5">
                            {row}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-[14px] border border-[#1a3530] bg-[rgba(14,37,32,0.4)] px-4 py-3.5">
      <div className={`font-semibold leading-none text-[#e8f5ef] ${small ? "text-[15px]" : "text-[22px]"}`}>
        {value}
      </div>
      <div className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.8px] text-[#94a8a0]">
        {label}
      </div>
    </div>
  );
}
