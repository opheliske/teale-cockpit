"use client";

import { looksLikeHtml, sanitizeRichHtml } from "@/lib/rich-text";

/**
 * Affiche le corps d'un kit. HTML (saisi via l'éditeur riche) → rendu nettoyé
 * avec mise en forme ; texte brut (anciens kits / templates auto-générés) →
 * rendu tel quel en préservant les sauts de ligne. `className` stylise le
 * conteneur (bordure, padding, scroll…), comme l'ancien <div>.
 */
export function RichText({ body, className = "" }: { body: string; className?: string }) {
  if (looksLikeHtml(body)) {
    return (
      <div
        className={`kit-rich ${className}`}
        dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(body) }}
      />
    );
  }
  return <div className={`whitespace-pre-wrap ${className}`}>{body}</div>;
}
