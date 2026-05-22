import Link from "next/link";

// Root 404 — shown for any unmatched route.
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#061a16] px-6 text-center">
      <div className="text-[44px]">🔍</div>
      <div>
        <h1 className="text-[20px] font-semibold text-[#e8f5ef]">Page introuvable</h1>
        <p className="mt-1.5 text-[13px] text-[#94a8a0]">
          Cette page n&apos;existe pas ou a été déplacée.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 rounded-[9px] bg-[#5eead4] px-4 py-2 text-[12px] font-semibold text-[#061a16] transition-colors hover:bg-[#7df0db]"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
