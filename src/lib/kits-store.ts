"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  lancementKits as defaultLancement,
  animationItems as defaultAnimation,
  emailTopicKits as defaultEmails,
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
    Promise.all([
      supabase.from("kits_lancement").select("*").order("id"),
      supabase.from("kits_animation").select("*").order("id"),
      supabase.from("kits_email").select("*").order("id"),
    ]).then(async ([lancement, animation, emails]) => {
      if (lancement.data && lancement.data.length > 0) {
        setLancementKits(lancement.data as LancementKit[]);
      } else {
        await supabase.from("kits_lancement").insert(defaultLancement);
        setLancementKits(defaultLancement);
      }

      if (animation.data && animation.data.length > 0) {
        setAnimationItems(animation.data.map(animationFromRow));
      } else {
        await supabase.from("kits_animation").insert(defaultAnimation.map(animationToRow));
        setAnimationItems(defaultAnimation);
      }

      if (emails.data && emails.data.length > 0) {
        setEmailTopicKits(emails.data as EmailTopicKit[]);
      } else {
        await supabase.from("kits_email").insert(defaultEmails);
        setEmailTopicKits(defaultEmails);
      }
    });
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
