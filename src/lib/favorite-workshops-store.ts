"use client";

// Server-backed "favorite ateliers" library. The client curates a personal
// shortlist of catalogue workshops from the « Catalogue d'ateliers » page;
// the list lives in Supabase (table client_favorite_workshops), scoped by
// clientId, so it is synchronised across every device and visible to the CSM.
// Nothing is kept in localStorage.
//
// Singleton store + Realtime sync, mirroring atelier-feedback-store.

import { useEffect, useState, useCallback } from "react";
import { supabase, ensureSession } from "@/lib/supabase";
import { notifyChange, watchChanges } from "@/lib/sync";

const TABLE = "client_favorite_workshops";

let _ids: Set<string> = new Set();
let _clientId: string | null = null;
const _listeners = new Set<() => void>();

function notify() {
  _listeners.forEach((l) => l());
}

async function fetchFavorites(clientId: string) {
  if (!(await ensureSession())) return;
  const { data, error } = await supabase
    .from(TABLE)
    .select("workshop_id")
    .eq("client_id", clientId);
  if (error) {
    // Transient failure — keep the cache rather than blanking the list.
    console.error("[favorite-workshops-store] load", error);
    return;
  }
  _ids = new Set((data ?? []).map((r) => r.workshop_id as string));
  notify();
}

watchChanges([TABLE], () => {
  if (_clientId) void fetchFavorites(_clientId);
});

export const favoriteWorkshopsStore = {
  getIds: (): Set<string> => _ids,

  load: async (clientId: string): Promise<void> => {
    _clientId = clientId;
    await fetchFavorites(clientId);
  },

  /** Adds one or more workshops to the favorites (idempotent). */
  add: async (ids: string[]): Promise<void> => {
    const clientId = _clientId;
    if (!clientId) return;
    const fresh = ids.filter((id) => !_ids.has(id));
    if (fresh.length === 0) return;
    if (!(await ensureSession())) return;
    // Optimistic — Realtime / reconcile will confirm.
    _ids = new Set(_ids);
    fresh.forEach((id) => _ids.add(id));
    notify();
    const { error } = await supabase
      .from(TABLE)
      .upsert(
        fresh.map((id) => ({ client_id: clientId, workshop_id: id })),
        { onConflict: "client_id,workshop_id", ignoreDuplicates: true },
      );
    if (error) {
      console.error("[favorite-workshops-store] add", error);
      void fetchFavorites(clientId); // reconcile to the server truth
      return;
    }
    notifyChange(TABLE);
  },

  /** Removes one workshop from the favorites. */
  remove: async (id: string): Promise<void> => {
    const clientId = _clientId;
    if (!clientId || !_ids.has(id)) return;
    if (!(await ensureSession())) return;
    _ids = new Set(_ids);
    _ids.delete(id);
    notify();
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq("client_id", clientId)
      .eq("workshop_id", id);
    if (error) {
      console.error("[favorite-workshops-store] remove", error);
      void fetchFavorites(clientId); // reconcile to the server truth
      return;
    }
    notifyChange(TABLE);
  },

  toggle: async (id: string): Promise<void> => {
    if (_ids.has(id)) await favoriteWorkshopsStore.remove(id);
    else await favoriteWorkshopsStore.add([id]);
  },

  subscribe(listener: () => void): () => void {
    _listeners.add(listener);
    return () => {
      _listeners.delete(listener);
    };
  },
};

/** Reactive access to the client's favorite-ateliers library. */
export function useFavoriteWorkshops(clientId: string) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(
    () => favoriteWorkshopsStore.getIds(),
  );
  useEffect(() => {
    void favoriteWorkshopsStore.load(clientId);
    const unsub = favoriteWorkshopsStore.subscribe(() =>
      setFavoriteIds(favoriteWorkshopsStore.getIds()),
    );
    return unsub;
  }, [clientId]);
  return {
    favoriteIds,
    toggle: useCallback((id: string) => {
      void favoriteWorkshopsStore.toggle(id);
    }, []),
    add: useCallback((ids: Iterable<string>) => {
      void favoriteWorkshopsStore.add([...ids]);
    }, []),
    remove: useCallback((id: string) => {
      void favoriteWorkshopsStore.remove(id);
    }, []),
  };
}
