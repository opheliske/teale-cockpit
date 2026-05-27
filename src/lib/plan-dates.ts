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

const FR_MONTH_NUM: Record<string, number> = {
  janv: 0, janvier: 0,
  fév: 1, févr: 1, février: 1,
  mars: 2,
  avr: 3, avril: 3,
  mai: 4,
  juin: 5,
  juil: 6, juillet: 6,
  août: 7, aout: 7,
  sept: 8, septembre: 8,
  oct: 9, octobre: 9,
  nov: 10, novembre: 10,
  déc: 11, décembre: 11,
};

/**
 * Best-effort month (0-11) parsed from a plan item's meta text. Used as a
 * recovery path when the structured `month` field on the item is missing —
 * e.g. an atelier created via the edit modal where the user typed the date
 * into "Détails" but left the month dropdown untouched.
 */
export function monthFromMeta(meta: string | undefined): number | undefined {
  if (!meta) return undefined;
  const m = meta.match(/(janv|févr?|mars|avr|mai|juin|juil|ao[uû]t|sept|oct|nov|déc)/i);
  if (!m) return undefined;
  let raw = m[1].toLowerCase();
  if (raw === "aout") raw = "août";
  return FR_MONTH_NUM[raw];
}

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
  // TODO(debug): remove after diagnosing the Bonduelle "0 consommés" case.
  const debugRows: Array<Record<string, unknown>> = [];
  for (const it of items) {
    const row: Record<string, unknown> = { type: it.type, cancelled: it.cancelled, month_raw: it.month, meta: it.meta, calendarYear_caller: it.calendarYear };
    if (it.type !== "atelier") { row.skipped = "not-atelier"; debugRows.push(row); continue; }
    if (it.cancelled) { row.skipped = "cancelled"; debugRows.push(row); continue; }
    // Month recovery: if the structured field is missing, parse the meta
    // text (an atelier created by typing the date in "Détails" without
    // touching the dropdown lands here).
    const month = it.month ?? monthFromMeta(it.meta);
    row.month_resolved = month;
    if (month == null) { row.skipped = "no-month"; debugRows.push(row); continue; }
    // A full date in meta ("24 mai 2026 · 10:00") wins over the relative
    // year flag — the user-typed date is authoritative and avoids the
    // current/next ambiguity entirely.
    const cy = yearFromMeta(it.meta) ?? it.calendarYear;
    row.year_resolved = cy;
    const d = new Date(cy, month, dayFromMeta(it.meta));
    row.date_resolved = d.toISOString();
    if (d.getTime() >= today.getTime()) { row.skipped = "not-passed"; debugRows.push(row); continue; }
    if (d < win.start || d >= win.end) { row.skipped = `outside-window [${win.start.toISOString()} → ${win.end.toISOString()}[`; debugRows.push(row); continue; }
    row.counted = true;
    debugRows.push(row);
    count++;
  }
  if (typeof window !== "undefined" && debugRows.some((r) => r.type === "atelier")) {
    console.warn("[debug atelier-consumed]", { contractStartIso, today: today.toISOString(), window: { start: win.start.toISOString(), end: win.end.toISOString() }, count, rows: debugRows });
  }
  return count;
}
