import { FormulaError } from "./values.js";

/** Parameter `DUE_DATE_END_OF_MONTH` (RM-19): tanggal yang tidak ada di bulan tujuan. */
export type EndOfMonthRule = "LAST_DAY" | "NEXT_MONTH_FIRST_DAY";
export type DateUnit = "DAY" | "MONTH" | "YEAR";

const DAY_MS = 86_400_000;
const MONTHS_PER_YEAR = 12;
const SATURDAY = 6;
const SUNDAY = 0;

const utcDate = (year: number, month: number, day: number): Date => new Date(Date.UTC(year, month, day));
const daysInMonth = (year: number, month: number): number => utcDate(year, month + 1, 0).getUTCDate();

/** Tanggal ISO `YYYY-MM-DD` dari tanggal tengah malam UTC. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** `ADDMONTHS(date, months)`: tanggal di luar bulan tujuan mengikuti `rule` (RM-19). */
export function addMonths(date: Date, months: number, rule: EndOfMonthRule): Date {
  const target = utcDate(date.getUTCFullYear(), date.getUTCMonth() + months, 1);
  const year = target.getUTCFullYear();
  const month = target.getUTCMonth();
  const day = date.getUTCDate();
  if (day <= daysInMonth(year, month)) return utcDate(year, month, day);
  return rule === "LAST_DAY" ? utcDate(year, month + 1, 0) : utcDate(year, month + 1, 1);
}

/** `EOMONTH(date, months)`: hari terakhir bulan `months` dari `date`. */
export function endOfMonth(date: Date, months: number): Date {
  return utcDate(date.getUTCFullYear(), date.getUTCMonth() + months + 1, 0);
}

function fullMonthsBetween(start: Date, end: Date): number {
  const months =
    (end.getUTCFullYear() - start.getUTCFullYear()) * MONTHS_PER_YEAR + end.getUTCMonth() - start.getUTCMonth();
  return end.getUTCDate() < start.getUTCDate() ? months - 1 : months;
}

/** `DATEDIFF(start, end, unit)`: selisih utuh dalam hari, bulan, atau tahun. */
export function dateDiff(start: Date, end: Date, unit: string): number {
  switch (unit) {
    case "DAY":
      return Math.floor((end.getTime() - start.getTime()) / DAY_MS);
    case "MONTH":
      return fullMonthsBetween(start, end);
    case "YEAR":
      return Math.trunc(fullMonthsBetween(start, end) / MONTHS_PER_YEAR);
    default:
      throw new FormulaError(`DATEDIFF unit must be DAY, MONTH, or YEAR, got ${unit}`);
  }
}

/** `WORKDAYS(date, days)`: tanggal setelah `days` hari kerja, melewati Sabtu, Minggu, dan kalender libur. */
export function addWorkdays(date: Date, days: number, holidays: readonly Date[]): Date {
  if (days < 0) throw new FormulaError("WORKDAYS days must not be negative");
  const off = new Set(holidays.map(isoDate));
  let current = date;
  let remaining = days;
  while (remaining > 0) {
    current = new Date(current.getTime() + DAY_MS);
    const weekday = current.getUTCDay();
    if (weekday !== SATURDAY && weekday !== SUNDAY && !off.has(isoDate(current))) remaining -= 1;
  }
  return current;
}
