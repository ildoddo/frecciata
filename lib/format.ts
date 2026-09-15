// Formattazione per l'UI: sempre nel fuso del club, mai quello del browser.

export const UI_TZ = process.env.NEXT_PUBLIC_CLUB_TIMEZONE || "Europe/Rome";

const timeFmt = new Intl.DateTimeFormat("it-IT", {
  timeZone: UI_TZ,
  hour: "2-digit",
  minute: "2-digit",
});

export function fmtTime(iso: string | Date): string {
  return timeFmt.format(new Date(iso));
}

export function fmtRange(startIso: string | Date, endIso: string | Date): string {
  return `${fmtTime(startIso)}–${fmtTime(endIso)}`;
}

// "2026-09-14" -> "lun 14 set"
const dayShort = new Intl.DateTimeFormat("it-IT", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
// "2026-09-14" -> "lunedì 14 settembre"
const dayLong = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function parseDay(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)); // mezzogiorno: immuni dal DST
}

export function fmtDayShort(day: string): string {
  return dayShort.format(parseDay(day));
}

export function fmtDayLong(day: string): string {
  const s = dayLong.format(parseDay(day));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Fuso del club: "2026-09-14" relativo a oggi = "Oggi"/"Domani"/giorno
export function fmtDaySmart(day: string, today: string): string {
  if (day === today) return "Oggi";
  if (day === addDays(today, 1)) return "Domani";
  return fmtDayShort(day);
}

// --- Aritmetica su giorni (pura, senza fusi: date di calendario ISO) ------

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** 0 = domenica ... 6 = sabato */
export function weekdayOf(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Primo giorno (lunedì) della settimana di `day`. */
export function mondayOf(day: string): string {
  const offset = (weekdayOf(day) + 6) % 7;
  return addDays(day, -offset);
}

export function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: UI_TZ }).format(new Date());
}

export const WEEKDAY_SHORT = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
