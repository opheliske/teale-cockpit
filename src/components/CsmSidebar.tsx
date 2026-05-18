"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { csmHomeItem, csmNavSections } from "@/lib/navigation-csm";

export default function CsmSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-[rgba(139,92,246,0.15)] bg-[#080b14] text-brand-cream">
      {/* Logo + badge CSM */}
      <div className="px-6 py-7">
        <Link href="/csm" className="inline-flex items-center gap-3" aria-label="Teale CSM — Accueil">
          <Image
            src="/teale-logo.png"
            alt="Teale"
            width={512}
            height={512}
            priority
            className="h-[38px] w-[38px] rounded-lg"
          />
          <span className="rounded-md bg-[rgba(139,92,246,0.2)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[1.5px] text-[#a78bfa]">
            CSM
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {/* Home */}
        <ul className="mb-6 flex flex-col gap-0.5">
          <li>
            <Link
              href={csmHomeItem.href}
              className={`block rounded-md px-3 py-2 text-sm transition-colors hover:bg-[rgba(139,92,246,0.12)] hover:text-[#c4b5fd] ${
                pathname === csmHomeItem.href
                  ? "bg-[rgba(139,92,246,0.15)] text-[#c4b5fd]"
                  : "text-brand-cream"
              }`}
            >
              {csmHomeItem.label}
            </Link>
          </li>
        </ul>

        {/* Sections */}
        {csmNavSections.map((section) => (
          <div key={section.title} className="mb-6">
            <h2 className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgba(167,139,250,0.5)]">
              {section.title}
            </h2>
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`block rounded-md px-3 py-2 text-sm transition-colors hover:bg-[rgba(139,92,246,0.12)] hover:text-[#c4b5fd] ${
                        isActive
                          ? "bg-[rgba(139,92,246,0.15)] text-[#c4b5fd]"
                          : "text-brand-cream"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer — lien vers vue client */}
      <div className="border-t border-[rgba(139,92,246,0.12)] p-4">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-[12px] text-[rgba(167,139,250,0.7)] transition-colors hover:bg-[rgba(139,92,246,0.08)] hover:text-[#c4b5fd]"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 3h6v6" />
            <path d="M10 14 21 3" />
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          </svg>
          Prévisualiser vue client
        </Link>
      </div>
    </aside>
  );
}
