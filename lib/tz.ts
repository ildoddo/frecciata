// Il club opera in un singolo fuso orario (CLUB_TIMEZONE). I dati vivono in
// UTC nel database; questi helper fanno il cambio senza dipendenze esterne.

export const CLUB_TZ = process.env.CLUB_TIMEZONE || "Europe/Rome";

/** "YYYY-MM-DD" del giorno solare locale di una data UTC (es. "2026-09-14"). */
export function localDay(date: Date | number, tz: string = CLUB_TZ): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date(date));
}

/** Giorno locale + 1 (aritmetica pura su stringhe ISO, immune al DST). */
export function addDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/** giorno settimanale di una data ISO "YYYY-MM-DD": 0 = domenica ... 6. */
export function weekdayOf(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Offset (ms) del fuso `tz` all'istante `date`. */
function tzOffsetMs(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24, // gestisce l'ora "24:00" di alcuni formatter
    get("minute"),
    get("second")
  );
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * "YYYY-MM-DD" + "HH:mm" (locali al club) -> istante UTC.
 * Due iterazioni: se l'ora cade vicino a un cambio DST, la prima stima
 * dell'offset potrebbe essere sbagliata; la seconda converge.
 */
export function zonedToUtc(day: string, time: string, tz: string = CLUB_TZ): Date {
  const [y, mo, d] = day.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  let guess = new Date(Date.UTC(y, mo - 1, d, h, mi));
  for (let i = 0; i < 2; i++) {
    guess = new Date(guess.getTime() - tzOffsetMs(guess, tz));
  }
  return guess;
}

/**
 * Intervallo UTC [start, end) che copre l'intero giorno solare locale
 * indicato: serve per query "tutto il giorno X".
 */
export function dayRangeUtc(day: string, tz: string = CLUB_TZ) {
  const start = zonedToUtc(day, "00:00", tz);
  const end = zonedToUtc(addDay(day), "00:00", tz);
  return { start, end };
}

/** Mostra un istante UTC come "HH:mm" nel fuso del club. */
export function localTime(date: Date | number, tz: string = CLUB_TZ): string {
  const fmt = new Intl.DateTimeFormat("it-IT", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  });
  return fmt.format(new Date(date));
}
