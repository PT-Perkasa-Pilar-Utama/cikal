import { type PersonalSectionInput, personalSectionInputSchema } from "@cikal/contracts";
import { describe, expect, it } from "vitest";
import { type PersonalRuleContext, personalSectionError } from "./personal-section-rules.js";

const KTP_ADDRESS = { address: "Jl. Merdeka No. 10", provinceCode: "32", cityCode: "32.73" };

/** Data pribadi lengkap AC-40.01. */
const complete = (overrides: Record<string, unknown> = {}): PersonalSectionInput =>
  personalSectionInputSchema.parse({
    fullName: "Rudi Hartono",
    fullNameId: "RUDI HARTONO",
    placeOfBirth: "Bandung",
    dateOfBirth: "1990-02-14",
    gender: "L",
    religion: "ISLAM",
    nationality: "WNI",
    education: "S1",
    marital: "001",
    motherMaidenName: "Siti",
    idType: "KTP",
    idCardNumber: "3273011402900001",
    idIssuedDate: "2020-01-10",
    mobileNumber: "081298765432",
    addresses: { id: KTP_ADDRESS, residence: { sameAsId: true } },
    ...overrides,
  });

/** Produk KTA 21 s.d. 55 tahun, hari ini 20-10-2026 (AC-40.03). */
const context = (overrides: Partial<PersonalRuleContext> = {}): PersonalRuleContext => ({
  today: "2026-10-20",
  requestedLimit: "20000000.00",
  tenorProposed: 36,
  npwpMinLimit: "50000000.00",
  consentRequired: false,
  product: { minAge: 21, maxAge: 55, maxAgeAtMaturityMonth: null },
  ...overrides,
});

const summary = (input: PersonalSectionInput, ruleContext: PersonalRuleContext) => {
  const error = personalSectionError(input, ruleContext);
  return error && { code: error.code, status: error.status, message: error.message, details: error.details };
};

describe("personal section rules", () => {
  it("AC-40.01 accepts complete personal data", () => {
    expect(personalSectionError(complete(), context())).toBeNull();
  });

  it("marks empty required fields with This field is required", () => {
    const error = summary(complete({ placeOfBirth: "", addresses: { residence: { sameAsId: false } } }), context());

    expect(error?.code).toBe("VALIDATION_FAILED");
    expect(error?.details.map((detail) => detail.field)).toEqual([
      "placeOfBirth",
      "addresses.id.address",
      "addresses.residence.address",
    ]);
  });

  it("AC-40.03 rejects an applicant one day short of the minimum age", () => {
    expect(summary(complete({ dateOfBirth: "2005-10-21" }), context())).toEqual({
      code: "AGE_OUT_OF_RANGE",
      status: 422,
      message: "Applicant age must be between 21 and 55 years for this product",
      details: [],
    });
  });

  it("AC-40.04 accepts an applicant exactly 21 years old", () => {
    expect(personalSectionError(complete({ dateOfBirth: "2005-10-20" }), context())).toBeNull();
  });

  it("AC-40.05 requires NPWP for a requested limit above 50,000,000", () => {
    expect(summary(complete(), context({ requestedLimit: "50000001.00" }))).toEqual({
      code: "NPWP_REQUIRED",
      status: 422,
      message: "NPWP is required for requested limit above 50,000,000",
      details: [],
    });
  });

  it("AC-40.06 does not require NPWP for a requested limit of exactly 50,000,000", () => {
    expect(personalSectionError(complete(), context({ requestedLimit: "50000000.00" }))).toBeNull();
  });

  it("AC-40.08 lets an applicant without consent continue while consent is not required", () => {
    expect(personalSectionError(complete({ consentGiven: false }), context())).toBeNull();
    expect(summary(complete({ consentGiven: false }), context({ consentRequired: true }))?.details).toEqual([
      { field: "consentGiven", code: "REQUIRED", message: "This field is required" },
    ]);
  });

  it("AC-40.09 rejects an applicant older than the product limit at maturity", () => {
    const ruleContext = context({
      tenorProposed: 60,
      product: { minAge: 21, maxAge: 55, maxAgeAtMaturityMonth: 660 },
    });

    expect(summary(complete({ dateOfBirth: "1975-10-20" }), ruleContext)).toEqual({
      code: "AGE_AT_MATURITY_EXCEEDED",
      status: 422,
      message: "Applicant age at maturity must not exceed 55 years",
      details: [],
    });
    expect(personalSectionError(complete({ dateOfBirth: "1980-10-20" }), ruleContext)).toBeNull();
  });

  it("AC-40.02 rejects an ID card number that is not 16 digits", () => {
    const parsed = personalSectionInputSchema.safeParse({ idCardNumber: "327301140290000" });

    expect(parsed.error?.issues.map((issue) => issue.message)).toEqual(["ID card number must be 16 digits"]);
  });

  it("AC-40.10 accepts KTP as the only ID Type", () => {
    expect(personalSectionInputSchema.safeParse({ idType: "KTP" }).success).toBe(true);
    expect(personalSectionInputSchema.safeParse({ idType: "SIM" }).success).toBe(false);
  });
});
