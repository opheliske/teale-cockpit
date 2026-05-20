import Link from "next/link";

export default function ClientNotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="text-[44px]">🔍</div>
      <div>
        <h1 className="text-[19px] font-semibold text-[#e8f5ef]">
          Client introuvable
        </h1>
        <p className="mt-1.5 text-[13px] text-[#94a8a0]">
          Ce client n&apos;existe pas ou a été supprimé.
        </p>
      </div>
      <Link
        href="/csm/suivi-clients"
        className="inline-flex items-center gap-1.5 rounded-[9px] bg-[#5eead4] px-4 py-2 text-[12px] font-semibold text-[#061a16] transition-colors hover:bg-[#7df0db]"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Retour au suivi clients
      </Link>
    </div>
  );
}
