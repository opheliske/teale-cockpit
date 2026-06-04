"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth";

const items = [
  { href: "/admin/utilisateurs", label: "Utilisateurs" },
  { href: "/admin/entreprises", label: "Entreprises" },
];

export default function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-[rgba(94,234,212,0.15)] bg-brand-dark text-brand-cream">
      <div className="px-6 py-7">
        <Link href="/admin" className="inline-flex items-center gap-3" aria-label="Teale Admin — Accueil">
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
              Administration
            </div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
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
      </nav>

      <div className="border-t border-[rgba(94,234,212,0.12)] px-4 py-4">
        <div className="mb-2 truncate text-[12px] text-[rgba(232,245,239,0.7)]" title={email}>
          {email}
        </div>
        <button
          onClick={() => { void signOut(); }}
          className="w-full rounded-[8px] border border-[rgba(94,234,212,0.25)] px-3 py-2 text-[12px] font-medium text-brand-cream transition-colors hover:bg-[rgba(94,234,212,0.1)]"
        >
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
