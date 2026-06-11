"use client";
import { useSyncExternalStore } from "react";
import { supabase, ensureSession } from "@/lib/supabase";
import {
  type LancementKit,
  type AnimationItem,
  type EmailTopicKit,
  type VisuelKit,
  type VisuelFile,
  type FicheKit,
  type VideoKit,
  type AudId,
} from "@/app/(client)/kits-communication/data";
import { notifyChange, watchChanges } from "@/lib/sync";
import { kitFileLabel } from "@/lib/storage";

export type { LancementKit, AnimationItem, EmailTopicKit, VisuelKit, FicheKit, VideoKit };

function audiencesOf(row: Record<string, unknown>): AudId[] {
  return (row.audiences as AudId[] | null) ?? [];
}

function ficheFromRow(row: Record<string, unknown>): FicheKit {
  return {
    id: row.id as string,
    title: row.title as string,
    language: row.language as FicheKit["language"],
    files: (row.files as VisuelFile[] | null) ?? [],
    audiences: audiencesOf(row),
  };
}

function ficheToRow(f: FicheKit) {
  return { id: f.id, title: f.title, language: f.language, files: f.files ?? [], audiences: f.audiences ?? [] };
}

function videoFromRow(row: Record<string, unknown>): VideoKit {
  return {
    id: row.id as string,
    title: row.title as string,
    language: row.language as VideoKit["language"],
    url: (row.url as string | null) ?? undefined,
    files: (row.files as VisuelFile[] | null) ?? [],
    audiences: audiencesOf(row),
  };
}

function videoToRow(v: VideoKit) {
  return {
    id: v.id,
    title: v.title,
    language: v.language,
    url: v.url?.trim() ? v.url.trim() : null,
    files: v.files ?? [],
    audiences: v.audiences ?? [],
  };
}

function visuelFromRow(row: Record<string, unknown>): VisuelKit {
  const raw = (row.files as VisuelFile[] | null) ?? [];
  const legacyPath = (row.path as string | null) ?? undefined;
  const legacyMime = (row.mime_type as string | null) ?? undefined;
  // Normalise toujours vers `files` : un ancien visuel mono-fichier (path /
  // mime_type sans `files`) est exposé comme un tableau à un seul élément.
  const files: VisuelFile[] =
    raw.length > 0
      ? raw
      : legacyPath
        ? [{ id: `${row.id as string}-0`, path: legacyPath, name: kitFileLabel(legacyPath), mimeType: legacyMime ?? "" }]
        : [];
  return {
    id: row.id as string,
    title: row.title as string,
    category: row.category as VisuelKit["category"],
    files,
    audiences: audiencesOf(row),
    path: legacyPath,
    mimeType: legacyMime,
  };
}

function visuelToRow(v: VisuelKit) {
  const files = v.files ?? [];
  return {
    id: v.id,
    title: v.title,
    category: v.category,
    files,
    audiences: v.audiences ?? [],
    // Compat : path / mime_type = premier fichier (anciens lecteurs).
    path: files[0]?.path ?? null,
    mime_type: files[0]?.mimeType ?? null,
  };
}

function animationFromRow(row: Record<string, unknown>): AnimationItem {
  return {
    id: row.id as string,
    title: row.title as string,
    month: row.month as string,
    type: row.type as string,
    status: row.status as string,
    landing: row.landing as string | undefined,
    languages: row.languages as string[],
    imagesFr: row.images_fr as string[],
    imagesEn: row.images_en as string[],
    pdfFr: row.pdf_fr as string[],
    pdfEn: row.pdf_en as string[],
    body: (row.body as string | null) ?? undefined,
    audiences: audiencesOf(row),
  };
}

