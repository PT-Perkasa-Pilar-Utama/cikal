import { spouseSectionInputSchema } from "@cikal/contracts";
import { describe, expect, it } from "vitest";
import { spouseSectionError } from "./spouse-section-rules.js";

const APPLICANT_NIK = "3273011402900001";

/** Pasangan karyawan swasta tanpa perjanjian pranikah (AC-43.01). */
const spouse = (overrides: Record<string, unknown> = {}) =>
  spouseSectionInputSchema.parse({
    fullName: "Sri Wahyuni",
    idNumber: "3273015506920002",
    dateOfBirth: "1992-06-15",
    prenuptialAgreement: "N",
    occupation: "001",
    monthlyIncome: "6000000.00",
    ...overrides,
  });

describe("spouse section rules", () => {
  it("AC-43.01 accepts complete spouse data", () => {
    expect(spouseSectionError(spouse(), APPLICANT_NIK)).toBeNull();
  });

  it("AC-43.02 rejects a spouse ID number equal to the applicant ID number", () => {
    const error = spouseSectionError(spouse({ idNumber: APPLICANT_NIK }), APPLICANT_NIK);

    expect(error).toMatchObject({
      code: "SPOUSE_ID_SAME_AS_APPLICANT",
      status: 422,
      message: "Spouse ID number must be different from applicant ID number",
      details: [{ field: "idNumber" }],
    });
  });

  it("marks every empty mandatory field as required", () => {
    const error = spouseSectionError(spouseSectionInputSchema.parse({}), APPLICANT_NIK);

    expect(error?.code).toBe("VALIDATION_FAILED");
    expect(error?.details.map((detail) => [detail.field, detail.message])).toEqual([
      ["fullName", "This field is required"],
      ["idNumber", "This field is required"],
      ["dateOfBirth", "This field is required"],
      ["prenuptialAgreement", "This field is required"],
    ]);
  });
});
