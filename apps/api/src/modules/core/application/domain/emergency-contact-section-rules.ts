import { APPLICATION_SECTION_MESSAGES, type EmergencyContactSectionInput } from "@cikal/contracts";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { fieldRuleError, requiredFieldsError } from "./section-errors.js";

/**
 * Aturan section Emergency Contact mode strict: field wajib, lalu nomor kontak berbeda dari nomor pemohon
 * (AC-48.03); `null` bila lolos.
 */
export function emergencyContactSectionError(
  input: EmergencyContactSectionInput,
  applicantMobileNumber: string | null,
): DomainError | null {
  const required = requiredFieldsError({
    contactName: input.contactName,
    relationToApplicant: input.relationToApplicant,
    mobileNumber: input.mobileNumber,
    "address.address": input.address.address,
  });
  if (required) return required;
  if (input.mobileNumber === applicantMobileNumber) {
    const message = APPLICATION_SECTION_MESSAGES.emergencyContactSameNumber;
    return fieldRuleError("EMERGENCY_CONTACT_SAME_NUMBER", message, "mobileNumber");
  }
  return null;
}
