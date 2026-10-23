import { APPLICATION_SECTION_MESSAGES } from "@cikal/contracts";
import { DomainError } from "../../../../platform/http/domain-error.js";

const blank = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === "string" && value.trim() === "");

/**
 * Field wajib mode strict yang kosong menjadi `400 VALIDATION_FAILED` dengan pesan "This field is required" per
 * field (AC-39.02, AC-44.05); `null` bila semua terisi. Kunci adalah path field di body section.
 */
export function requiredFieldsError(fields: Readonly<Record<string, unknown>>): DomainError | null {
  const details = Object.entries(fields)
    .filter(([, value]) => blank(value))
    .map(([field]) => ({ field, code: "REQUIRED", message: APPLICATION_SECTION_MESSAGES.required }));
  return details.length === 0 ? null : DomainError.standard("VALIDATION_FAILED", undefined, details);
}
