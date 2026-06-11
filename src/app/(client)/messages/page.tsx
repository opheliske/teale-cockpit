"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useActiveClient } from "@/lib/client-context";
import { useMessageThreads } from "@/lib/use-message-threads";
import { planStore, type StoredPlanState } from "@/lib/plan-store";
import { useCsmName } from "@/lib/use-csm-name";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function ClientMessagesPage() {
  const router = useRouter();
  const { clientId } = useActiveClient();
  const { threads, loading } = useMessageThreads("client", clientId);
  const csmName = useCsmName();
  const [plan, setPlan] = useState<StoredPlanState | null>(() => planStore.getState());

  useEffect(() => {
    if (!clientId) return;
    planStore.load(clientId);
    return planStore.subscribe(() => setPlan(planStore.getState()));
  }, [clientId]);

  const titleByThread = useMemo(() => {
    const m = new Map<string, string>();
    for (const it of plan?.items ?? []) m.set(String(it.id), it.title);
    return m;
  }, [plan]);

  const totalUnread = threads.reduce((n, t) => n + (t.unread > 0 ? 1 : 0), 0);

  return (
    <div className="min-h-full bg-[#061a16] px-9 py-8">
      <div className="mx-auto max-w-[760px]">
        <header className="mb-6">
          <h1 className="text-[26px] font-semibold tracking-[-0.4px] text-brand-cream">
            Messages
            {totalUnread > 0 && (
              <span className="ml-2 rounded-full bg-brand-salmon/20 px-2 py-0.5 text-[12px] font-semibold text-brand-salmon">
                {totalUnread} non lu{totalUnread > 1 ? "s" : ""}
              </span>
            )}
          </h1>
          <p className="mt-1 text-[13px] text-brand-muted-on-dark">
            Vos échanges avec {csmName}, les plus récents en premier.
          </p>
        </header>

        {loading ? (
          <p className="py-10 text-center text-[13px] text-[#6b7c75]">Chargement…</p>
        ) : threads.length === 0 ? (
          <p className="rounded-[12px] border border-brand-border-dark bg-brand-surface py-10 text-center text-[13px] text-brand-muted-on-dark">
            Aucune conversation pour l&apos;instant. Posez vos questions depuis une action de votre suivi projet.
          </p>
        ) : (
          <ul className="divide-y divide-[rgba(255,255,255,0.05)] overflow-hidden rounded-[12px] border border-brand-border-dark">
            {threads.map((t) => {
              const unread = t.unread > 0;
              const title = titleByThread.get(t.threadId) ?? "Action du plan";
              return (
                <li
                  key={t.threadId}
                  onClick={() => router.push(`/mon-planning?openPlan=${encodeURIComponent(t.threadId)}`)}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-brand-teal-bright/[0.05] ${unread ? "bg-brand-salmon/[0.04]" : ""}`}
                >
                  <span className="shrink-0 text-base" aria-hidden>💬</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`truncate text-[14px] ${unread ? "font-semibold text-brand-cream" : "font-medium text-[#c1d4cc]"}`}>
                        {title}
                      </span>
                      <span className="shrink-0 text-[11px] text-[#6b7c75]">{timeAgo(t.lastDate)}</span>
                    </div>
                    <p className={`mt-0.5 line-clamp-1 text-[12px] ${unread ? "text-[rgba(232,245,239,0.8)]" : "text-brand-muted-on-dark"}`}>
                      {t.lastAuthor === "client" ? "Vous : " : `${csmName} : `}{t.lastText}
                    </p>
                  </div>
                  {unread && (
                    <span className="shrink-0 rounded-full bg-brand-salmon px-2 py-[3px] text-[10px] font-bold text-[#3a1410]">
                      {t.unread}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
