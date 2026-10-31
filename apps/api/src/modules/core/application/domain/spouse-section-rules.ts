import { APPLICATION_SECTION_MESSAGES, type SpouseSectionInput } from "@cikal/contracts";
import type { DomainError } from "../../../../platform/http/domain-error.js";
import { fieldRuleError, requiredFieldsError } from "./section-errors.js";

/**
 * Aturan section Spouse mode strict (api-specs 12 §12.3): field wajib, lalu NIK pasangan berbeda dari NIK pemohon
 * (AC-43.02); `null` bila lolos.
 */
export function spouseSectionError(input: SpouseSectionInput, applicantNik: string): DomainError | null {
  const required = requiredFieldsError({
    fullName: input.fullName,
    idNumber: input.idNumber,
    dateOfBirth: input.dateOfBirth,
    prenuptialAgreement: input.prenuptialAgreement,
  });
  if (required) return required;
  if (input.idNumber === applicantNik) {
    const message = APPLICATION_SECTION_MESSAGES.spouseIdSameAsApplicant;
    return fieldRuleError("SPOUSE_ID_SAME_AS_APPLICANT", message, "idNumber");
  }
  return null;
}
