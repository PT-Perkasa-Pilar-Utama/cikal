import { APPLICATION_SECTION_MESSAGES, type PersonalSectionInput } from "@cikal/contracts";
import { Decimal } from "decimal.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { formatAmount } from "./amount.js";
import { ageInMonths, ageInYears } from "./applicant-age.js";
import { requiredFieldsError } from "./required-fields.js";

/** Data pengajuan, produk, dan parameter yang dibutuhkan aturan section Personal (api-specs 12 §12.3). */
export interface PersonalRuleContext {
  today: string;
  requestedLimit: string | null;
  tenorProposed: number | null;
  npwpMinLimit: string;
  consentRequired: boolean;
  product: { minAge: number; maxAge: number; maxAgeAtMaturityMonth: number | null };
}

function personalRequiredError(input: PersonalSectionInput, consentRequired: boolean): DomainError | null {
  const { id, residence } = input.addresses;
  return requiredFieldsError({
    fullName: input.fullName,
    fullNameId: input.fullNameId,
    placeOfBirth: input.placeOfBirth,
    dateOfBirth: input.dateOfBirth,
    gender: input.gender,
    religion: input.religion,
    nationality: input.nationality,
    education: input.education,
    marital: input.marital,
    motherMaidenName: input.motherMaidenName,
    idType: input.idType,
    idCardNumber: input.idCardNumber,
    mobileNumber: input.mobileNumber,
    "addresses.id.address": id.address,
    ...(residence.sameAsId ? {} : { "addresses.residence.address": residence.address }),
    ...(consentRequired ? { consentGiven: input.consentGiven || undefined } : {}),
  });
}

/** Batas usia saat lunas dalam tahun untuk pesan, contoh 660 bulan = `55` (AC-40.09). */
const maturityYears = (months: number): string => new Decimal(months).div(12).toDecimalPlaces(1).toString();

const npwpMissing = (input: PersonalSectionInput, context: PersonalRuleContext): boolean =>
  context.requestedLimit !== null && new Decimal(context.requestedLimit).gt(context.npwpMinLimit) && !input.npwpNumber;

/**
 * Aturan section Personal mode strict, berurutan seperti tabel api-specs 12 §12.3: field wajib, usia, NPWP, lalu
 * usia saat lunas; `null` bila lolos.
 */
export function personalSectionError(input: PersonalSectionInput, context: PersonalRuleContext): DomainError | null {
  const required = personalRequiredError(input, context.consentRequired);
  if (required) return required;
  const { product, today } = context;
  const dateOfBirth = input.dateOfBirth ?? today;
  const age = ageInYears(dateOfBirth, today);
  if (age < product.minAge || age > product.maxAge) {
    const message = APPLICATION_SECTION_MESSAGES.ageOutOfRange(product.minAge, product.maxAge);
    return new DomainError("AGE_OUT_OF_RANGE", message, 422);
  }
  if (npwpMissing(input, context)) {
    const message = APPLICATION_SECTION_MESSAGES.npwpRequired(formatAmount(context.npwpMinLimit));
    return new DomainError("NPWP_REQUIRED", message, 422);
  }
  const maxMonths = product.maxAgeAtMaturityMonth;
  const tenor = context.tenorProposed;
  if (maxMonths !== null && tenor !== null && ageInMonths(dateOfBirth, today) + tenor > maxMonths) {
    const message = APPLICATION_SECTION_MESSAGES.ageAtMaturityExceeded(maturityYears(maxMonths));
    return new DomainError("AGE_AT_MATURITY_EXCEEDED", message, 422);
  }
  return null;
}
