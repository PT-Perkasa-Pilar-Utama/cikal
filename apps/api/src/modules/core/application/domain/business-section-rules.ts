import { APPLICATION_SECTION_MESSAGES, type BusinessSectionInput } from "@cikal/contracts";
import type { DomainError } from "../../../../platform/http/domain-error.js";
import { ageInMonths } from "./applicant-age.js";
import { fieldRuleError, requiredFieldsError } from "./section-errors.js";

/** Tanggal bisnis dan parameter produk `MIN_BUSINESS_MONTHS` untuk aturan section Business. */
export interface BusinessRuleContext {
  today: string;
  minBusinessMonths: number;
}

/**
 * Aturan section Business mode strict (api-specs 12 §12.3): field wajib (AC-45.05), tanggal mulai usaha tidak di
 * masa depan (AC-45.02), lalu lama usaha dalam bulan penuh minimal parameter produk (AC-45.04); `null` bila lolos.
 */
export function businessSectionError(input: BusinessSectionInput, context: BusinessRuleContext): DomainError | null {
  const { address } = input;
  const required = requiredFieldsError({
    businessName: input.businessName,
    businessField: input.businessField,
    annualSales: input.annualSales,
    businessLaunchDate: input.businessLaunchDate,
    "address.address": address.address,
    "address.provinceCode": address.provinceCode,
    "address.cityCode": address.cityCode,
    "address.districtCode": address.districtCode,
    "address.subDistrictCode": address.subDistrictCode,
    "address.zipCode": address.zipCode,
  });
  if (required) return required;
  const launchDate = input.businessLaunchDate ?? context.today;
  if (launchDate > context.today) {
    const message = APPLICATION_SECTION_MESSAGES.businessLaunchInFuture;
    return fieldRuleError("BUSINESS_LAUNCH_DATE_IN_FUTURE", message, "businessLaunchDate");
  }
  if (ageInMonths(launchDate, context.today) < context.minBusinessMonths) {
    const message = APPLICATION_SECTION_MESSAGES.businessTooNew(context.minBusinessMonths);
    return fieldRuleError("BUSINESS_TOO_NEW", message, "businessLaunchDate");
  }
  return null;
}
