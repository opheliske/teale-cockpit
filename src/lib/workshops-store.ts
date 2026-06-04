"use client";
import { useSyncExternalStore } from "react";
import { supabase, ensureSession } from "@/lib/supabase";
import { notifyChange, watchChanges } from "@/lib/sync";
import {
  themes,
  type Workshop,
  type Theme,
  type ProgrammeStep,
  type WorkshopKitFile,
} from "@/app/(client)/catalogue-ateliers/data";

export type { Workshop, Theme, ProgrammeStep, WorkshopKitFile };
export { themes };

function fromRow(row: Record<string, unknown>): Workshop {
  const kit = row.communication_kit as WorkshopKitFile[] | null;
  return {
    id: row.id as string,
    title: row.title as string,
    subtitle: row.subtitle as string | undefined,
    themeId: row.theme_id as string,
    objectives: row.objectives as string[],
    programme: row.programme as ProgrammeStep[],
    targetAudience: row.target_audience as string[],
    alreadyAnimated: row.already_animated as boolean,
    communicationKit: kit && kit.length > 0 ? kit : undefined,
  };
}

function toRow(w: Workshop) {
  return {
    id: w.id,
    title: w.title,
    subtitle: w.subtitle ?? null,
    theme_id: w.themeId,
    objectives: w.objectives,
    programme: w.programme,
    target_audience: w.targetAudience,
    already_animated: w.alreadyAnimated ?? false,
    communication_kit: w.communicationKit ?? [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton module-scope store — every consumer shares the same source and is
// kept in sync across tabs/users via sync.ts (see csm-events-store.ts for the
// canonical pattern). The previous per-hook useState version gave each call
// site an independent copy, so a workshop edited in /csm/catalogue stayed
// stale in /csm/kits, the client catalogue and ClientDetailView until reload.
// ─────────────────────────────────────────────────────────────────────────────

let _workshops: Workshop[] = [];
let _loaded = false;
const _listeners = new Set<() => void>();

// Cached snapshot — useSyncExternalStore compares by Object.is, so we only
// rebuild this reference when the data actually changes (never per render).
let _snapshot: { workshops: Workshop[]; loading: boolean } = {
  workshops: _workshops,
  loading: true,
};

function emit() {
  _snapshot = { workshops: _workshops, loading: !_loaded };
  _listeners.forEach((l) => l());
}

async function fetchWorkshops() {
  // Validate (and refresh if needed) the session before the query — otherwise
  // it can go out anonymous and RLS returns an empty catalogue. If the session
  // can't be made usable, skip rather than wiping the current list (see
  // supabase.ts for the rationale).
  if (!(await ensureSession())) {
    _loaded = false; // allow a later ensureLoaded() to retry
    return;
  }
  const { data, error } = await supabase
    .from("workshops")
    .select("*")
    .order("created_at");
  if (error) {
    // Transient failure — keep the current list rather than blanking it.
    console.error("[workshops-store] load", error);
    return;
  }
  // No front-side seeding: an empty table just yields an empty catalogue.
  // The catalogue is seeded once via `npm run seed-catalog` (admin script).
  _workshops = (data ?? []).map(fromRow);
  _loaded = true;
  emit();
}

async function ensureLoaded() {
  if (_loaded) return;
  await fetchWorkshops();
}

// Re-fetch when a workshop changed in another tab or from another user.
watchChanges(["workshops"], () => {
  void fetchWorkshops();
});

async function addWorkshop(w: Workshop) {
  if (!(await ensureSession())) return;
  const { data } = await supabase.from("workshops").insert(toRow(w)).select().single();
  if (data) {
    _workshops = [..._workshops, fromRow(data)];
    emit();
    notifyChange("workshops");
  }
}

async function updateWorkshop(updated: Workshop) {
  if (!(await ensureSession())) return;
  const { data } = await supabase
    .from("workshops")
    .update(toRow(updated))
    .eq("id", updated.id)
    .select()
    .single();
  if (data) {
    _workshops = _workshops.map((w) => (w.id === updated.id ? fromRow(data) : w));
    emit();
    notifyChange("workshops");
  }
}

async function deleteWorkshop(id: string) {
  if (!(await ensureSession())) return;
  await supabase.from("workshops").delete().eq("id", id);
  _workshops = _workshops.filter((w) => w.id !== id);
  emit();
  notifyChange("workshops");
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

export function useWorkshops() {
  const { workshops, loading } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { workshops, loading, addWorkshop, updateWorkshop, deleteWorkshop };
}
