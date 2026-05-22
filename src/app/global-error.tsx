"use client";

import { useEffect } from "react";

// Catches errors thrown in the root layout itself. It replaces the whole
// document, so it must render its own <html>/<body> and can't rely on the
// app's global styles — hence the inline styling.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global] fatal error", error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          background: "#061a16",
          color: "#e8f5ef",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          textAlign: "center",
          padding: "0 24px",
        }}
      >
        <div style={{ fontSize: 44 }}>⚠️</div>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 600, margin: 0 }}>
            Une erreur critique est survenue
          </h1>
          <p style={{ fontSize: 13, color: "#94a8a0", marginTop: 6 }}>
            L&apos;application a rencontré un problème inattendu.
          </p>
        </div>
        <button
          onClick={reset}
          style={{
            background: "#5eead4",
            color: "#061a16",
            border: "none",
            borderRadius: 9,
            padding: "8px 16px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}
