"use client";
import { useState, useEffect, useCallback } from "react";
import {
  workshops as defaultWorkshops,
  themes,
  type Workshop,
  type Theme,
  type ProgrammeStep,
} from "@/app/(client)/catalogue-ateliers/data";

export type { Workshop, Theme, ProgrammeStep };
export { themes };

export const STORE_KEY = "teale_workshops";

export function useWorkshops() {
  const [workshops, setWorkshops] = useState<Workshop[]>(defaultWorkshops);

  // After hydration, load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORE_KEY);
      if (stored) setWorkshops(JSON.parse(stored) as Workshop[]);
    } catch {}
  }, []);

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORE_KEY || !e.newValue) return;
      try {
        setWorkshops(JSON.parse(e.newValue) as Workshop[]);
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((next: Workshop[]) => {
    setWorkshops(next);
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const addWorkshop = useCallback(
    (w: Workshop) => setWorkshops((prev) => { const n = [...prev, w]; try { localStorage.setItem(STORE_KEY, JSON.stringify(n)); } catch {} return n; }),
    []
  );

  const updateWorkshop = useCallback(
    (updated: Workshop) => setWorkshops((prev) => { const n = prev.map((w) => (w.id === updated.id ? updated : w)); try { localStorage.setItem(STORE_KEY, JSON.stringify(n)); } catch {} return n; }),
    []
  );

  const deleteWorkshop = useCallback(
    (id: string) => setWorkshops((prev) => { const n = prev.filter((w) => w.id !== id); try { localStorage.setItem(STORE_KEY, JSON.stringify(n)); } catch {} return n; }),
    []
  );

  const resetToDefaults = useCallback(
    () => { try { localStorage.removeItem(STORE_KEY); } catch {} setWorkshops(defaultWorkshops); },
    []
  );

  return { workshops, addWorkshop, updateWorkshop, deleteWorkshop, resetToDefaults, persist };
}
