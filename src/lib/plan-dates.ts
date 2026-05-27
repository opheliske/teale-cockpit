// ─────────────────────────────────────────────────────────────────────────────
// Shared date helpers for plan items.
//
// A plan item carries:
//   • year  ∈ { "current", "next" } — relative to the calendar year now
//   • month ∈ 0–11
//   • meta  : a free-form string that may embed a day-of-month and time
//             (e.g. "15 juin · 14:00")
//
// These two helpers reconstruct the concrete day-of-month and the rolling
// contract-year window — needed by both the CSM detail view and the client
// portal to keep the "ateliers consommés / restants" maths identical on
// both sides.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Best-effort day-of-month parsed from a plan item's meta text. Falls back
 * to 15 when no day is found, so a missing day lands roughly mid-month.
 */
export function dayFromMeta(meta: string | undefined): number {
  if (!meta) return 15;
  const m = meta.match(/(?:^|\s)(\d{1,2})\s+(?:janv|fév|mars|avr|mai|juin|juil|ao[uû]t|sept|oct|nov|déc)/i);
  if (!m) return 15;
  const d = parseInt(m[1], 10);
  return Number.isFinite(d) && d >= 1 && d <= 31 ? d : 15;
}

/**
 * Extracts the calendar year from a plan item's meta text when it embeds
 * a full date like "24 mai 2026 · 10:00". Requires day + month + year to
 * appear together (not just any "20XX" somewhere in the text) — otherwise
 * we'd grab the year out of e.g. "Voir QBR Q2 2024" and mis-resolve dates.
 *
 * When present, this overrides the year derived from the relative
 * `year: "current" | "next"` flag — the human-typed full date is the
 * authoritative source.
 */
export function yearFromMeta(meta: string | undefined): number | undefined {
  if (!meta) return undefined;
  const m = meta.match(/\b\d{1,2}\s+(?:janv|fév|mars|avr|mai|juin|juil|ao[uû]t|sept|oct|nov|déc)\S*\s+(20\d{2})\b/i);
  return m ? parseInt(m[1], 10) : undefined;
}

/**
 * Returns the [start, end) window of the contract year currently in
 * progress — i.e. the rolling 12-month window anchored on contractStart's
 * anniversary. Returns null when the start date can't be parsed.
 *
 * Example: contractStart 2025-03-15, now 2026-05-27
 *          → start 2026-03-15, end 2027-03-15 (exclusive).
 */
export function currentContractYearWindow(
  contractStartIso: string,
  now: Date = new Date(),
): { start: Date; end: Date } | null {
  if (!contractStartIso) return null;
  const start = new Date(contractStartIso);
  if (Number.isNaN(start.getTime())) return null;
  let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  while (true) {
    const next = new Date(cursor.getFullYear() + 1, cursor.getMonth(), cursor.getDate());
    if (next.getTime() > now.getTime()) break;
    cursor = next;
  }
  const end = new Date(cursor.getFullYear() + 1, cursor.getMonth(), cursor.getDate());
  return { start: cursor, end };
}

/**
 * Count "ateliers consumed" from a list of plan items — i.e. items of
 * type "atelier" that fell within the current contract year, whose date
 * has passed, and that weren't cancelled.
 *
 * Each item must carry its own `calendarYear` because StoredPlanItem only
 * has `year: "current" | "next"` (relative). The caller resolves that to
 * an absolute year before calling.
 */
export function countAtelierConsumed(
  items: Array<{
    type: string;
    month?: number;
    meta?: string;
    cancelled?: boolean;
    calendarYear: number;
  }>,
  contractStartIso: string,
  now: Date = new Date(),
): number {
  const win = currentContractYearWindow(contractStartIso, now);
  if (!win) return 0;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  let count = 0;
  for (const it of items) {
    if (it.type !== "atelier") continue;
    if (it.cancelled) continue;
    if (it.month == null) continue;
    // A full date in meta ("24 mai 2026 · 10:00") wins over the relative
    // year flag — the user-typed date is authoritative and avoids the
    // current/next ambiguity entirely.
    const cy = yearFromMeta(it.meta) ?? it.calendarYear;
    const d = new Date(cy, it.month, dayFromMeta(it.meta));
    if (d.getTime() >= today.getTime()) continue;        // not yet passed
    if (d < win.start || d >= win.end) continue;         // outside the contract year
    count++;
  }
  return count;
}
