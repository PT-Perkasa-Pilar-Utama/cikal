import { ApiError } from "../../lib/api/client";

export interface FormErrors {
  /** Pesan per field, dengan nama field tanpa awalan section body (`personal.idCardNumber` menjadi `idCardNumber`). */
  fields: Record<string, string>;
  /** Pesan envelope bila tidak ada field penyebab yang bisa ditandai. */
  message?: string;
}

const NO_ERRORS: FormErrors = { fields: {} };
const SECTION_PREFIX = /^(application|personal)\./;

/**
 * Error simpan section menjadi pesan di bawah field (AC-39.02, AC-40.02 s.d. AC-40.05). `422` aturan bisnis membawa
 * satu `details[]` berisi field penyebabnya (api-specs 12 §12.3), jadi pesannya juga tampil di bawah field itu.
 */
export function formErrors(error: Error | null): FormErrors {
  if (!error) return NO_ERRORS;
  if (!(error instanceof ApiError) || error.envelope.details.length === 0)
    return { fields: {}, message: error.message };
  const fields: Record<string, string> = {};
  for (const detail of error.envelope.details) {
    if (!detail.field) continue;
    const field = detail.field.replace(SECTION_PREFIX, "");
    fields[field] ??= detail.message;
  }
  return Object.keys(fields).length > 0 ? { fields } : { fields, message: error.message };
}
