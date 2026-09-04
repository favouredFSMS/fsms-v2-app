/**
 * FSMS V2 — Novosibirsk clock (cross-cutting requirement X1).
 *
 * All FSMS business time is Novosibirsk local time. Storage is UTC; every
 * "what day/month is it for the school?" question goes through this module so
 * attendance, wallet months, spotlight windows and notifications can never
 * drift onto the server's timezone.
 */

export const SCHOOL_TIMEZONE = "Asia/Novosibirsk";

/** Format a Date as yyyy-MM-dd in Novosibirsk time. */
export function schoolDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SCHOOL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Format a Date as yyyy-MM in Novosibirsk time (wallet/spotlight month key). */
export function schoolMonth(d: Date = new Date()): string {
  return schoolDate(d).slice(0, 7);
}

/** A full ISO-ish timestamp in Novosibirsk local time, for display. */
export function schoolDateTime(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: SCHOOL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
}
