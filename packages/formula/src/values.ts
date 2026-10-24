import { Decimal } from "decimal.js";

/** Nilai bahasa rumus FM-02: angka desimal, teks, boolean, dan tanggal (tengah malam UTC). */
export type FormulaValue = Decimal | string | boolean | Date;

/** Rumus gagal di-parse atau dievaluasi; tidak ada nilai pengganti diam-diam (FM-09). */
export class FormulaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FormulaError";
  }
}

export function asNumber(value: FormulaValue, label: string): Decimal {
  if (value instanceof Decimal) return value;
  throw new FormulaError(`${label} must be a number`);
}

export function asInteger(value: FormulaValue, label: string): number {
  const number = asNumber(value, label);
  if (!number.isInteger()) throw new FormulaError(`${label} must be a whole number`);
  return number.toNumber();
}

export function asBoolean(value: FormulaValue, label: string): boolean {
  if (typeof value === "boolean") return value;
  throw new FormulaError(`${label} must be true or false`);
}

export function asDate(value: FormulaValue, label: string): Date {
  if (value instanceof Date) return value;
  throw new FormulaError(`${label} must be a date`);
}

export function asText(value: FormulaValue, label: string): string {
  if (typeof value === "string") return value;
  throw new FormulaError(`${label} must be text`);
}
