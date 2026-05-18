"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CLIENTS, CLIENT_DETAILS, type PlanItem, type PlanItemType } from "@/lib/clients-data";
import { docsStore, type StoredDocument } from "@/lib/docs-store";

// ─── Styles ───────────────────────────────────────────────────────────────────

const PLAN_STYLE: Record<PlanItemType, { border: string; bg: string; icon: string; label: string }> = {
  atelier: { border: "#c4b5fd", bg: "rgba(196,181,253,0.08)", icon: "🎓", label: "Atelier" },
  kit:     { border: "#5eead4", bg: "rgba(94,234,212,0.06)",  icon: "📢", label: "Kit comm" },
  csm:     { border: "#fde047", bg: "rgba(253,224,71,0.06)",  icon: "📞", label: "Point CSM" },
  qbr:     { border: "#93c5fd", bg: "rgba(96,165,250,0.08)",  icon: "📊", label: "QBR" },
  custom:  { border: "#dced63", bg: "rgba(220,237,99,0.06)",  icon: "⚡", label: "Autre" },
};

const FORMULE_STYLE: Record<string, { bg: string; color: string }> = {
  "holistique":      { bg: "rgba(168,232,149,0.15)", color: "#a8e895" },
  "digital + tokens":{ bg: "rgba(94,234,212,0.12)",  color: "#5eead4" },
  "tokens":          { bg: "rgba(253,224,71,0.12)",   color: "#fde047" },
};

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼";
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "📊";
  return "📎";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlanRow({ item }: { item: PlanItem }) {
  const s = PLAN_STYLE[item.type];
  return (
    <li
      className="flex items-start gap-2.5 rounded-[10px] px-3 py-2.5"
      style={{ borderLeft: `2.5px solid ${s.border}`, background: s.bg }}
    >
      <span className="mt-0.5 shrink-0 text-sm">{item.icon ?? s.icon}</span>
      <div className="min-w-0 flex-1">
        <div className={`text-[13px] font-medium leading-snug ${item.done ? "line-through opacity-40" : "text-[#e8f5ef]"}`}>
          {item.title}
        </div>
        {item.meta && !item.done && (
          <div className="mt-0.5 text-[11px] text-[#94a8a0]">{item.meta}</div>
        )}
      </div>
      <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
        item.done
          ? "border-[#a8e895] bg-[#a8e895] text-[#06241d]"
          : "border-[rgba(255,255,255,0.15)] text-transparent"
      }`}>
        ✓
      </div>
    </li>
  );
}

function DocCard({ doc }: { doc: StoredDocument }) {
  const hasFiles = (doc.files?.length ?? 0) > 0;
  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-[#1a3530] bg-[rgba(14,37,32,0.5)] p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="mb-1 inline-block rounded-[5px] bg-[rgba(94,234,212,0.1)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.8px] text-[#5eead4]">
            {doc.type}
          </span>
          <h4 className="text-[13px] font-medium leading-snug text-[#e8f5ef]">{doc.title}</h4>
          <p className="mt-0.5 text-[11px] text-[#94a8a0]">{doc.date} · {doc.author}</p>
        </div>
      </div>
      {hasFiles ? (
        <div className="space-y-1.5">
          {doc.files!.map((f) => (
            <a
              key={f.id}
              href={f.url}
              download={f.name}
              className="flex items-center gap-2 rounded-[8px] px-3 py-2 text-[12px] transition-colors hover:brightness-110"
              style={{ background: "rgba(94,234,212,0.07)", color: "#5eead4" }}
            >
              <span>{getFileIcon(f.mimeType)}</span>
              <span className="min-w-0 flex-1 truncate text-[#e8f5ef]">{f.name}</span>
              <span className="shrink-0 text-[11px] text-[#94a8a0]">{f.sizeLabel}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>
            </a>
          ))}
        </div>
      ) : (
        <button disabled className="w-full rounded-[9px] border border-[#1a3530] py-2 text-[12px] text-[#94a8a0] opacity-50">
          Bientôt disponible
        </button>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Quarter = "q1" | "q2" | "q3" | "q4";

const QUARTER_CONFIG: Record<Quarter, { label: string; emoji: string }> = {
  q1: { label: "Q1", emoji: "🚀" },
  q2: { label: "Q2", emoji: "🌱" },
  q3: { label: "Q3", emoji: "⚡" },
  q4: { label: "Q4", emoji: "🎯" },
};

export default function ClientSpacePage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : (params.id?.[0] ?? "");

  const client = CLIENTS.find((c) => c.id === id);
  const detail = CLIENT_DETAILS[id];

  const [docs, setDocs] = useState<StoredDocument[]>(() => docsStore.getDocs());
  const [activeQ, setActiveQ] = useState<Quarter>("q2");

  useEffect(() => {
    return docsStore.subscribe(() => setDocs([...docsStore.getDocs()]));
  }, []);

  if (!client || !detail) {
    return (
      <div className="flex h-full items-center justify-center bg-[#061a16] text-[#94a8a0]">
        <div className="text-center">
          <p className="text-[15px]">Espace client introuvable.</p>
          <button onClick={() => router.back()} className="mt-3 text-[13px] text-[#5eead4] hover:underline">
            ← Retour
          </button>
        </div>
      </div>
    );
  }

  const quarterItems: Record<Quarter, PlanItem[]> = {
    q1: detail.planQ1,
    q2: [...detail.planQ2Done, ...detail.planQ2Upcoming],
    q3: detail.planQ3,
    q4: detail.planQ4,
  };

  const quarterThemes: Record<Quarter, string> = {
    q1: "🚀 Lancement & onboarding",
    q2: detail.planQ2Theme,
    q3: detail.planQ3Theme,
    q4: detail.planQ4Theme,
  };

  const quarterPeriods: Record<Quarter, string> = {
    q1: "Janv. – Mars 2026",
    q2: detail.planQ2Period ?? "Avr. – Juin 2026",
    q3: detail.planQ3Period ?? "Juil. – Sept. 2026",
    q4: detail.planQ4Period ?? "Oct. – Déc. 2026",
  };

  const items = quarterItems[activeQ] ?? [];
  const doneCount = items.filter((i) => i.done).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const formuleStyle = FORMULE_STYLE[detail.formule] ?? FORMULE_STYLE["tokens"];

  const atelierDone = detail.atelierTotal - detail.atelierRemaining;
  const atelierPct = detail.atelierTotal > 0 ? Math.round((atelierDone / detail.atelierTotal) * 100) : 0;

  return (
    <div className="min-h-full bg-[#061a16]">

      {/* ── CSM preview banner ── */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[rgba(94,234,212,0.15)] bg-[rgba(6,26,22,0.96)] px-6 py-2.5 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#5eead4]" />
          <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#5eead4]">Mode aperçu CSM</span>
          <span className="text-[11px] text-[#94a8a0]">— vous voyez l'espace tel que le voit <strong className="text-[#e8f5ef]">{client.name}</strong></span>
        </div>
        <Link
          href={`/csm/clients/${id}`}
          className="inline-flex items-center gap-1.5 rounded-[8px] border border-[rgba(94,234,212,0.2)] px-3 py-1.5 text-[11px] font-medium text-[#5eead4] hover:bg-[rgba(94,234,212,0.07)]"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          Retour à la fiche
        </Link>
      </div>

      <div className="mx-auto max-w-[900px] px-8 py-8">

        {/* ── Client header ── */}
        <div className="mb-8 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-[18px] font-bold text-white"
              style={{ backgroundColor: client.color }}
            >
              {client.initials}
            </div>
            <div>
              <h1 className="text-[26px] font-semibold leading-none tracking-[-0.4px] text-[#e8f5ef]">
                {client.name}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{ background: formuleStyle.bg, color: formuleStyle.color }}
                >
                  {detail.formule}
                </span>
                <span className="text-[12px] text-[#94a8a0]">{detail.contractStart} → {detail.contractEnd}</span>
                <span className="text-[12px] text-[#94a8a0]">· CSM : <span className="text-[#e8f5ef]">{detail.csm}</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick stats ── */}
        <div className="mb-8 grid grid-cols-4 gap-3">
          {[
            { label: "Collaborateurs", val: client.collab.toLocaleString("fr-FR") },
            { label: "Ateliers consommés", val: `${atelierDone} / ${detail.atelierTotal}` },
            { label: "RDV / collab / an", val: detail.rdvParCollab },
            { label: "Produits actifs", val: detail.produits.length },
          ].map(({ label, val }) => (
            <div
              key={label}
              className="rounded-[14px] border border-[#1a3530] bg-[rgba(14,37,32,0.4)] px-4 py-3"
            >
              <div className="text-[20px] font-semibold leading-none text-[#e8f5ef]">{val}</div>
              <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.8px] text-[#94a8a0]">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Ateliers progress ── */}
        <div className="mb-8 rounded-[14px] border border-[#1a3530] bg-[rgba(14,37,32,0.4)] p-4">
          <div className="mb-2 flex items-center justify-between text-[12px]">
            <span className="font-medium text-[#e8f5ef]">Consommation ateliers</span>
            <span className="text-[#94a8a0]">{atelierDone} sur {detail.atelierTotal} · {detail.atelierRemaining} restant{detail.atelierRemaining > 1 ? "s" : ""}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${atelierPct}%`,
                background: atelierPct >= 80 ? "#a8e895" : atelierPct >= 50 ? "#5eead4" : "#fde047",
              }}
            />
          </div>
        </div>

        {/* ── One-year plan ── */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-[#e8f5ef]">Votre programme annuel</h2>
            <span className="text-[12px] text-[#94a8a0]">2026</span>
          </div>

          {/* Quarter tabs */}
          <div className="mb-4 flex gap-2">
            {(["q1", "q2", "q3", "q4"] as Quarter[]).map((q) => {
              const qItems = quarterItems[q];
              const qDone = qItems.filter((i) => i.done).length;
              const isActive = activeQ === q;
              const cfg = QUARTER_CONFIG[q];
              return (
                <button
                  key={q}
                  onClick={() => setActiveQ(q)}
                  className="flex min-w-[120px] flex-col gap-0.5 rounded-[12px] border px-4 py-3 text-left transition-all"
                  style={{
                    borderColor: isActive ? "rgba(94,234,212,0.4)" : "#1a3530",
                    background: isActive ? "rgba(94,234,212,0.07)" : "rgba(14,37,32,0.3)",
                  }}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-[1px]" style={{ color: isActive ? "#5eead4" : "#94a8a0" }}>
                    {cfg.emoji} {cfg.label}
                  </span>
                  <span className="line-clamp-1 text-[12px] font-medium text-[#e8f5ef]">
                    {quarterThemes[q] || "—"}
                  </span>
                  <span className="text-[10px] text-[#94a8a0]">
                    {qDone}/{qItems.length} réalisés
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quarter content */}
          <div className="rounded-[14px] border border-[#1a3530] bg-[rgba(14,37,32,0.3)] p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-[#e8f5ef]">{quarterThemes[activeQ]}</p>
                <p className="text-[11px] text-[#94a8a0]">{quarterPeriods[activeQ]}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-1.5 w-[80px] overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${progress}%`, background: "#5eead4" }}
                  />
                </div>
                <span className="text-[12px] font-semibold text-[#5eead4]">{progress}%</span>
              </div>
            </div>

            {items.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-[#94a8a0]">Rien de planifié pour ce trimestre.</p>
            ) : (
              <ul className="space-y-2">
                {items.map((item) => (
                  <PlanRow key={item.id} item={item} />
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── Documents partagés ── */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-[#e8f5ef]">Documents partagés</h2>
            <span className="text-[12px] text-[#94a8a0]">{docs.length} document{docs.length > 1 ? "s" : ""}</span>
          </div>
          {docs.length === 0 ? (
            <p className="text-[13px] text-[#94a8a0]">Aucun document partagé pour le moment.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {docs.map((doc) => (
                <DocCard key={doc.id} doc={doc} />
              ))}
            </div>
          )}
        </div>

        <div className="mt-16 pb-8 text-center text-[11px] text-[rgba(148,168,160,0.4)]">
          Espace client Teale · {client.name}
        </div>
      </div>
    </div>
  );
}
