import { APPLICATION_SECTION_MESSAGES, type OccupationSectionInput, type ProductCategory } from "@cikal/contracts";
import { Decimal } from "decimal.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { requiredFieldsError } from "./required-fields.js";

/**
 * Kategori produk dan parameter sistem untuk aturan section Occupation: `EMPLOYED_INCOME_SOURCES`,
 * `SELF_EMPLOYED_ONLY` produk, dan `SELF_EMPLOYED_OCCUPATIONS` (api-specs 12 §12.3).
 */
export interface OccupationRuleContext {
  productCategory: ProductCategory;
  employedIncomeSources: readonly string[];
  selfEmployedOnly: boolean;
  selfEmployedOccupations: readonly string[];
}

const companyFields = ({ company }: OccupationSectionInput) => ({
  "company.name": company.name,
  "company.address": company.address,
  "company.provinceCode": company.provinceCode,
  "company.cityCode": company.cityCode,
  "company.districtCode": company.districtCode,
  "company.subDistrictCode": company.subDistrictCode,
  "company.zipCode": company.zipCode,
  "company.phoneNumber": company.phoneNumber,
});

function occupationRequiredError(input: OccupationSectionInput, context: OccupationRuleContext): DomainError | null {
  const pension = context.productCategory === "PENSION";
  const employed = input.sourceOfIncome !== undefined && context.employedIncomeSources.includes(input.sourceOfIncome);
  return requiredFieldsError({
    sourceOfIncome: input.sourceOfIncome,
    occupation: input.occupation,
    industryOfProfession: input.industryOfProfession,
    ...(pension
      ? {}
      : { tenureAtCurrentJob: input.tenureAtCurrentJob, monthlyIncomeAllowance: input.monthlyIncomeAllowance }),
    ...(employed ? companyFields(input) : {}),
  });
}

/**
 * Aturan section Occupation mode strict: field wajib (penghasilan dan lama kerja tidak wajib untuk Pension,
 * AC-44.03), penghasilan lebih dari 0 (AC-44.02), lalu produk khusus wiraswasta (AC-44.04); `null` bila lolos.
 */
export function occupationSectionError(
  input: OccupationSectionInput,
  context: OccupationRuleContext,
): DomainError | null {
  const required = occupationRequiredError(input, context);
  if (required) return required;
  const income = input.monthlyIncomeAllowance;
  if (context.productCategory !== "PENSION" && income !== undefined && new Decimal(income).lte(0)) {
    return new DomainError("INVALID_INCOME", APPLICATION_SECTION_MESSAGES.invalidIncome, 422);
  }
  if (context.selfEmployedOnly && !context.selfEmployedOccupations.includes(input.occupation ?? "")) {
    return new DomainError("OCCUPATION_NOT_ELIGIBLE", APPLICATION_SECTION_MESSAGES.occupationNotEligible, 422);
  }
  return null;
}
