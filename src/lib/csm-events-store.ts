import { supabase } from "@/lib/supabase";

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

function fromRow(row: Record<string, unknown>): CsmEvent {
  return {
    id: Number(row.id),
    clientId: row.client_id as string,
    clientName: row.client_name as string,
    clientInitials: row.client_initials as string,
    clientColor: row.client_color as string,
    title: row.title as string,
    date: row.date as string,
    weekday: row.weekday as string,
    time: row.time as string,
    responsable: row.responsable as string,
  };
}

let _events: CsmEvent[] = [];
let _loaded = false;
const _listeners = new Set<() => void>();

async function ensureLoaded() {
  if (_loaded) return;
  _loaded = true;
  const { data } = await supabase
    .from("csm_events")
    .select("*")
    .order("created_at");
  _events = data ? data.map(fromRow) : [];
  _listeners.forEach((l) => l());
}

export const csmEventsStore = {
  getEvents: (): CsmEvent[] => _events,

  load: async () => ensureLoaded(),

  add: async (event: Omit<CsmEvent, "id">) => {
    await ensureLoaded();
    const { data } = await supabase
      .from("csm_events")
      .insert({
        client_id: event.clientId,
        client_name: event.clientName,
        client_initials: event.clientInitials,
        client_color: event.clientColor,
        title: event.title,
        date: event.date,
        weekday: event.weekday,
        time: event.time,
        responsable: event.responsable,
      })
      .select()
      .single();
    if (data) {
      _events = [..._events, fromRow(data)];
      _listeners.forEach((l) => l());
    }
  },

  remove: async (id: number) => {
    await supabase.from("csm_events").delete().eq("id", id);
    _events = _events.filter((e) => e.id !== id);
    _listeners.forEach((l) => l());
  },

  subscribe: (listener: () => void): (() => void) => {
    _listeners.add(listener);
    ensureLoaded();
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
