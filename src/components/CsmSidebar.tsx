"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { csmHomeItem, csmNavSections } from "@/lib/navigation-csm";
import { useAuth, signOut } from "@/lib/auth";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

export default function CsmSidebar() {
  const pathname = usePathname();
  const { profile } = useAuth();

  const displayName = profile?.full_name?.trim() || profile?.email || "—";

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-[rgba(94,234,212,0.15)] bg-brand-dark text-brand-cream">
      {/* Logo + Cockpit CSM */}
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
          <div>
            <div className="text-[13px] font-semibold leading-none text-brand-cream">teale</div>
            <div className="mt-1 text-[9px] font-semibold uppercase tracking-[1.5px] text-[rgba(94,234,212,0.55)]">
              Cockpit CSM
            </div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {/* Home */}
        <ul className="mb-6 flex flex-col gap-0.5">
          <li>
            <Link
              href={csmHomeItem.href}
              className={`block rounded-md px-3 py-2 text-sm transition-colors hover:bg-[rgba(94,234,212,0.12)] hover:text-[#a8e895] ${
                pathname === csmHomeItem.href
                  ? "bg-[rgba(94,234,212,0.15)] text-[#a8e895]"
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
            <h2 className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgba(94,234,212,0.5)]">
              {section.title}
            </h2>
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`block rounded-md px-3 py-2 text-sm transition-colors hover:bg-[rgba(94,234,212,0.12)] hover:text-[#a8e895] ${
                        isActive
                          ? "bg-[rgba(94,234,212,0.15)] text-[#a8e895]"
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

      {/* Footer */}
      <div className="border-t border-[rgba(94,234,212,0.12)] p-4">
        {/* Admin link — only for the admin account */}
        {profile?.role === "admin" && (
          <Link
            href="/admin"
            onClick={() => {
              // Remember where we were so the admin space can offer a precise
              // "back to where I was" link (falls back to /csm).
              try {
                sessionStorage.setItem("teale_admin_return", pathname);
              } catch {}
            }}
            className="mb-2 block rounded-md px-3 py-2 text-sm text-[#a8e895] transition-colors hover:bg-[rgba(94,234,212,0.12)]"
          >
            ⚙️ Administration
          </Link>
        )}
        {/* User + logout */}
        <div className="mb-2 flex items-center gap-2.5 rounded-md px-3 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgba(94,234,212,0.15)] text-[10px] font-bold text-[#5eead4]">
            {getInitials(displayName)}
          </div>
          <span className="flex-1 truncate text-[12px] font-medium text-brand-cream">
            {displayName}
          </span>
          <button
            onClick={() => signOut()}
            title="Se déconnecter"
            className="shrink-0 text-[rgba(94,234,212,0.45)] transition-colors hover:text-[#ef4444]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>

      </div>
    </aside>
  );
}
