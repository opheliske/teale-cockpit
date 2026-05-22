import { supabase } from "@/lib/supabase";
import { notifyChange, watchChanges } from "@/lib/sync";

export type UrgencyType =
  | "deces"
  | "suicide"
  | "accident"
  | "agression"
  | "harcelement"
  | "autre";

export type UrgencyMode = "presentiel" | "visio" | "mixte";

export type UrgencyModalities = {
  suivisIndividuels: boolean;
  groupeParole24h: boolean;
  groupeParole72h: boolean;
  atelierPtsd: boolean;
};

export type Urgency = {
  id: string;
  createdAt: string;
  eventDate: string;
  type: UrgencyType;
  description?: string;
  modalities: UrgencyModalities;
  affectedHeadcount?: string;
  mode: UrgencyMode;
  location?: string;
  rhContact?: string;
};

function fromRow(row: Record<string, unknown>): Urgency {
  return {
    id: row.id as string,
    createdAt: row.created_at as string,
    eventDate: row.event_date as string,
    type: row.type as UrgencyType,
    description: (row.description as string) ?? undefined,
    modalities: (row.modalities as UrgencyModalities) ?? {
      suivisIndividuels: false,
      groupeParole24h: false,
      groupeParole72h: false,
      atelierPtsd: false,
    },
    affectedHeadcount: (row.affected_headcount as string) ?? undefined,
    mode: row.mode as UrgencyMode,
    location: (row.location as string) ?? undefined,
    rhContact: (row.rh_contact as string) ?? undefined,
  };
}

/** Loads urgency declarations. RLS scopes: a client sees its own, a CSM all. */
export async function getUrgencies(): Promise<Urgency[]> {
  const { data, error } = await supabase
    .from("urgencies")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[urgencies] load", error);
    return [];
  }
  return (data ?? []).map(fromRow);
}

/** Declares an emergency intervention for the given client. */
export async function addUrgency(
  u: Urgency,
  clientId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("urgencies").insert({
    id: u.id,
    client_id: clientId,
    created_at: u.createdAt,
    event_date: u.eventDate,
    type: u.type,
    description: u.description ?? null,
    modalities: u.modalities,
    affected_headcount: u.affectedHeadcount ?? null,
    mode: u.mode,
    location: u.location ?? null,
    rh_contact: u.rhContact ?? null,
  });
  if (error) {
    console.error("[urgencies] add", error);
    return { error: error.message };
  }
  notifyChange("urgencies");
  return { error: null };
}

/** Calls `cb` when an urgency changes (another tab, another user, Realtime). */
export function watchUrgencies(cb: () => void): () => void {
  return watchChanges(["urgencies"], cb);
}

export const urgencyTypeLabels: Record<UrgencyType, string> = {
  deces: "Décès d'un collaborateur",
  suicide: "Suicide",
  accident: "Accident grave",
  agression: "Agression / violence",
  harcelement: "Harcèlement révélé",
  autre: "Autre événement traumatique",
};

export const urgencyTypeEmoji: Record<UrgencyType, string> = {
  deces: "🕊️",
  suicide: "🚨",
  accident: "⚠️",
  agression: "🛡️",
  harcelement: "📣",
  autre: "❗",
};

export const urgencyModeLabels: Record<UrgencyMode, string> = {
  presentiel: "Présentiel",
  visio: "Visio",
  mixte: "Présentiel + visio",
};

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const monthAbbrFr: Record<string, string> = {
  January: "janv.",
  February: "fév.",
  March: "mars",
  April: "avr.",
  May: "mai",
  June: "juin",
  July: "juil.",
  August: "août",
  September: "sept.",
  October: "oct.",
  November: "nov.",
  December: "déc.",
};

export function parseEventDate(iso: string): {
  year: number;
  monthName: string;
  displayDate: string;
} {
  const [y, m, d] = iso.split("-").map(Number);
  const monthName = months[m - 1] ?? "January";
  return {
    year: y,
    monthName,
    displayDate: `${d} ${monthAbbrFr[monthName]}`,
  };
}

export function modalitiesToList(m: UrgencyModalities): string[] {
  const out: string[] = [];
  if (m.groupeParole24h) out.push("Groupe de parole sous 24 h");
  if (m.groupeParole72h) out.push("Groupe de parole sous 72 h");
  if (m.suivisIndividuels) out.push("Suivis individuels (séances)");
  if (m.atelierPtsd) out.push("Atelier PTSD (sous quelques semaines)");
  return out;
}

export function buildCsmSummary(u: Urgency): string {
  const { displayDate } = parseEventDate(u.eventDate);
  const lines: string[] = [];
  lines.push("DÉCLARATION D'INTERVENTION D'URGENCE — teale");
  lines.push("");
  lines.push(`Type : ${urgencyTypeLabels[u.type]}`);
  lines.push(`Date de l'événement : ${displayDate}`);
  if (u.affectedHeadcount) {
    lines.push(`Effectifs concernés : ${u.affectedHeadcount}`);
  }
  const mods = modalitiesToList(u.modalities);
  lines.push(
    `Modalités demandées : ${mods.length > 0 ? mods.join(", ") : "À définir avec le CSM"}`
  );
  lines.push(`Format souhaité : ${urgencyModeLabels[u.mode]}`);
  if (u.location) lines.push(`Lieu : ${u.location}`);
  if (u.rhContact) lines.push(`Contact RH référent : ${u.rhContact}`);
  if (u.description) {
    lines.push("");
    lines.push(`Contexte : ${u.description}`);
  }
  return lines.join("\n");
}
