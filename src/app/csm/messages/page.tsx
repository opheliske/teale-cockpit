"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMessageThreads } from "@/lib/use-message-threads";
import { csmClientsStore } from "@/lib/csm-clients-store";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function CsmMessagesPage() {
  const router = useRouter();
  const { threads, loading } = useMessageThreads("csm");
  const [, force] = useState(0);
  useEffect(() => csmClientsStore.subscribe(() => force((n) => n + 1)), []);

  const totalUnread = threads.reduce((n, t) => n + (t.unread > 0 ? 1 : 0), 0);

  return (
    <div className="px-9 py-8">
      <div className="mx-auto max-w-[820px]">
        <header className="mb-6">
          <h1 className="text-[26px] font-semibold tracking-[-0.4px] text-[#e8f5ef]">
            Messages
            {totalUnread > 0 && (
              <span className="ml-2 rounded-full bg-[rgba(230,170,153,0.18)] px-2 py-0.5 text-[12px] font-semibold text-[#E6AA99]">
                {totalUnread} non lu{totalUnread > 1 ? "s" : ""}
              </span>
            )}
          </h1>
          <p className="mt-1 text-[13px] text-[#94a8a0]">
            Toutes vos conversations clients, les plus récentes en premier.
          </p>
        </header>

        {loading ? (
          <p className="py-10 text-center text-[13px] text-[#6b7c75]">Chargement…</p>
        ) : threads.length === 0 ? (
          <p className="rounded-[12px] border border-[#1a3530] bg-[rgba(14,37,32,0.4)] py-10 text-center text-[13px] text-[#94a8a0]">
            Aucune conversation pour l&apos;instant.
          </p>
        ) : (
          <ul className="overflow-hidden rounded-[12px] border border-[#1a3530] divide-y divide-[rgba(255,255,255,0.05)]">
            {threads.map((t) => {
              const client = csmClientsStore.get(t.clientId);
              const unread = t.unread > 0;
              return (
                <li
                  key={`${t.clientId}:${t.threadId}`}
                  onClick={() => router.push(`/csm/clients/${t.clientId}?openPlan=${encodeURIComponent(t.threadId)}`)}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-[rgba(94,234,212,0.05)] ${unread ? "bg-[rgba(230,170,153,0.04)]" : ""}`}
                >
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-bold text-[#06140f]"
                    style={{ background: client?.color ?? "#5eead4" }}
                  >
                    {client?.initials ?? "··"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`truncate text-[14px] ${unread ? "font-semibold text-[#e8f5ef]" : "font-medium text-[#c1d4cc]"}`}>
                        {client?.name ?? "Client"}
                      </span>
                      <span className="shrink-0 text-[11px] text-[#6b7c75]">{timeAgo(t.lastDate)}</span>
                    </div>
                    <p className={`mt-0.5 line-clamp-1 text-[12px] ${unread ? "text-[rgba(232,245,239,0.8)]" : "text-[#94a8a0]"}`}>
                      {t.lastAuthor === "csm" ? "Vous : " : ""}{t.lastText}
                    </p>
                  </div>
                  {unread && (
                    <span className="shrink-0 rounded-full bg-[#E6AA99] px-2 py-[3px] text-[10px] font-bold text-[#3a1410]">
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
