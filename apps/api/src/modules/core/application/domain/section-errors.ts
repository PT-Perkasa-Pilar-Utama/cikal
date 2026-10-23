import { APPLICATION_SECTION_MESSAGES, APPLICATION_SUBMIT_MESSAGES, type FormSection } from "@cikal/contracts";
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

/** Aturan section `422` dengan field penyebabnya, agar submit bisa menandai section di stepper (api-specs 12 §12.8). */
export function fieldRuleError(code: string, message: string, field: string): DomainError {
  return new DomainError(code, message, 422, [{ field, code, message }]);
}

/**
 * Error strict tiap section saat submit digabung menjadi `422 INCOMPLETE_APPLICATION`; setiap detail membawa section
 * yang ditandai di stepper (api-specs 12 §12.8 langkah 2, AC-50.03). `null` bila semua section lolos.
 */
export function incompleteApplicationError(
  results: ReadonlyArray<readonly [section: FormSection, error: DomainError | null]>,
): DomainError | null {
  const details = results.flatMap(([section, error]) =>
    error ? error.details.map((detail) => ({ ...detail, section })) : [],
  );
  if (details.length === 0) return null;
  return new DomainError("INCOMPLETE_APPLICATION", APPLICATION_SUBMIT_MESSAGES.incompleteApplication, 422, details);
}
