import { businessSectionInputSchema } from "@cikal/contracts";
import { describe, expect, it } from "vitest";
import { type BusinessRuleContext, businessSectionError } from "./business-section-rules.js";

const ADDRESS = {
  address: "Jl. Pasar Baru 7",
  provinceCode: "32",
  cityCode: "32.73",
  districtCode: "32.73.01",
  subDistrictCode: "32.73.01.1001",
  zipCode: "40111",
};

/** Toko Sumber Rejeki di perdagangan eceran (AC-45.01). */
const business = (overrides: Record<string, unknown> = {}) =>
  businessSectionInputSchema.parse({
    businessName: "Toko Sumber Rejeki",
    businessField: "001",
    annualSales: "600000000.00",
    businessLaunchDate: "2018-03-01",
    address: ADDRESS,
    ...overrides,
  });

const context = (overrides: Partial<BusinessRuleContext> = {}): BusinessRuleContext => ({
  today: "2026-10-20",
  minBusinessMonths: 0,
  ...overrides,
});

describe("business section rules", () => {
  it("AC-45.01 accepts complete business data", () => {
    expect(businessSectionError(business(), context())).toBeNull();
  });

  it("AC-45.02 rejects a business launch date in the future", () => {
    const error = businessSectionError(business({ businessLaunchDate: "2026-10-21" }), context());

    expect(error).toMatchObject({
      code: "BUSINESS_LAUNCH_DATE_IN_FUTURE",
      status: 422,
      message: "Business launch date must not be in the future",
      details: [{ field: "businessLaunchDate" }],
    });
  });

  it("AC-45.04 rejects a KUR business running for less than 6 months", () => {
    const error = businessSectionError(
      business({ businessLaunchDate: "2026-04-21" }),
      context({ minBusinessMonths: 6 }),
    );

    expect(error).toMatchObject({
      code: "BUSINESS_TOO_NEW",
      status: 422,
      message: "Business must have been running for at least 6 months",
      details: [{ field: "businessLaunchDate" }],
    });
  });

  it("AC-45.04 accepts a KUR business running for exactly 6 months", () => {
    expect(
      businessSectionError(business({ businessLaunchDate: "2026-04-20" }), context({ minBusinessMonths: 6 })),
    ).toBeNull();
  });

  it("AC-45.05 marks empty Business Name and Business Field as required", () => {
    const error = businessSectionError(business({ businessName: undefined, businessField: undefined }), context());

    expect(error?.code).toBe("VALIDATION_FAILED");
    expect(error?.details.map((detail) => [detail.field, detail.message])).toEqual([
      ["businessName", "This field is required"],
      ["businessField", "This field is required"],
    ]);
  });
});
