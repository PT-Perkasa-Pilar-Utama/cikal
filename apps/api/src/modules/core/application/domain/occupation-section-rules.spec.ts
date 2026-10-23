import { type OccupationSectionInput, occupationSectionInputSchema } from "@cikal/contracts";
import { describe, expect, it } from "vitest";
import { type OccupationRuleContext, occupationSectionError } from "./occupation-section-rules.js";

const COMPANY = {
  name: "PT Maju Jaya",
  address: "Jl. Asia Afrika 1",
  provinceCode: "32",
  cityCode: "32.73",
  districtCode: "32.73.01",
  subDistrictCode: "32.73.01.1001",
  zipCode: "40111",
  phoneNumber: "0221234567",
};

/** Karyawan swasta bekerja di perdagangan (AC-44.01). */
const employee = (overrides: Record<string, unknown> = {}): OccupationSectionInput =>
  occupationSectionInputSchema.parse({
    sourceOfIncome: "001",
    occupation: "001",
    industryOfProfession: "001",
    tenureAtCurrentJob: "4",
    monthlyIncomeAllowance: "8000000.00",
    company: COMPANY,
    ...overrides,
  });

const context = (overrides: Partial<OccupationRuleContext> = {}): OccupationRuleContext => ({
  productCategory: "NON_COLLATERAL",
  employedIncomeSources: ["001"],
  selfEmployedOnly: false,
  selfEmployedOccupations: ["005"],
  ...overrides,
});

describe("occupation section rules", () => {
  it("AC-44.01 accepts an employee with company data", () => {
    expect(occupationSectionError(employee(), context())).toBeNull();
  });

  it("AC-44.02 rejects a monthly income of 0", () => {
    const error = occupationSectionError(employee({ monthlyIncomeAllowance: "0.00" }), context());

    expect(error && { code: error.code, status: error.status, message: error.message }).toEqual({
      code: "INVALID_INCOME",
      status: 422,
      message: "Monthly income must be greater than 0",
    });
  });

  it("AC-44.03 does not require income and tenure for a Pension product", () => {
    const input = employee({ monthlyIncomeAllowance: undefined, tenureAtCurrentJob: undefined });

    expect(occupationSectionError(input, context({ productCategory: "PENSION" }))).toBeNull();
  });

  it("AC-44.04 accepts only self-employed occupations for a self-employed product", () => {
    const kur = context({ selfEmployedOnly: true });
    const error = occupationSectionError(employee(), kur);

    expect(error && { code: error.code, status: error.status, message: error.message }).toEqual({
      code: "OCCUPATION_NOT_ELIGIBLE",
      status: 422,
      message: "This product is only available for self-employed applicants",
    });
    expect(occupationSectionError(employee({ sourceOfIncome: "002", occupation: "005" }), kur)).toBeNull();
  });

  it("AC-44.05 marks empty Occupation and Company Name with This field is required", () => {
    const error = occupationSectionError(
      employee({ occupation: undefined, company: { ...COMPANY, name: undefined } }),
      context(),
    );

    expect(error?.code).toBe("VALIDATION_FAILED");
    expect(error?.details).toEqual([
      { field: "occupation", code: "REQUIRED", message: "This field is required" },
      { field: "company.name", code: "REQUIRED", message: "This field is required" },
    ]);
  });

  it("does not require company data for an income source without employment", () => {
    expect(occupationSectionError(employee({ sourceOfIncome: "002", company: {} }), context())).toBeNull();
  });
});
