"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getKitFileUrl, openKitFile } from "@/lib/storage";

// ─────────────────────────────────────────────────────────────────────────────
// Aperçu des fichiers joints aux kits de communication et aux ateliers.
// Vignette inline (image réelle / icône PDF) + clic pour ouvrir un aperçu plein
// écran (image zoomée ou PDF en iframe) avant de télécharger. Les chemins
// « hérités » (sans "/") ne sont pas dans le bucket → ni aperçu ni téléchargement.
// ─────────────────────────────────────────────────────────────────────────────

export type PreviewFile = { path: string; name: string; mimeType?: string };

const IMG_RE = /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i;
const PDF_RE = /\.pdf$/i;
// Word / Excel / PowerPoint — pas affichables nativement par le navigateur ;
// rendus via le visualiseur Office Online (cf. lightbox).
const OFFICE_RE = /\.(docx?|xlsx?|pptx?)$/i;
const OFFICE_MIME_RE = /(msword|wordprocessingml|ms-excel|spreadsheetml|ms-powerpoint|presentationml)/i;

function fileKind(f: PreviewFile): "image" | "pdf" | "office" | "other" {
  const mt = f.mimeType ?? "";
  const hay = `${f.path} ${f.name}`;
  if (mt.startsWith("image/") || IMG_RE.test(hay)) return "image";
  if (mt === "application/pdf" || PDF_RE.test(hay)) return "pdf";
  if (OFFICE_MIME_RE.test(mt) || OFFICE_RE.test(hay)) return "office";
  return "other";
}

function officeGlyph(f: PreviewFile): string {
  const hay = `${f.path} ${f.name}`.toLowerCase();
  if (/\.xlsx?$/.test(hay)) return "📊";
  if (/\.pptx?$/.test(hay)) return "📑";
  return "📝";
}

// Un chemin de stockage valide contient toujours un "/" (category/itemId/file).
const canPreview = (f: PreviewFile) => f.path.includes("/");

function DownloadGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" />
    </svg>
  );
}

/** Grille de vignettes cliquables + lightbox. Renvoie null si aucun fichier. */
export function KitFilePreviewList({ files }: { files: PreviewFile[] }) {
  const [active, setActive] = useState<PreviewFile | null>(null);
  if (files.length === 0) return null;
  return (
    <>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-2.5">
        {files.map((f, i) => (
          <KitFileCard key={`${f.path}-${i}`} file={f} onPreview={() => setActive(f)} />
        ))}
      </ul>
      {active && <KitFileLightbox file={active} onClose={() => setActive(null)} />}
    </>
  );
}

function KitFileCard({ file, onPreview }: { file: PreviewFile; onPreview: () => void }) {
  const kind = fileKind(file);
  const previewable = canPreview(file);
  const [url, setUrl] = useState<string | null>(null);

  // Vignette image : on récupère l'URL signée. Inutile pour les PDF (icône).
  useEffect(() => {
    if (kind !== "image" || !previewable) return;
    let alive = true;
    void getKitFileUrl(file.path).then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [file.path, kind, previewable]);

  return (
    <li className="flex flex-col overflow-hidden rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
      <button
        type="button"
        onClick={previewable ? onPreview : undefined}
        disabled={!previewable}
        title={previewable ? "Aperçu" : "Fichier hérité (re-uploader depuis le catalogue)"}
        className="group relative grid aspect-video w-full place-items-center overflow-hidden bg-[rgba(0,0,0,0.28)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {kind === "image" && url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={file.name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span className="text-[28px] opacity-60" aria-hidden>
            {kind === "pdf" ? "📄" : kind === "office" ? officeGlyph(file) : kind === "image" ? "🖼️" : "📎"}
          </span>
        )}
        {previewable && (
          <span className="absolute inset-0 grid place-items-center bg-black/0 text-[11px] font-semibold text-transparent transition-colors group-hover:bg-black/45 group-hover:text-white">
            🔍 Aperçu
          </span>
        )}
      </button>
      <div className="flex items-center gap-1.5 px-2.5 py-2">
        <span className="min-w-0 flex-1 truncate text-[12px] text-[#e8f5ef]" title={file.name}>
          {file.name}
        </span>
        <button
          type="button"
          onClick={() => void openKitFile(file.path, file.name)}
          disabled={!previewable}
          title="Télécharger"
          aria-label={`Télécharger ${file.name}`}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[rgba(94,234,212,0.4)] text-[#5eead4] transition-colors hover:bg-[rgba(94,234,212,0.12)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <DownloadGlyph />
        </button>
      </div>
    </li>
  );
}

function KitFileLightbox({ file, onClose }: { file: PreviewFile; onClose: () => void }) {
  const kind = fileKind(file);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void getKitFileUrl(file.path).then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [file.path]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  // Portail vers <body> : sinon le `fixed` est « contenu » par la modale
  // (qui a un backdrop-filter/transform) et l'aperçu s'ancre en haut de la
  // modale scrollée au lieu de couvrir le viewport. Le portail le sort de cet
  // ancêtre → centré à l'écran, peu importe où on a cliqué.
  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-black/80 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
    >
      <div
        className="mx-auto flex h-full w-full max-w-[920px] flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-sm text-white" title={file.name}>
            {file.name}
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void openKitFile(file.path, file.name)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#5eead4] px-3.5 py-1.5 text-[12px] font-medium text-[#06140f] transition-colors hover:bg-[#84d4a6]"
            >
              <DownloadGlyph /> Télécharger
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer l'aperçu"
              className="grid h-8 w-8 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M6 18 18 6" />
              </svg>
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-[#0b1e18]">
          {!url ? (
            <div className="grid h-full place-items-center text-sm text-white/50">Chargement…</div>
          ) : kind === "image" ? (
            <div className="grid h-full place-items-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={file.name} className="max-h-full max-w-full object-contain" />
            </div>
          ) : kind === "pdf" ? (
            <iframe src={url} title={file.name} className="h-full w-full bg-white" />
          ) : kind === "office" ? (
            // Word/Excel/PowerPoint : rendu par le visualiseur Office Online.
            // L'URL signée du fichier est transmise aux serveurs Microsoft.
            <iframe
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`}
              title={file.name}
              className="h-full w-full bg-white"
            />
          ) : (
            <div className="grid h-full place-items-center gap-3 p-6 text-center text-sm text-white/60">
              <span className="text-4xl" aria-hidden>📎</span>
              Aperçu indisponible pour ce type de fichier. Utilisez « Télécharger ».
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
