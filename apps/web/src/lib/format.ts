/**
 * Format angka dan tanggal Indonesia untuk layar: ribuan bertitik, desimal berkoma, tanggal `DD-MM-YYYY`
 * (design-system 7.1). Nilai dari API berupa string desimal (api-specs 01 §1.2), jadi semua olahan berbasis string
 * dan tidak pernah lewat `number`.
 */

const MONEY_VALUE = /^(-?)(\d+)\.(\d{2})$/;
const DECIMAL_VALUE = /^(-?\d+)\.(\d+)$/;
const PERCENT_VALUE = /^(\d+)\.(\d{4})$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONEY_INPUT = /^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/;
const PERCENT_INPUT = /^(\d{1,5})(?:[.,](\d{1,4}))?$/;
const MONEY_SCALE = 2;
const PERCENT_SCALE = 4;

const groupThousands = (digits: string): string => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const trimFraction = (fraction: string): string => fraction.replace(/0+$/, "");

export const isMoneyValue = (value: string): boolean => MONEY_VALUE.test(value);
export const isPercentValue = (value: string): boolean => PERCENT_VALUE.test(value);
export const isIsoDate = (value: string): boolean => ISO_DATE.test(value);

/** `"10000000.00"` menjadi `"10.000.000"`; sen tampil hanya bila bukan nol (`"10.000.000,50"`). */
export function formatMoney(value: string): string {
  const match = MONEY_VALUE.exec(value);
  if (!match) return value;
  const [, sign, whole = "", cents = ""] = match;
  const fraction = trimFraction(cents);
  return `${sign}${groupThousands(whole)}${fraction ? `,${cents}` : ""}`;
}

/** `"40.0000"` menjadi `"40"`, `"12.5000"` menjadi `"12,5"`. */
export function formatPercent(value: string): string {
  const match = PERCENT_VALUE.exec(value);
  if (!match) return value;
  const [, whole, fraction = ""] = match;
  const trimmed = trimFraction(fraction);
  return trimmed ? `${whole},${trimmed}` : `${whole}`;
}

/** Skor dan rasio tanpa pemisah ribuan: `"470.00"` menjadi `"470"`, `"0.8800"` menjadi `"0,88"`. */
export function formatDecimal(value: string): string {
  const match = DECIMAL_VALUE.exec(value);
  if (!match) return value;
  const [, whole = "", fraction = ""] = match;
  const trimmed = trimFraction(fraction);
  return trimmed ? `${whole},${trimmed}` : whole;
}

/** `"2026-10-01"` menjadi `"01-10-2026"`. */
export function formatDate(value: string): string {
  const match = ISO_DATE.exec(value);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}

/** Timestamp ISO menjadi `DD-MM-YYYY HH:mm` waktu lokal browser. */
export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (part: number): string => String(part).padStart(2, "0");
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Input uang seperti `"5.000.000"` atau `"5000000,5"` menjadi `"5000000.50"`; input tidak sah menjadi `undefined`. */
export function parseMoneyInput(input: string): string | undefined {
  const text = input.trim();
  const match = MONEY_INPUT.exec(text);
  if (!match) return undefined;
  const whole = text.split(",")[0]?.replaceAll(".", "") ?? "";
  return `${whole}.${(match[1] ?? "").padEnd(MONEY_SCALE, "0")}`;
}

/** Input persen seperti `"40"`, `"12,5"`, atau `"12.5"` menjadi `"12.5000"`; input tidak sah menjadi `undefined`. */
export function parsePercentInput(input: string): string | undefined {
  const match = PERCENT_INPUT.exec(input.trim());
  if (!match) return undefined;
  return `${match[1]}.${(match[2] ?? "").padEnd(PERCENT_SCALE, "0")}`;
}

/** Tanggal lokal hari ini sebagai `YYYY-MM-DD`, nilai bawaan input tanggal. */
export function todayIsoDate(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
