import type { ProductPricingUpdateRequest } from "@cikal/contracts";
import { describe, expect, it } from "vitest";
import { type PricedProduct, pricingRuleError, toPricingData } from "./pricing-rules.js";

const kta: PricedProduct = {
  productCode: "KTA",
  productName: "Kredit Tanpa Agunan",
  interestType: "EFFECTIVE",
  maxTenor: 60,
};
const range = { approverRateMin: "11.0000", approverRateMax: "15.0000" };
/** Contoh AC-97.01: 12% sampai akhir 2026, 14% mulai 2027 tanpa tanggal akhir. */
const ac9701: ProductPricingUpdateRequest = {
  adminFee: "250000.00",
  provisionFee: "1.0000",
  subProducts: [
    { interestRate: "12.0000", validFrom: "2026-10-01", validTo: "2026-12-31", ...range },
    { interestRate: "14.0000", validFrom: "2027-01-01", ...range },
  ],
};

const errorOf = (request: ProductPricingUpdateRequest, product: PricedProduct = kta) =>
  pricingRuleError(toPricingData(request, product), product);

describe("pricingRuleError", () => {
  it("accepts two consecutive periods with an approver range covering each rate (AC-97.01)", () => {
    expect(errorOf(ac9701)).toBeNull();
  });

  it("rejects a period that starts before the previous one ends (AC-97.02)", () => {
    const error = errorOf({
      ...ac9701,
      subProducts: [
        { interestRate: "12.0000", validFrom: "2026-10-01", validTo: "2026-12-31" },
        { interestRate: "14.0000", validFrom: "2026-12-15" },
      ],
    });
    expect({ code: error?.code, status: error?.status, message: error?.message }).toEqual({
      code: "PRICING_PERIOD_OVERLAP",
      status: 422,
      message: "Pricing periods must not overlap",
    });
  });

  it("rejects any period after one without an end date (AC-97.02)", () => {
    const error = errorOf({
      ...ac9701,
      subProducts: [
        { interestRate: "14.0000", validFrom: "2027-06-01" },
        { interestRate: "12.0000", validFrom: "2026-10-01" },
      ],
    });
    expect(error?.code).toBe("PRICING_PERIOD_OVERLAP");
  });

  it("rejects an approver range that does not include the interest rate (AC-97.03)", () => {
    const error = errorOf({
      ...ac9701,
      subProducts: [
        { interestRate: "14.0000", approverRateMin: "10.0000", approverRateMax: "13.0000", validFrom: "2026-10-01" },
      ],
    });
    expect({ code: error?.code, status: error?.status, message: error?.message }).toEqual({
      code: "INVALID_APPROVER_RATE_RANGE",
      status: 422,
      message: "Approver rate range must include the interest rate",
    });
  });

  it("accepts a rate without an approver range", () => {
    expect(errorOf({ ...ac9701, subProducts: [{ interestRate: "14.0000", validFrom: "2026-10-01" }] })).toBeNull();
  });

  it("rejects a zero interest rate with the row path", () => {
    const error = errorOf({ ...ac9701, subProducts: [{ interestRate: "0.0000", validFrom: "2026-10-01" }] });
    expect(error?.code).toBe("VALIDATION_FAILED");
    expect(error?.details).toEqual([
      { field: "subProducts.0.interestRate", code: "OUT_OF_RANGE", message: "Interest rate must be greater than 0" },
    ]);
  });

  it("requires the floating rate and fixed tenor of a hybrid product", () => {
    const error = errorOf(
      { ...ac9701, subProducts: [{ interestRate: "9.0000", validFrom: "2026-10-01" }] },
      { ...kta, interestType: "HYBRID" },
    );
    expect(error?.details?.map((detail) => detail.field)).toEqual([
      "subProducts.0.floatingRate",
      "subProducts.0.tenorFixed",
    ]);
  });

  it("rejects a period that ends before it starts", () => {
    const error = errorOf({
      ...ac9701,
      subProducts: [{ interestRate: "12.0000", validFrom: "2026-10-01", validTo: "2026-09-30" }],
    });
    expect(error?.code).toBe("INVALID_DATE_RANGE");
  });
});
