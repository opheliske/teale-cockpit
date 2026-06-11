"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Lecture d'un lien vidéo : embed YouTube / Vimeo / Loom, fichier vidéo direct
// (.mp4…) dans un <video>, ou lien brut en repli si non reconnu.
// ─────────────────────────────────────────────────────────────────────────────

function resolveVideo(url: string): { kind: "iframe" | "video" | "link"; src: string } {
  const u = url.trim();
  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return { kind: "iframe", src: `https://www.youtube.com/embed/${yt[1]}` };
  const vimeo = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return { kind: "iframe", src: `https://player.vimeo.com/video/${vimeo[1]}` };
  const loom = u.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/);
  if (loom) return { kind: "iframe", src: `https://www.loom.com/embed/${loom[1]}` };
  if (/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(u)) return { kind: "video", src: u };
  return { kind: "link", src: u };
}

export function VideoEmbed({ url }: { url: string }) {
  const v = resolveVideo(url);
  if (v.kind === "iframe") {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-brand-border-dark bg-black">
        <iframe
          src={v.src}
          title="Vidéo"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }
  if (v.kind === "video") {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-brand-border-dark bg-black">
        <video src={v.src} controls className="h-full w-full" />
      </div>
    );
  }
  return (
    <a
      href={v.src}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-accent hover:underline"
    >
      ▶ Ouvrir la vidéo ↗
    </a>
  );
}
