"use client";
import { useState, useEffect, useCallback } from "react";
import {
  lancementKits as defaultLancement,
  animationItems as defaultAnimation,
  emailTopicKits as defaultEmails,
  type LancementKit,
  type AnimationItem,
  type EmailTopicKit,
} from "@/app/(client)/kits-communication/data";

export type { LancementKit, AnimationItem, EmailTopicKit };

const KEY_LANCEMENT = "teale_lancement_kits";
const KEY_ANIMATION = "teale_animation_items";
const KEY_EMAILS = "teale_email_kits";

export function useKitsStore() {
  const [lancementKits, setLancementKits] = useState<LancementKit[]>(defaultLancement);
  const [animationItems, setAnimationItems] = useState<AnimationItem[]>(defaultAnimation);
  const [emailTopicKits, setEmailTopicKits] = useState<EmailTopicKit[]>(defaultEmails);

  // Hydration from localStorage after mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY_LANCEMENT);
      if (stored) setLancementKits(JSON.parse(stored) as LancementKit[]);
    } catch {}
    try {
      const stored = localStorage.getItem(KEY_ANIMATION);
      if (stored) setAnimationItems(JSON.parse(stored) as AnimationItem[]);
    } catch {}
    try {
      const stored = localStorage.getItem(KEY_EMAILS);
      if (stored) setEmailTopicKits(JSON.parse(stored) as EmailTopicKit[]);
    } catch {}
  }, []);

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY_LANCEMENT && e.newValue) {
        try { setLancementKits(JSON.parse(e.newValue) as LancementKit[]); } catch {}
      }
      if (e.key === KEY_ANIMATION && e.newValue) {
        try { setAnimationItems(JSON.parse(e.newValue) as AnimationItem[]); } catch {}
      }
      if (e.key === KEY_EMAILS && e.newValue) {
        try { setEmailTopicKits(JSON.parse(e.newValue) as EmailTopicKit[]); } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // LancementKit CRUD
  const addLancementKit = useCallback((item: LancementKit) => {
    setLancementKits((prev) => {
      const n = [...prev, item];
      try { localStorage.setItem(KEY_LANCEMENT, JSON.stringify(n)); } catch {}
      return n;
    });
  }, []);

  const updateLancementKit = useCallback((updated: LancementKit) => {
    setLancementKits((prev) => {
      const n = prev.map((k) => (k.id === updated.id ? updated : k));
      try { localStorage.setItem(KEY_LANCEMENT, JSON.stringify(n)); } catch {}
      return n;
    });
  }, []);

  const deleteLancementKit = useCallback((id: string) => {
    setLancementKits((prev) => {
      const n = prev.filter((k) => k.id !== id);
      try { localStorage.setItem(KEY_LANCEMENT, JSON.stringify(n)); } catch {}
      return n;
    });
  }, []);

  // AnimationItem CRUD
  const addAnimationItem = useCallback((item: AnimationItem) => {
    setAnimationItems((prev) => {
      const n = [...prev, item];
      try { localStorage.setItem(KEY_ANIMATION, JSON.stringify(n)); } catch {}
      return n;
    });
  }, []);

  const updateAnimationItem = useCallback((updated: AnimationItem) => {
    setAnimationItems((prev) => {
      const n = prev.map((a) => (a.id === updated.id ? updated : a));
      try { localStorage.setItem(KEY_ANIMATION, JSON.stringify(n)); } catch {}
      return n;
    });
  }, []);

  const deleteAnimationItem = useCallback((id: string) => {
    setAnimationItems((prev) => {
      const n = prev.filter((a) => a.id !== id);
      try { localStorage.setItem(KEY_ANIMATION, JSON.stringify(n)); } catch {}
      return n;
    });
  }, []);

  // EmailTopicKit CRUD
  const addEmailTopicKit = useCallback((item: EmailTopicKit) => {
    setEmailTopicKits((prev) => {
      const n = [...prev, item];
      try { localStorage.setItem(KEY_EMAILS, JSON.stringify(n)); } catch {}
      return n;
    });
  }, []);

  const updateEmailTopicKit = useCallback((updated: EmailTopicKit) => {
    setEmailTopicKits((prev) => {
      const n = prev.map((e) => (e.id === updated.id ? updated : e));
      try { localStorage.setItem(KEY_EMAILS, JSON.stringify(n)); } catch {}
      return n;
    });
  }, []);

  const deleteEmailTopicKit = useCallback((id: string) => {
    setEmailTopicKits((prev) => {
      const n = prev.filter((e) => e.id !== id);
      try { localStorage.setItem(KEY_EMAILS, JSON.stringify(n)); } catch {}
      return n;
    });
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
