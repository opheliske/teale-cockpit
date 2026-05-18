export type CsmEvent = {
  id: number;
  clientId: string;
  clientName: string;
  clientInitials: string;
  clientColor: string;
  title: string;
  date: string;      // e.g. "15 juin 2026"
  weekday: string;   // e.g. "Lun."
  time: string;      // e.g. "14:00"
  responsable: string;
};

let _events: CsmEvent[] = [];
const _listeners = new Set<() => void>();

export const csmEventsStore = {
  getEvents: (): CsmEvent[] => _events,
  add(event: CsmEvent): void {
    _events = [..._events, event];
    _listeners.forEach((l) => l());
  },
  subscribe(listener: () => void): () => void {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  },
};

const FR_MONTHS: Record<string, number> = {
  janv: 0, janvier: 0,
  fév: 1, février: 1,
  mars: 2,
  avr: 3, avril: 3,
  mai: 4,
  juin: 5,
  juil: 6, juillet: 6,
  août: 7,
  sept: 8, septembre: 8,
  oct: 9, octobre: 9,
  nov: 10, novembre: 10,
  déc: 11, décembre: 11,
};

const FR_WEEKDAYS = ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."];

export function parseFrDateWeekday(dateStr: string): string {
  const parts = dateStr.trim().toLowerCase().replace(/\./g, "").split(/\s+/);
  if (parts.length >= 2) {
    const day = parseInt(parts[0]);
    const monthNum = FR_MONTHS[parts[1]];
    const year = parts.length >= 3 ? parseInt(parts[2]) : 2026;
    if (!isNaN(day) && monthNum !== undefined && !isNaN(year)) {
      return FR_WEEKDAYS[new Date(year, monthNum, day).getDay()];
    }
  }
  return "";
}
