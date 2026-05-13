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

const KEY = "teale-urgencies-v1";

export function getUrgencies(): Urgency[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Urgency[]) : [];
  } catch {
    return [];
  }
}

export function addUrgency(u: Urgency): void {
  if (typeof window === "undefined") return;
  const all = getUrgencies();
  all.unshift(u);
  window.localStorage.setItem(KEY, JSON.stringify(all));
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
