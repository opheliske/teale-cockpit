// ─────────────────────────────────────────────────────────────────────────────
// Helpers de texte riche pour les kits de communication.
//
// Le corps d'un kit (lancement / animation / email) est désormais du HTML
// produit par l'éditeur Tiptap (gras, italique, souligné, listes, liens). Il
// est stocké tel quel dans la colonne `body` (text). Ces helpers :
//   • détectent l'HTML vs un ancien texte brut (rétro-compat),
//   • nettoient l'HTML avant affichage (DOMPurify — anti-XSS, défense en
//     profondeur même si Tiptap contraint déjà le schéma),
//   • convertissent texte ⇄ HTML pour l'éditeur et le presse-papier.
//
// Côté client uniquement (DOMPurify a besoin du DOM). Les modales kits ne sont
// rendues qu'au clic, jamais en SSR — donc pas de souci d'hydratation.
// ─────────────────────────────────────────────────────────────────────────────

import DOMPurify from "dompurify";

// Sous-ensemble de mise en forme autorisé — tout le reste (styles inline,
// classes, scripts, images…) est retiré au nettoyage.
const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "s", "del",
  "ul", "ol", "li", "a", "h2", "h3", "blockquote", "code",
];
const ALLOWED_ATTR = ["href", "target", "rel"];

let _hooked = false;
function ensureHooks() {
  if (_hooked || typeof window === "undefined") return;
  // Tout lien ouvre dans un nouvel onglet, sans fuite de `window.opener`.
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if ((node as Element).tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer nofollow");
    }
  });
  _hooked = true;
}

/** Vrai quand la chaîne porte des balises HTML (vs un ancien texte brut). */
export function looksLikeHtml(s: string | null | undefined): boolean {
  return !!s && /<\/?[a-z][\s\S]*>/i.test(s);
}

/** Nettoie l'HTML (Tiptap / presse-papier) au sous-ensemble de mise en forme. */
export function sanitizeRichHtml(html: string): string {
  if (typeof window === "undefined") return "";
  ensureHooks();
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}

/** Convertit un texte brut (sauts de ligne) en HTML simple (paragraphes). */
export function plainTextToHtml(text: string | null | undefined): string {
  const t = (text ?? "").trim();
  if (!t) return "";
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return t
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** Normalise une valeur stockée (HTML ou texte brut hérité) en HTML éditeur. */
export function toEditorHtml(value: string | null | undefined): string {
  const v = value ?? "";
  return looksLikeHtml(v) ? v : plainTextToHtml(v);
}

/** Version texte (avec sauts de ligne et puces) pour le repli presse-papier. */
export function htmlToPlainText(html: string): string {
  if (typeof window === "undefined") return html;
  const div = document.createElement("div");
  div.innerHTML = sanitizeRichHtml(html);
  div.querySelectorAll("li").forEach((li) => li.prepend(document.createTextNode("• ")));
  div.querySelectorAll("br").forEach((br) => br.replaceWith(document.createTextNode("\n")));
  div
    .querySelectorAll("p, li, h2, h3, blockquote")
    .forEach((el) => el.append(document.createTextNode("\n")));
  return (div.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Copie le corps d'un kit dans le presse-papier. Si c'est de l'HTML, on écrit
 * `text/html` (mise en forme préservée au collage dans un mail/Slack) + un
 * `text/plain` de repli. Sinon, simple texte. Retourne `false` si la copie a
 * échoué (presse-papier indisponible).
 */
export async function copyKitBody(body: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) return false;
  const plain = looksLikeHtml(body) ? htmlToPlainText(body) : body;
  try {
    if (
      looksLikeHtml(body) &&
      typeof ClipboardItem !== "undefined" &&
      "write" in navigator.clipboard
    ) {
      const html = sanitizeRichHtml(body);
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        }),
      ]);
      return true;
    }
    await navigator.clipboard.writeText(plain);
    return true;
  } catch {
    try {
      await navigator.clipboard.writeText(plain);
      return true;
    } catch {
      return false;
    }
  }
}
