// Calendar dates are handled as UTC midnight so day arithmetic ignores time zones.

const DAY = 86_400_000;

export function toDay(d: Date | string): Date {
  const x = typeof d === "string" ? new Date(d) : d;
  return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()));
}

/** Today in Baku (UTC+4), as a UTC-midnight date. */
export function today(now: Date = new Date()): Date {
  return toDay(new Date(now.getTime() + 4 * 3_600_000));
}

export function addDays(d: Date, days: number): Date {
  return new Date(toDay(d).getTime() + days * DAY);
}

export function addYears(d: Date, years: number): Date {
  const x = toDay(d);
  return new Date(Date.UTC(x.getUTCFullYear() + years, x.getUTCMonth(), x.getUTCDate()));
}

/** Whole days from a to b (positive when b is later). */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((toDay(b).getTime() - toDay(a).getTime()) / DAY);
}

export function isoDate(d: Date): string {
  return toDay(d).toISOString().slice(0, 10);
}

/** Parse "2026-10-19", "19.10.2026" or "19/10/2026". */
export function parseDate(input: string | Date | number | null | undefined): Date | null {
  if (input === null || input === undefined || input === "") return null;
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : toDay(input);
  if (typeof input === "number") {
    // Excel serial date.
    return new Date(Date.UTC(1899, 11, 30) + Math.round(input) * DAY);
  }
  const s = input.trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return utc(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (m) return utc(+m[3], +m[2], +m[1]);
  return null;
}

function utc(y: number, mo: number, d: number): Date | null {
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCMonth() === mo - 1 && date.getUTCDate() === d ? date : null;
}
