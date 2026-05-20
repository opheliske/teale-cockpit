"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  workshops as defaultWorkshops,
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
    (async () => {
      // Wait for the session before querying — otherwise the request can go
      // out unauthenticated and the seed logic would misfire.
      await supabase.auth.getUser();
      const { data } = await supabase
        .from("workshops")
        .select("*")
        .order("created_at");
      if (data && data.length > 0) {
        setWorkshops(data.map(fromRow));
      } else {
        const { data: seeded } = await supabase
          .from("workshops")
          .insert(defaultWorkshops.map(toRow))
          .select();
        setWorkshops(seeded ? seeded.map(fromRow) : defaultWorkshops);
      }
      setLoading(false);
    })();
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

  const resetToDefaults = useCallback(async () => {
    await supabase.from("workshops").delete().neq("id", "");
    const { data } = await supabase.from("workshops").insert(defaultWorkshops.map(toRow)).select();
    setWorkshops(data ? data.map(fromRow) : defaultWorkshops);
  }, []);

  const persist = useCallback(async (next: Workshop[]) => {
    setWorkshops(next);
    await supabase.from("workshops").delete().neq("id", "");
    await supabase.from("workshops").insert(next.map(toRow));
  }, []);

  return { workshops, loading, addWorkshop, updateWorkshop, deleteWorkshop, resetToDefaults, persist };
}
