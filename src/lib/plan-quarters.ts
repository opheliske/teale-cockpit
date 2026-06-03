const MONTHS = [
  { key: "janv", label: "Janvier",   en: "January",   num: 0 },
  { key: "fév",  label: "Février",   en: "February",  num: 1 },
  { key: "mars", label: "Mars",      en: "March",     num: 2 },
  { key: "avr",  label: "Avril",     en: "April",     num: 3 },
  { key: "mai",  label: "Mai",       en: "May",       num: 4 },
  { key: "juin", label: "Juin",      en: "June",      num: 5 },
  { key: "juil", label: "Juillet",   en: "July",      num: 6 },
  { key: "août", label: "Août",      en: "August",    num: 7 },
  { key: "sept", label: "Septembre", en: "September", num: 8 },
  { key: "oct",  label: "Octobre",   en: "October",   num: 9 },
  { key: "nov",  label: "Novembre",  en: "November",  num: 10 },
  { key: "déc",  label: "Décembre",  en: "December",  num: 11 },
] as const;

export type PlanQuarterMonth = {
  key: string;    // "janv"
  label: string;  // "Janvier"
  en: string;     // "January"
  num: number;    // 0-11
  year: number;
  status: "past" | "current" | "upcoming";
};

export type PlanQuarter = {
  id: "Q1" | "Q2" | "Q3" | "Q4";
  months: PlanQuarterMonth[];
  status: "past" | "current" | "upcoming";
};

type QId = "Q1" | "Q2" | "Q3" | "Q4";

/**
 * Returns the calendar quarter of a month index (0=Jan…11=Dec). Q1 = Jan/Feb/Mar.
 * When `month` is undefined, falls back to `storedQuarter` if it looks like a
 * valid quarter id, otherwise defaults to Q1. Used to bucket plan items in a
 * calendar-aligned view independently of how they were created (e.g. an item
 * originally placed under a contract-anchored Q1 keeps its `month` but gets
 * re-bucketed into the matching calendar quarter).
 */
export function calendarQuarter(month: number | undefined, storedQuarter?: string): QId {
  if (typeof month === "number" && Number.isFinite(month)) {
    if (month < 3)  return "Q1";
    if (month < 6)  return "Q2";
    if (month < 9)  return "Q3";
    return "Q4";
  }
  const q = (storedQuarter ?? "").toUpperCase().replace(/^NEXT-/, "");
  if (q === "Q1" || q === "Q2" || q === "Q3" || q === "Q4") return q;
  return "Q1";
}

/**
 * Builds the 4 calendar quarters of the given `year` (defaults to today).
 * Q1 = January/February/March, regardless of the contract start date. The
 * status (past/current/upcoming) of each month is computed against today.
 */
export function buildPlanQuarters(_contractStart: string | undefined, year?: number): PlanQuarter[] {
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayNum = today.getMonth(); // 0-indexed
  const displayYear = year ?? todayYear;

  return (["Q1", "Q2", "Q3", "Q4"] as const).map((qId, qi) => {
    const months: PlanQuarterMonth[] = [0, 1, 2].map((mi) => {
      const num = qi * 3 + mi;
      const info = MONTHS[num];

      let status: "past" | "current" | "upcoming";
      if (displayYear < todayYear || (displayYear === todayYear && num < todayNum)) {
        status = "past";
      } else if (displayYear === todayYear && num === todayNum) {
        status = "current";
      } else {
        status = "upcoming";
      }

      return { key: info.key, label: info.label, en: info.en, num, year: displayYear, status };
    });

    const allPast = months.every((m) => m.status === "past");
    const hasCurrent = months.some((m) => m.status === "current");
    const status: "past" | "current" | "upcoming" = allPast ? "past" : hasCurrent ? "current" : "upcoming";

    return { id: qId, months, status };
  });
}

/**
 * Returns the 4 calendar quarters for the year shifted by `cycleOffset`
 * relative to today. cycleOffset = 0 → this year, +1 → next year, -1 → prev.
 * `contractStart` is kept in the signature for backwards compat but is no
 * longer used to anchor the layout (which is now calendar-aligned).
 */
export function buildPlanQuartersForCycle(
  contractStart: string | undefined,
  cycleOffset: number,
): PlanQuarter[] {
  const todayYear = new Date().getFullYear();
  return buildPlanQuarters(contractStart, todayYear + cycleOffset);
}
