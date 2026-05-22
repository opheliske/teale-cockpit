"use client";

import { useEffect } from "react";

// Catches rendering / data-fetch errors anywhere in the client portal.
export default function ClientError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[client] route error", error);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 bg-[#061a16] px-6 text-center">
      <div className="text-[44px]">⚠️</div>
      <div>
        <h1 className="text-[19px] font-semibold text-[#e8f5ef]">
          Une erreur est survenue
        </h1>
        <p className="mt-1.5 text-[13px] text-[#94a8a0]">
          Impossible de charger cette page. Vérifiez votre connexion et réessayez.
        </p>
      </div>
      <button
        onClick={reset}
        className="inline-flex items-center gap-1.5 rounded-[9px] bg-[#5eead4] px-4 py-2 text-[12px] font-semibold text-[#061a16] transition-colors hover:bg-[#7df0db]"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 1 3 6.7" />
          <polyline points="3 21 3 15 9 15" />
        </svg>
        Réessayer
      </button>
    </div>
  );
}
