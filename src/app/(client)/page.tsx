"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useActiveClient } from "@/lib/client-context";
import { csmClientsStore, type StoredCsmClient } from "@/lib/csm-clients-store";
import { planStore, type StoredPlanState } from "@/lib/plan-store";
import { csmEventsStore, type CsmEvent } from "@/lib/csm-events-store";
import { docsStore, type StoredDocument } from "@/lib/docs-store";
import { useKitsStore } from "@/lib/kits-store";
import { openClientFile } from "@/lib/storage";
import { countAtelierConsumed } from "@/lib/plan-dates";
import { buildPlanQuarters, calendarQuarter } from "@/lib/plan-quarters";
import { useUnreadComments } from "@/lib/use-unread-comments";
import { useNewCatalogueItems } from "@/lib/use-new-catalogue-items";

// Strip leading emojis / punctuation so the title reads cleanly in the compact
// list — mirrors the same util in the kits-communication page.
function cleanTitle(title: string): string {
  return title.replace(/^[^\p{L}\p{N}]+/u, "").trim();
}

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
  const { animationItems } = useKitsStore();

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

  // Unread chat messages from the CSM, resolved to action titles so the
  // alert card on the home points to the right place. The plan items list
  // is the lookup table — `threadId` is `String(planItem.id)` everywhere
  // we persist a thread.
  const { unread: unreadCommentsClient } = useUnreadComments("client", CLIENT_ID);
  const newCatalogue = useNewCatalogueItems();
  const unreadInbox = useMemo(() => {
    const list: Array<{ threadId: string; title: string; latestText: string; latestDate: string; count: number }> = [];
    for (const u of unreadCommentsClient.values()) {
      const numericId = Number(u.threadId);
      const item = Number.isFinite(numericId)
        ? planItems.find((i) => i.id === numericId)
        : undefined;
      list.push({
        threadId: u.threadId,
        title: item?.title ?? "Action du plan",
        latestText: u.latestText,
        latestDate: u.latestDate,
        count: u.count,
      });
    }
    list.sort((a, b) => b.latestDate.localeCompare(a.latestDate));
    return list;
  }, [unreadCommentsClient, planItems]);

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

  // Use the contract-anchored quarters (same helper as the CSM view + the
  // /mon-planning page). A calendar-quarter heuristic (Jan-Mar = Q1…) is
  // wrong here: StoredPlanItem.quarter is anchored on the contract start,
  // so the items wouldn't match the calendar-based label.
  const planQuarters = useMemo(
    () => buildPlanQuarters(company?.contractStart),
    [company?.contractStart],
  );
  const currentPlanQuarter = useMemo(
    () => planQuarters.find((q) => q.status === "current") ?? planQuarters[0],
    [planQuarters],
  );
  const currentQuarterMonths = useMemo(() => {
    if (!currentPlanQuarter) return "";
    const labels = currentPlanQuarter.months.map((m) => m.label);
    const year = currentPlanQuarter.months[0]?.year;
    return `${labels.join(" · ")}${year ? ` ${year}` : ""}`;
  }, [currentPlanQuarter]);
  // "Temps forts mensuels" (kits_animation) for the current contract quarter,
  // bucketed per month. Each month becomes a card in the home view, so we
  // pre-group here to keep the render lean. PlanQuarterMonth exposes `.en`
  // which matches the animationItem.month values (English month names).
  const currentQuarterMonthsWithKits = useMemo(() => {
    if (!currentPlanQuarter) return [];
    return currentPlanQuarter.months.map((m) => ({
      ...m,
      items: animationItems.filter((a) => a.month === m.en),
    }));
  }, [animationItems, currentPlanQuarter]);

  // Per-quarter overview rendered on the home — themes + progress for the
  // 4 quarters of the contract year. The user wanted a snapshot of "where
  // the project is" without leaving the home page.
  const quartersOverview = useMemo(() => {
    const QUARTER_EMOJI: Record<"Q1" | "Q2" | "Q3" | "Q4", string> = {
      Q1: "🌱", Q2: "📈", Q3: "📊", Q4: "🔄",
    };
    return planQuarters.map((q) => {
      // Calendar bucketing : a stored item is shown under the quarter whose
      // months match its `month` value (Q1 = Jan-Mar, etc.), not the stored
      // `quarter` field — which may be stale on items created under an
      // off-cycle contract anchor.
      const items = planItems.filter((i) => calendarQuarter(i.month, i.quarter) === q.id);
      const total = items.length;
      const done = items.filter((i) => i.done).length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      const months = q.months.map((m) => m.label).join(" · ");
      const year = q.months[0]?.year;
      const theme = plan?.themes?.[q.id] ?? "";
      return {
        id: q.id,
        emoji: QUARTER_EMOJI[q.id],
        status: q.status,
        months,
        year,
        theme,
        total,
        done,
        pct,
      };
    });
  }, [planQuarters, planItems, plan?.themes]);

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
        <div className="mb-7 grid grid-cols-3 gap-3">
          <StatCard
            label="Ateliers consommés"
            value={`${ateliersConsommes} / ${atelierTotal}`}
          />
          <StatCard
            label="Collaborateurs couverts"
            value={company.collab.toLocaleString("fr-FR")}
          />
        </div>

        {/* ── Two columns ── */}
        <div className="grid grid-cols-12 gap-4">

          {/* Plan — 4 trimestres en aperçu */}
          <section className="col-span-7 rounded-[14px] border border-[#1a3530] bg-[rgba(14,37,32,0.4)] p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[15px] font-semibold text-[#e8f5ef]">
                  Votre plan annuel
                </h2>
                <p className="mt-0.5 text-[11px] uppercase tracking-[0.06em] text-[#6b7c75]">
                  Trimestre en cours{currentQuarterMonths ? ` · ${currentQuarterMonths}` : ""}
                </p>
              </div>
              <Link href="/mon-planning" className="shrink-0 text-[12px] text-[#5eead4] hover:underline">
                Voir tout →
              </Link>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {quartersOverview.map((q) => {
                const isCurrent = q.status === "current";
                const isPast = q.status === "past";
                const statusLabel = isPast ? "Terminé" : isCurrent ? "En cours" : "À venir";
                const statusPillStyle = isCurrent
                  ? { background: "#5eead4", color: "#042f2a" }
                  : isPast
                    ? { background: "rgba(168,232,149,0.15)", color: "#a8e895" }
                    : { background: "rgba(255,255,255,0.05)", color: "#94a8a0" };
                // Compact months : "Mars · Avr · Mai" (3-letter abbreviations
                // so the 4 cards fit on a single line inside col-span-7).
                const monthsCompact = q.months
                  .split(" · ")
                  .map((m) => m.slice(0, 3))
                  .join(" · ");
                return (
                  <Link
                    key={q.id}
                    href="/mon-planning"
                    className={`flex flex-col rounded-[12px] border p-2.5 transition-all ${
                      isCurrent
                        ? "border-[rgba(94,234,212,0.35)] bg-[rgba(94,234,212,0.06)] hover:border-[rgba(94,234,212,0.55)] hover:bg-[rgba(94,234,212,0.09)]"
                        : isPast
                          ? "border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] opacity-80 hover:opacity-100 hover:border-[rgba(94,234,212,0.18)]"
                          : "border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(94,234,212,0.18)] hover:bg-[rgba(255,255,255,0.035)]"
                    }`}
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-1">
                      <span className={`text-[11px] font-bold tracking-[0.5px] ${isCurrent ? "text-[#5eead4]" : "text-[#94a8a0]"}`}>
                        {q.emoji}
                      </span>
                      <span
                        className="rounded-[3px] px-[5px] py-[1px] text-[8px] font-bold uppercase tracking-[0.4px]"
                        style={statusPillStyle}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <p className="mb-1.5 text-[9px] uppercase tracking-[0.4px] text-[#6b7c75]" title={`${q.months}${q.year ? ` · ${q.year}` : ""}`}>
                      {monthsCompact}
                    </p>
                    <p
                      className={`mb-2 line-clamp-2 min-h-[30px] text-[12px] font-medium leading-snug ${
                        q.theme ? "text-[#e8f5ef]" : "text-[#6b7c75] italic"
                      }`}
                      title={q.theme || undefined}
                    >
                      {q.theme || "Thème à définir"}
                    </p>
                    <div className="mt-auto">
                      <div className="mb-1 h-[3px] overflow-hidden rounded-full bg-[rgba(255,255,255,0.05)]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${q.pct}%`,
                            background: isCurrent
                              ? "linear-gradient(90deg,#5eead4,#2dd4bf)"
                              : "rgba(168,232,149,0.7)",
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-[#94a8a0]">
                        <span>{q.total === 0 ? "—" : `${q.done}/${q.total}`}</span>
                        {q.total > 0 && <span className="tabular-nums font-semibold text-[#e8f5ef]">{q.pct}%</span>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Right column */}
          <div className="col-span-5 flex flex-col gap-4">

            {/* Nouveaux messages — visible seulement quand il y en a, pour
                ne pas occuper d'espace en temps normal. Lien direct vers le
                suivi projet (la pastille y indique l'action concernée). */}
            {unreadInbox.length > 0 && (
              <section className="rounded-[14px] border border-brand-salmon/40 bg-brand-salmon/[0.06] p-5">
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h2 className="text-[15px] font-semibold text-brand-cream">
                    💬 Nouveaux messages de votre CSM
                    <span className="ml-2 rounded-full bg-brand-salmon/20 px-1.5 py-0.5 text-[11px] font-semibold text-brand-salmon">
                      {unreadInbox.length}
                    </span>
                  </h2>
                  <Link href="/mon-planning" className="shrink-0 text-[12px] text-brand-salmon hover:underline">
                    Voir →
                  </Link>
                </div>
                <ul className="space-y-2">
                  {unreadInbox.slice(0, 3).map((u) => (
                    <li key={u.threadId}>
                      <Link
                        href="/mon-planning"
                        className="flex items-start gap-2.5 rounded-[10px] border border-brand-salmon/15 bg-brand-salmon/[0.04] px-3 py-2 transition-colors hover:border-brand-salmon/35"
                      >
                        <span className="shrink-0 text-sm">💬</span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-medium text-[#e8f5ef]">{u.title}</div>
                          <div className="line-clamp-1 text-[11px] text-[#94a8a0]">{u.latestText}</div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Nouveautés catalogues — un badge par catalogue, visible
                uniquement quand quelque chose a été ajouté depuis la
                dernière visite de la page correspondante. Le clic ouvre
                le catalogue et clear le badge. */}
            {(newCatalogue.ateliers.length > 0 || newCatalogue.kits.length > 0) && (
              <section className="rounded-[14px] border border-[rgba(94,234,212,0.30)] bg-[rgba(94,234,212,0.05)] p-5">
                <h2 className="mb-3 text-[15px] font-semibold text-brand-cream">
                  ✨ Nouveautés dans vos catalogues
                </h2>
                <ul className="space-y-2">
                  {newCatalogue.ateliers.length > 0 && (
                    <li>
                      <Link
                        href="/catalogue-ateliers"
                        className="flex items-center gap-2.5 rounded-[10px] border border-[rgba(94,234,212,0.18)] bg-[rgba(94,234,212,0.04)] px-3 py-2.5 transition-colors hover:border-[rgba(94,234,212,0.4)]"
                      >
                        <span className="shrink-0 text-sm">🎓</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-medium text-[#e8f5ef]">
                            {newCatalogue.ateliers.length} nouveau{newCatalogue.ateliers.length > 1 ? "x" : ""} atelier{newCatalogue.ateliers.length > 1 ? "s" : ""}
                          </div>
                          <div className="text-[11px] text-[#94a8a0]">Découvrir le catalogue d&apos;ateliers</div>
                        </div>
                        <span className="shrink-0 text-[12px] font-semibold text-[#5eead4]">Voir →</span>
                      </Link>
                    </li>
                  )}
                  {newCatalogue.kits.length > 0 && (
                    <li>
                      <Link
                        href="/kits-communication"
                        className="flex items-center gap-2.5 rounded-[10px] border border-[rgba(94,234,212,0.18)] bg-[rgba(94,234,212,0.04)] px-3 py-2.5 transition-colors hover:border-[rgba(94,234,212,0.4)]"
                      >
                        <span className="shrink-0 text-sm">📦</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-medium text-[#e8f5ef]">
                            {newCatalogue.kits.length} nouveau{newCatalogue.kits.length > 1 ? "x" : ""} kit{newCatalogue.kits.length > 1 ? "s" : ""} de communication
                          </div>
                          <div className="text-[11px] text-[#94a8a0]">Découvrir la bibliothèque</div>
                        </div>
                        <span className="shrink-0 text-[12px] font-semibold text-[#5eead4]">Voir →</span>
                      </Link>
                    </li>
                  )}
                </ul>
              </section>
            )}

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
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="text-[15px] font-semibold text-[#e8f5ef]">
                  Documents partagés
                  {docs.length > 0 && (
                    <span className="ml-2 text-[12px] font-normal text-[#94a8a0]">
                      {docs.length > 5 ? `5 sur ${docs.length}` : docs.length}
                    </span>
                  )}
                </h2>
                <Link href="/mon-planning#documents" className="shrink-0 text-[12px] text-[#5eead4] hover:underline">
                  Voir tout →
                </Link>
              </div>
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

        {/* ── Communications du trimestre ── 3 cards (1 par mois du trimestre
            en cours) listant les Temps forts mensuels (kits_animation). */}
        <section className="mt-4 rounded-[14px] border border-[#1a3530] bg-[rgba(14,37,32,0.4)] p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-[#e8f5ef]">
                Communications du trimestre
              </h2>
              <p className="mt-0.5 text-[11px] uppercase tracking-[0.06em] text-[#6b7c75]">
                Kits à relayer chaque mois auprès de vos collaborateurs
                {currentQuarterMonths ? ` · ${currentQuarterMonths}` : ""}
              </p>
            </div>
            <Link href="/kits-communication" className="shrink-0 text-[12px] text-[#5eead4] hover:underline">
              Voir tout →
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {currentQuarterMonthsWithKits.map((m) => {
              const isCurrent = m.status === "current";
              const isPast = m.status === "past";
              return (
                <Link
                  key={m.key}
                  href="/kits-communication"
                  className={`group flex flex-col rounded-[12px] border p-4 transition-all ${
                    isCurrent
                      ? "border-[rgba(94,234,212,0.35)] bg-[rgba(94,234,212,0.05)] hover:border-[rgba(94,234,212,0.55)] hover:bg-[rgba(94,234,212,0.08)]"
                      : isPast
                        ? "border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.015)] opacity-70 hover:opacity-100 hover:border-[rgba(94,234,212,0.18)]"
                        : "border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(94,234,212,0.25)] hover:bg-[rgba(255,255,255,0.035)]"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className={`text-[14px] font-semibold tracking-[0.2px] ${isCurrent ? "text-[#5eead4]" : isPast ? "text-[#6b7c75]" : "text-[#e8f5ef]"}`}>
                      {m.label}
                      <span className="ml-1.5 text-[10px] font-normal text-[#6b7c75]">{m.year}</span>
                    </h3>
                    {isCurrent && (
                      <span className="rounded-[4px] bg-[#5eead4] px-1.5 py-[2px] text-[9px] font-bold uppercase tracking-[0.5px] text-[#042f2a]">
                        En cours
                      </span>
                    )}
                    {isPast && (
                      <span className="text-[9px] uppercase tracking-[0.5px] text-[#6b7c75]">Passé</span>
                    )}
                  </div>

                  {m.items.length === 0 ? (
                    <p className="py-3 text-center text-[11px] italic text-[#6b7c75]">
                      Pas de communication programmée
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {m.items.map((a) => {
                        const isLetsTalk = a.type.toLowerCase().includes("let's talk");
                        return (
                          <li
                            key={a.id}
                            className="flex items-start gap-2 rounded-[8px] bg-[rgba(255,255,255,0.025)] p-2.5"
                          >
                            <span className="shrink-0 text-[15px] leading-none" aria-hidden>
                              {isLetsTalk ? "📺" : "🎵"}
                            </span>
                            <div className="min-w-0 flex-1">
                              <span
                                className={`mb-1 inline-block rounded-[3px] px-1.5 py-[1px] text-[8px] font-bold uppercase tracking-[0.5px] ${
                                  isLetsTalk
                                    ? "bg-[rgba(244,168,154,0.18)] text-[#f4a89a]"
                                    : "bg-[rgba(94,234,212,0.15)] text-[#5eead4]"
                                }`}
                              >
                                {isLetsTalk ? "Let's talk" : "Playlist"}
                              </span>
                              <div className="text-[12px] font-medium leading-snug text-[#e8f5ef]">
                                {cleanTitle(a.title)}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
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
