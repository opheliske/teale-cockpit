"use client";

import { useEffect, useMemo, useState } from "react";
import { useKitsStore } from "@/lib/kits-store";
import { useWorkshops } from "@/lib/workshops-store";
import {
  getSeenIds,
  isInitialized,
  setSeenIds,
  subscribeCatalogueReadState,
} from "@/lib/catalogue-read-state";

/**
 * Returns the IDs of catalogue entries the client hasn't seen yet :
 *   - `ateliers` : workshops added to the catalogue since the last visit
 *     of `/catalogue-ateliers`.
 *   - `kits` : kits (lancement / animation / email / visuels) added since
 *     the last visit of `/kits-communication`.
 *
 * Bootstraps silently on the first ever visit so the welcome screen
 * doesn't scream "everything is new". From then on, only true additions
 * are surfaced.
 */
export function useNewCatalogueItems(): {
  ateliers: string[];
  kits: string[];
} {
  const { workshops } = useWorkshops();
  const { lancementKits, animationItems, emailTopicKits, visuelKits, ficheKits, videoKits } = useKitsStore();
  const [tick, setTick] = useState(0);

  useEffect(() => subscribeCatalogueReadState(() => setTick((t) => t + 1)), []);

  const allWorkshopIds = useMemo(
    () => new Set(workshops.map((w) => w.id)),
    [workshops],
  );
  // Prefix per source so an id collision between two kit tables (unlikely
  // but theoretically possible since each table uses its own slug scheme)
  // doesn't cause false negatives.
  const allKitIds = useMemo(
    () =>
      new Set([
        ...lancementKits.map((k) => `lan:${k.id}`),
        ...animationItems.map((a) => `ani:${a.id}`),
        ...emailTopicKits.map((e) => `email:${e.id}`),
        ...visuelKits.map((v) => `vis:${v.id}`),
        ...ficheKits.map((f) => `fiche:${f.id}`),
        ...videoKits.map((v) => `video:${v.id}`),
      ]),
    [lancementKits, animationItems, emailTopicKits, visuelKits, ficheKits, videoKits],
  );

  // First-visit bootstrap. Wrapped in async to dodge the
  // react-hooks/set-state-in-effect rule (we never call React setState
  // from the effect body — only localStorage writes that fan out via the
  // subscribeCatalogueReadState listener).
  useEffect(() => {
    if (allWorkshopIds.size === 0) return;
    if (!isInitialized("ateliers")) setSeenIds("ateliers", allWorkshopIds);
  }, [allWorkshopIds]);

  useEffect(() => {
    if (allKitIds.size === 0) return;
    if (!isInitialized("kits")) setSeenIds("kits", allKitIds);
  }, [allKitIds]);

  return useMemo(() => {
    void tick;
    const seenAteliers = getSeenIds("ateliers");
    const seenKits = getSeenIds("kits");
    return {
      ateliers: [...allWorkshopIds].filter((id) => !seenAteliers.has(id)),
      kits: [...allKitIds].filter((id) => !seenKits.has(id)),
    };
  }, [allWorkshopIds, allKitIds, tick]);
}
