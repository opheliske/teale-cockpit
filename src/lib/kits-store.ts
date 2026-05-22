"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase, ensureSession } from "@/lib/supabase";
import {
  type LancementKit,
  type AnimationItem,
  type EmailTopicKit,
} from "@/app/(client)/kits-communication/data";

export type { LancementKit, AnimationItem, EmailTopicKit };

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
  };
}

export function useKitsStore() {
  const [lancementKits, setLancementKits] = useState<LancementKit[]>([]);
  const [animationItems, setAnimationItems] = useState<AnimationItem[]>([]);
  const [emailTopicKits, setEmailTopicKits] = useState<EmailTopicKit[]>([]);

  useEffect(() => {
    // No front-side seeding (avoids concurrent re-seed races): an empty table
    // just yields an empty list. Catalogue seeding is an admin script.
    let alive = true;
    (async () => {
      // Wait for the session, otherwise the queries go out anonymous and RLS
      // returns empty kit lists (intermittently).
      await ensureSession();
      const [lancement, animation, emails] = await Promise.all([
        supabase.from("kits_lancement").select("*").order("id"),
        supabase.from("kits_animation").select("*").order("id"),
        supabase.from("kits_email").select("*").order("id"),
      ]);
      if (!alive) return;
      if (lancement.error || animation.error || emails.error) {
        // Transient failure — keep the current lists rather than blanking them.
        console.error("[kits-store] load", lancement.error ?? animation.error ?? emails.error);
        return;
      }
      setLancementKits((lancement.data ?? []) as LancementKit[]);
      setAnimationItems((animation.data ?? []).map(animationFromRow));
      setEmailTopicKits((emails.data ?? []) as EmailTopicKit[]);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const addLancementKit = useCallback(async (item: LancementKit) => {
    const { data } = await supabase.from("kits_lancement").insert(item).select().single();
    if (data) setLancementKits((prev) => [...prev, data as LancementKit]);
  }, []);

  const updateLancementKit = useCallback(async (updated: LancementKit) => {
    const { data } = await supabase.from("kits_lancement").update(updated).eq("id", updated.id).select().single();
    if (data) setLancementKits((prev) => prev.map((k) => (k.id === updated.id ? data as LancementKit : k)));
  }, []);

  const deleteLancementKit = useCallback(async (id: string) => {
    await supabase.from("kits_lancement").delete().eq("id", id);
    setLancementKits((prev) => prev.filter((k) => k.id !== id));
  }, []);

  const addAnimationItem = useCallback(async (item: AnimationItem) => {
    const { data } = await supabase.from("kits_animation").insert(animationToRow(item)).select().single();
    if (data) setAnimationItems((prev) => [...prev, animationFromRow(data)]);
  }, []);

  const updateAnimationItem = useCallback(async (updated: AnimationItem) => {
    const { data } = await supabase.from("kits_animation").update(animationToRow(updated)).eq("id", updated.id).select().single();
    if (data) setAnimationItems((prev) => prev.map((a) => (a.id === updated.id ? animationFromRow(data) : a)));
  }, []);

  const deleteAnimationItem = useCallback(async (id: string) => {
    await supabase.from("kits_animation").delete().eq("id", id);
    setAnimationItems((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const addEmailTopicKit = useCallback(async (item: EmailTopicKit) => {
    const { data } = await supabase.from("kits_email").insert(item).select().single();
    if (data) setEmailTopicKits((prev) => [...prev, data as EmailTopicKit]);
  }, []);

  const updateEmailTopicKit = useCallback(async (updated: EmailTopicKit) => {
    const { data } = await supabase.from("kits_email").update(updated).eq("id", updated.id).select().single();
    if (data) setEmailTopicKits((prev) => prev.map((e) => (e.id === updated.id ? data as EmailTopicKit : e)));
  }, []);

  const deleteEmailTopicKit = useCallback(async (id: string) => {
    await supabase.from("kits_email").delete().eq("id", id);
    setEmailTopicKits((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return {
    lancementKits,
    animationItems,
    emailTopicKits,
    addLancementKit,
    updateLancementKit,
    deleteLancementKit,
    addAnimationItem,
    updateAnimationItem,
    deleteAnimationItem,
    addEmailTopicKit,
    updateEmailTopicKit,
    deleteEmailTopicKit,
  };
}
