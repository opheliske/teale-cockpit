"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase, ensureSession } from "@/lib/supabase";
import {
  themes,
  type Workshop,
  type Theme,
  type ProgrammeStep,
} from "@/app/(client)/catalogue-ateliers/data";

export type { Workshop, Theme, ProgrammeStep };
export { themes };

function fromRow(row: Record<string, unknown>): Workshop {
  return {
    id: row.id as string,
    title: row.title as string,
    subtitle: row.subtitle as string | undefined,
    themeId: row.theme_id as string,
    objectives: row.objectives as string[],
    programme: row.programme as ProgrammeStep[],
    targetAudience: row.target_audience as string[],
    alreadyAnimated: row.already_animated as boolean,
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
  };
}

export function useWorkshops() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      // Wait for the session to be loaded, otherwise the query goes out
      // anonymous and RLS returns an empty catalogue (intermittently).
      await ensureSession();
      const { data, error } = await supabase
        .from("workshops")
        .select("*")
        .order("created_at");
      if (!alive) return;
      if (error) {
        // Transient failure — keep the current list rather than blanking it.
        console.error("[workshops-store] load", error);
        setLoading(false);
        return;
      }
      // No front-side seeding: an empty table just yields an empty catalogue.
      // The catalogue is seeded once via `npm run seed-catalog` (admin script).
      setWorkshops((data ?? []).map(fromRow));
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const addWorkshop = useCallback(async (w: Workshop) => {
    const { data } = await supabase.from("workshops").insert(toRow(w)).select().single();
    if (data) setWorkshops((prev) => [...prev, fromRow(data)]);
  }, []);

  const updateWorkshop = useCallback(async (updated: Workshop) => {
    const { data } = await supabase
      .from("workshops")
      .update(toRow(updated))
      .eq("id", updated.id)
      .select()
      .single();
    if (data) setWorkshops((prev) => prev.map((w) => (w.id === updated.id ? fromRow(data) : w)));
  }, []);

  const deleteWorkshop = useCallback(async (id: string) => {
    await supabase.from("workshops").delete().eq("id", id);
    setWorkshops((prev) => prev.filter((w) => w.id !== id));
  }, []);

  return { workshops, loading, addWorkshop, updateWorkshop, deleteWorkshop };
}
