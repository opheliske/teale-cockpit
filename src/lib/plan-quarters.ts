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

/**
 * Builds the 4 quarters for a contract cycle shifted by `cycleOffset` years
 * from the contract's start. cycleOffset = 0 returns the contract year
 * containing today; -1 returns the previous 12-month cycle; +1 the next.
 *
 * Off-cycle contracts (e.g. starting in October) span two calendar years
 * per cycle, so a "next year" view (cycleOffset = +1) is *not* the same as
 * "next calendar year" — it's the next contract cycle.
 */
export function buildPlanQuartersForCycle(
  contractStart: string | undefined,
  cycleOffset: number,
): PlanQuarter[] {
  if (!contractStart || cycleOffset === 0) return buildPlanQuarters(contractStart);
  const parts = contractStart.split("-");
  if (parts.length < 2) return buildPlanQuarters(contractStart);
  const year = parseInt(parts[0]);
  if (Number.isNaN(year)) return buildPlanQuarters(contractStart);
  const shifted = `${year + cycleOffset}-${parts.slice(1).join("-")}`;
  return buildPlanQuarters(shifted);
}

export function buildPlanQuarters(contractStart: string | undefined): PlanQuarter[] {
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayNum = today.getMonth(); // 0-indexed

  let startNum = 0;
  let startYear = todayYear;
  if (contractStart) {
    const parts = contractStart.split("-");
    if (parts.length >= 2) {
      startYear = parseInt(parts[0]) || todayYear;
      startNum  = (parseInt(parts[1]) || 1) - 1;
    }
  }

  return (["Q1", "Q2", "Q3", "Q4"] as const).map((qId, qi) => {
    const months: PlanQuarterMonth[] = [0, 1, 2].map((mi) => {
      const offset = qi * 3 + mi;
      const abs = startNum + offset;
      const num = abs % 12;
      const year = startYear + Math.floor(abs / 12);
      const info = MONTHS[num];

      let status: "past" | "current" | "upcoming";
      if (year < todayYear || (year === todayYear && num < todayNum)) {
        status = "past";
      } else if (year === todayYear && num === todayNum) {
        status = "current";
      } else {
        status = "upcoming";
      }

      return { key: info.key, label: info.label, en: info.en, num, year, status };
    });

    const allPast = months.every((m) => m.status === "past");
    const hasCurrent = months.some((m) => m.status === "current");
    const status: "past" | "current" | "upcoming" = allPast ? "past" : hasCurrent ? "current" : "upcoming";

    return { id: qId, months, status };
  });
}
