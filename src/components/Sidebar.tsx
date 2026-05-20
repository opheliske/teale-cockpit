"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navSections } from "@/lib/navigation";
import { useAuth, signOut } from "@/lib/auth";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

export default function Sidebar() {
  const pathname = usePathname();
  const { profile } = useAuth();

  const displayName = profile?.full_name?.trim() || profile?.email || "—";

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-brand-border-dark bg-brand-sidebar text-brand-cream">
      <div className="px-6 py-7">
        <Link href="/" className="inline-block" aria-label="Teale — Accueil">
          <Image
            src="/teale-logo.png"
            alt="Teale"
            width={512}
            height={512}
            priority
            className="h-[38px] w-[38px] rounded-lg"
          />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {navSections.map((section) => (
          <div key={section.title} className="mb-6">
            <h2 className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-muted-on-dark">
              {section.title}
            </h2>
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const isExternal = item.href.startsWith("http");
                const isActive = !isExternal && pathname === item.href;
                const className = `block rounded-md px-3 py-2 text-sm text-brand-cream transition-colors hover:bg-brand-sidebar-hover ${
                  isActive ? "bg-brand-sidebar-hover" : ""
                }`;
                return (
                  <li key={item.href}>
                    {isExternal ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${className} flex items-center gap-2`}
                      >
                        <span>{item.label}</span>
                        <ExternalLinkIcon />
                      </a>
                    ) : (
                      <Link href={item.href} className={className}>
                        {item.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer — connected user + logout */}
      <div className="border-t border-brand-border-dark p-4">
        <div className="flex items-center gap-2.5 rounded-md px-3 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-sidebar-hover text-[10px] font-bold text-brand-accent">
            {getInitials(displayName)}
          </div>
          <span className="flex-1 truncate text-[12px] font-medium text-brand-cream">
            {displayName}
          </span>
          <button
            onClick={() => signOut()}
            title="Se déconnecter"
            className="shrink-0 text-brand-muted-on-dark transition-colors hover:text-[#ef4444]"
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

function ExternalLinkIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="ml-auto shrink-0 opacity-70"
      aria-hidden
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}
