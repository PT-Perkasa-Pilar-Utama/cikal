import { isDeepStrictEqual } from "node:util";
import { DomainError } from "../../../../platform/http/domain-error.js";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Periode pencarian paling panjang 366 hari kalender, kedua tanggal ikut dihitung (AC-14.04). */
const MAX_PERIOD_DAYS = 366;

/** Periode "Audit Trail": akhir sebelum awal atau lebih dari 366 hari ditolak (AC-14.03, AC-14.04). */
export function auditPeriodError(occurredFrom: string, occurredTo: string): DomainError | null {
  if (occurredTo < occurredFrom) return DomainError.standard("INVALID_DATE_RANGE");
  const days = (Date.parse(occurredTo) - Date.parse(occurredFrom)) / DAY_MS + 1;
  return days > MAX_PERIOD_DAYS
    ? new DomainError("DATE_RANGE_TOO_LONG", "Search period must not exceed 366 days", 422)
    : null;
}

export type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** `old_data`/`new_data` selain objek, contoh array, dibungkus `{ value }` agar tetap tampil berdampingan. */
export const asRecord = (value: unknown): JsonRecord | null =>
  value === null || value === undefined ? null : isRecord(value) ? value : { value };

function leaves(data: JsonRecord | null, prefix = ""): Map<string, unknown> {
  const entries = new Map<string, unknown>();
  for (const [key, value] of Object.entries(data ?? {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isRecord(value)) for (const [child, childValue] of leaves(value, path)) entries.set(child, childValue);
    else entries.set(path, value);
  }
  return entries;
}

/**
 * Path bertitik field yang nilainya berbeda antara data sebelum dan sesudah (AC-14.02); array dibandingkan utuh.
 * Tanpa data sebelum, misalnya aksi `CREATE`, tidak ada field yang ditandai.
 */
export function changedFields(oldData: JsonRecord | null, newData: JsonRecord | null): string[] {
  if (oldData === null || newData === null) return [];
  const before = leaves(oldData);
  const after = leaves(newData);
  const paths = new Set([...before.keys(), ...after.keys()]);
  return [...paths].filter((path) => !isDeepStrictEqual(before.get(path), after.get(path)));
}