function animationToRow(a: AnimationItem) {
  return {
    id: a.id,
    title: a.title,
    month: a.month,
    type: a.type,
    status: a.status,
    landing: a.landing ?? null,
    languages: a.languages,
    images_fr: a.imagesFr,
    images_en: a.imagesEn,
    pdf_fr: a.pdfFr,
    pdf_en: a.pdfEn,
    body: a.body?.trim() ? a.body : null,
    audiences: a.audiences ?? [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton module-scope store — every consumer shares the same source and is
// kept in sync across tabs/users via sync.ts (see csm-events-store.ts for the
// canonical pattern). The previous per-hook useState version gave each call
// site an independent copy, so kits edited in /csm/kits stayed stale in the
// client /kits-communication page and the home page until a full reload.
// ─────────────────────────────────────────────────────────────────────────────

const TABLES = ["kits_lancement", "kits_animation", "kits_email", "kits_visuels", "kits_fiches", "kits_videos"];

let _lancement: LancementKit[] = [];
let _animation: AnimationItem[] = [];
let _email: EmailTopicKit[] = [];
let _visuels: VisuelKit[] = [];
let _fiches: FicheKit[] = [];
let _videos: VideoKit[] = [];
let _loaded = false;
const _listeners = new Set<() => void>();

// Cached snapshot — useSyncExternalStore compares by Object.is, so we only
// rebuild this reference when the data actually changes (never per render).
let _snapshot: {
  lancementKits: LancementKit[];
  animationItems: AnimationItem[];
  emailTopicKits: EmailTopicKit[];
  visuelKits: VisuelKit[];
  ficheKits: FicheKit[];
  videoKits: VideoKit[];
} = {
  lancementKits: _lancement,
  animationItems: _animation,
  emailTopicKits: _email,
  visuelKits: _visuels,
  ficheKits: _fiches,
  videoKits: _videos,
};

function emit() {
  _snapshot = {
    lancementKits: _lancement,
    animationItems: _animation,
    emailTopicKits: _email,
    visuelKits: _visuels,
    ficheKits: _fiches,
    videoKits: _videos,
  };
  _listeners.forEach((l) => l());
}

async function fetchKits() {
  // Validate (and refresh if needed) the session before the queries —
  // otherwise they go out anonymous and RLS returns empty kit lists. If the
  // session can't be made usable, skip rather than blanking the current lists
  // (see supabase.ts for the rationale).
  if (!(await ensureSession())) {
    _loaded = false; // allow a later ensureLoaded() to retry
    return;
  }
  const [lancement, animation, emails, visuels, fiches, videos] = await Promise.all([
    supabase.from("kits_lancement").select("*").order("id"),
    supabase.from("kits_animation").select("*").order("id"),
    supabase.from("kits_email").select("*").order("id"),
    supabase.from("kits_visuels").select("*").order("created_at", { ascending: false }),
    supabase.from("kits_fiches").select("*").order("created_at", { ascending: false }),
    supabase.from("kits_videos").select("*").order("created_at", { ascending: false }),
  ]);
  if (lancement.error || animation.error || emails.error || visuels.error) {
    // Transient failure — keep the current lists rather than blanking them.
    console.error(
      "[kits-store] load",
      lancement.error ?? animation.error ?? emails.error ?? visuels.error,
    );
    return;
  }
  _lancement = (lancement.data ?? []) as LancementKit[];
  _animation = (animation.data ?? []).map(animationFromRow);
  _email = (emails.data ?? []) as EmailTopicKit[];
  _visuels = (visuels.data ?? []).map(visuelFromRow);
  // Fiches & vidéos — tables récentes : on tolère leur absence (migration pas
  // encore appliquée) sans bloquer le reste du catalogue.
  if (fiches.error) console.error("[kits-store] load fiches", fiches.error);
  else _fiches = (fiches.data ?? []).map(ficheFromRow);
  if (videos.error) console.error("[kits-store] load videos", videos.error);
  else _videos = (videos.data ?? []).map(videoFromRow);
  _loaded = true;
  emit();
}

async function ensureLoaded() {
  if (_loaded) return;
  await fetchKits();
}

// Re-fetch when a kit changed in another tab or from another user.
watchChanges(TABLES, () => {
  void fetchKits();
});

async function addLancementKit(item: LancementKit) {
  if (!(await ensureSession())) return;
  const { data } = await supabase.from("kits_lancement").insert(item).select().single();
  if (data) {
    _lancement = [..._lancement, data as LancementKit];
    emit();
    notifyChange("kits_lancement");
  }
}

async function updateLancementKit(updated: LancementKit) {
  if (!(await ensureSession())) return;
  const { data } = await supabase.from("kits_lancement").update(updated).eq("id", updated.id).select().single();
  if (data) {
    _lancement = _lancement.map((k) => (k.id === updated.id ? (data as LancementKit) : k));
    emit();
    notifyChange("kits_lancement");
  }
}

async function deleteLancementKit(id: string) {
  if (!(await ensureSession())) return;
  await supabase.from("kits_lancement").delete().eq("id", id);
  _lancement = _lancement.filter((k) => k.id !== id);
  emit();
  notifyChange("kits_lancement");
}

async function addAnimationItem(item: AnimationItem) {
  if (!(await ensureSession())) return;
  const { data } = await supabase.from("kits_animation").insert(animationToRow(item)).select().single();
  if (data) {
    _animation = [..._animation, animationFromRow(data)];
    emit();
    notifyChange("kits_animation");
  }
}

async function updateAnimationItem(updated: AnimationItem) {
  if (!(await ensureSession())) return;
  const { data } = await supabase.from("kits_animation").update(animationToRow(updated)).eq("id", updated.id).select().single();
  if (data) {
    _animation = _animation.map((a) => (a.id === updated.id ? animationFromRow(data) : a));
    emit();
    notifyChange("kits_animation");
  }
}

async function deleteAnimationItem(id: string) {
  if (!(await ensureSession())) return;
  await supabase.from("kits_animation").delete().eq("id", id);
  _animation = _animation.filter((a) => a.id !== id);
  emit();
  notifyChange("kits_animation");
}

async function addEmailTopicKit(item: EmailTopicKit) {
  if (!(await ensureSession())) return;
  const { data } = await supabase.from("kits_email").insert(item).select().single();
  if (data) {
    _email = [..._email, data as EmailTopicKit];
    emit();
    notifyChange("kits_email");
  }
}

async function updateEmailTopicKit(updated: EmailTopicKit) {
  if (!(await ensureSession())) return;
  const { data } = await supabase.from("kits_email").update(updated).eq("id", updated.id).select().single();
  if (data) {
    _email = _email.map((e) => (e.id === updated.id ? (data as EmailTopicKit) : e));
    emit();
    notifyChange("kits_email");
  }
}

async function deleteEmailTopicKit(id: string) {
  if (!(await ensureSession())) return;
  await supabase.from("kits_email").delete().eq("id", id);
  _email = _email.filter((e) => e.id !== id);
  emit();
  notifyChange("kits_email");
}

async function addVisuelKit(item: VisuelKit) {
  if (!(await ensureSession())) return;
  const { data } = await supabase.from("kits_visuels").insert(visuelToRow(item)).select().single();
  if (data) {
    _visuels = [visuelFromRow(data), ..._visuels];
    emit();
    notifyChange("kits_visuels");
  }
}

async function updateVisuelKit(updated: VisuelKit) {
  if (!(await ensureSession())) return;
  const { data } = await supabase.from("kits_visuels").update(visuelToRow(updated)).eq("id", updated.id).select().single();
  if (data) {
    _visuels = _visuels.map((v) => (v.id === updated.id ? visuelFromRow(data) : v));
    emit();
    notifyChange("kits_visuels");
  }
}

async function deleteVisuelKit(id: string) {
  if (!(await ensureSession())) return;
  await supabase.from("kits_visuels").delete().eq("id", id);
  _visuels = _visuels.filter((v) => v.id !== id);
  emit();
  notifyChange("kits_visuels");
}

async function addFicheKit(item: FicheKit) {
  if (!(await ensureSession())) return;
  const { data } = await supabase.from("kits_fiches").insert(ficheToRow(item)).select().single();
  if (data) {
    _fiches = [ficheFromRow(data), ..._fiches];
    emit();
    notifyChange("kits_fiches");
  }
}

async function updateFicheKit(updated: FicheKit) {
  if (!(await ensureSession())) return;
  const { data } = await supabase.from("kits_fiches").update(ficheToRow(updated)).eq("id", updated.id).select().single();
  if (data) {
    _fiches = _fiches.map((f) => (f.id === updated.id ? ficheFromRow(data) : f));
    emit();
    notifyChange("kits_fiches");
  }
}

async function deleteFicheKit(id: string) {
  if (!(await ensureSession())) return;
  await supabase.from("kits_fiches").delete().eq("id", id);
  _fiches = _fiches.filter((f) => f.id !== id);
  emit();
  notifyChange("kits_fiches");
}

async function addVideoKit(item: VideoKit) {
  if (!(await ensureSession())) return;
  const { data } = await supabase.from("kits_videos").insert(videoToRow(item)).select().single();
  if (data) {
    _videos = [videoFromRow(data), ..._videos];
    emit();
    notifyChange("kits_videos");
  }
}

async function updateVideoKit(updated: VideoKit) {
  if (!(await ensureSession())) return;
  const { data } = await supabase.from("kits_videos").update(videoToRow(updated)).eq("id", updated.id).select().single();
  if (data) {
    _videos = _videos.map((v) => (v.id === updated.id ? videoFromRow(data) : v));
    emit();
    notifyChange("kits_videos");
  }
}

async function deleteVideoKit(id: string) {
  if (!(await ensureSession())) return;
  await supabase.from("kits_videos").delete().eq("id", id);
  _videos = _videos.filter((v) => v.id !== id);
  emit();
  notifyChange("kits_videos");
}

function subscribe(listener: () => void): () => void {
  _listeners.add(listener);
  void ensureLoaded();
  return () => {
    _listeners.delete(listener);
  };
}

function getSnapshot() {
  return _snapshot;
}

export function useKitsStore() {
  const { lancementKits, animationItems, emailTopicKits, visuelKits, ficheKits, videoKits } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  );
  return {
    lancementKits,
    animationItems,
    emailTopicKits,
    visuelKits,
    ficheKits,
    videoKits,
    addLancementKit,
    updateLancementKit,
    deleteLancementKit,
    addAnimationItem,
    updateAnimationItem,
    deleteAnimationItem,
    addEmailTopicKit,
    updateEmailTopicKit,
    deleteEmailTopicKit,
    addVisuelKit,
    updateVisuelKit,
    deleteVisuelKit,
    addFicheKit,
    updateFicheKit,
    deleteFicheKit,
    addVideoKit,
    updateVideoKit,
    deleteVideoKit,
  };
}
