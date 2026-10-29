import { ApiError } from "../../lib/api/client";

/** Pesan field wajib kosong (AC-77.02, AC-101.03). */
export const REQUIRED = "This field is required";
/** Pesan alasan kosong saat Failed (AC-101.05). */
export const REASON_REQUIRED = "Reason is required";
/** Pesan tanggal pencairan hari ini atau lebih awal (AC-76.02). */
export const DATE_TOO_EARLY = "Disbursement date must be at least 1 day after today";

const businessDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Tanggal bisnis hari ini `YYYY-MM-DD` di Asia/Jakarta, sama dengan aturan server (api-specs 25 §25.2). */
export const businessToday = (now: Date = new Date()): string => businessDay.format(now);

export type FieldErrors<T extends string> = Partial<Record<T, string>>;

/** Field kosong menjadi pesan "This field is required" di bawah field itu. */
export function requiredErrors<T extends string>(values: Record<T, string>): FieldErrors<T> {
  const errors: FieldErrors<T> = {};
  for (const [field, value] of Object.entries<string>(values)) {
    if (!value.trim()) Object.assign(errors, { [field]: REQUIRED });
  }
  return errors;
}

export const hasErrors = (errors: FieldErrors<string>): boolean => Object.keys(errors).length > 0;

/** `details[]` `VALIDATION_FAILED` server menjadi pesan per field (api-specs 25 §25.2 s.d. §25.4). */
export function serverFieldErrors(error: Error | null): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  const fields: Record<string, string> = {};
  for (const detail of error.envelope.details) if (detail.field) fields[detail.field] ??= detail.message;
  return fields;
}

/** Pesan error di atas form bila server tidak menandai field tertentu. */
export const formMessage = (error: Error | null): string | undefined =>
  error && Object.keys(serverFieldErrors(error)).length === 0 ? error.message : undefined;
