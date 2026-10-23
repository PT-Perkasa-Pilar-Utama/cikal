import type { ProductData } from "@cikal/contracts";
import { describe, expect, it } from "vitest";
import { pricingOn, productTermVariables } from "./product-terms.js";

const kta: ProductData = {
  productCode: "KTA",
  productName: "Kredit Tanpa Agunan",
  productCategory: "NON_COLLATERAL",
  interestType: "EFFECTIVE",
  contractType: null,
  minPlafond: "5000000.00",
  maxPlafond: "300000000.00",
  minTenor: 6,
  maxTenor: 60,
  minAge: 21,
  maxAge: 55,
  maxAgeAtMaturityMonth: null,
  dbrMax: "40.0000",
  dsr: null,
  multipleSalaryDbr: null,
  adminFee: "0.00",
  provisionFee: "0.0000",
  salesFee: null,
  limitAutoApproval: "10000000.00",
  scoringApproval: null,
  isPaylater: null,
  validFrom: "2026-10-01",
  validTo: null,
  isActive: true,
};

const period = (validFrom: string, validTo: string | null, interestRate: string) => ({
  interestRate,
  floatingRate: null,
  capRate: null,
  tenorFixed: null,
  approverRateMin: null,
  approverRateMax: null,
  validFrom,
  validTo,
});

describe("product terms snapshot", () => {
  it("locks DBR Max under its formula variable code (AC-20.08)", () => {
    expect(productTermVariables(kta, null)).toMatchObject({ PRODUCT_DBR_MAX: "40.0000", PRODUCT_MAX_TENOR: "60" });
  });

  it("leaves out terms the product does not set", () => {
    expect(productTermVariables(kta, null)).not.toHaveProperty("PRODUCT_DSR");
  });

  it("includes the interest rate of the pricing period in force", () => {
    const rows = [period("2026-01-01", "2026-09-30", "12.0000"), period("2026-10-01", null, "14.0000")];
    expect(productTermVariables(kta, pricingOn(rows, "2026-10-20"))).toMatchObject({
      PRODUCT_INTEREST_RATE: "14.0000",
    });
  });

  it("finds no pricing before the first period starts", () => {
    expect(pricingOn([period("2026-10-01", null, "14.0000")], "2026-09-30")).toBeNull();
  });
});
