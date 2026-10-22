import type { ProductCreateRequest } from "@cikal/contracts";
import { describe, expect, it } from "vitest";
import { parseTenorLimit, productRuleError, sameProductData, toProductData } from "./product-rules.js";

const CORE_LIMIT = 60;
const kta: ProductCreateRequest = {
  productCode: "KTA",
  productName: "Kredit Tanpa Agunan",
  productCategory: "NON_COLLATERAL",
  interestType: "EFFECTIVE",
  minPlafond: "5000000.00",
  maxPlafond: "300000000.00",
  minTenor: 6,
  maxTenor: 60,
  minAge: 21,
  maxAge: 55,
  dbrMax: "40.0000",
  limitAutoApproval: "10000000.00",
  validFrom: "2026-10-01",
};

const errorOf = (request: Partial<ProductCreateRequest>, limit = CORE_LIMIT) => {
  const error = productRuleError(toProductData({ ...kta, ...request }), limit);
  return error && { code: error.code, status: error.status, message: error.message };
};

describe("toProductData", () => {
  it("stores the product code in upper case and fills fee defaults", () => {
    const data = toProductData({ ...kta, productCode: "kta", limitAutoApproval: undefined });
    expect(data).toMatchObject({
      productCode: "KTA",
      adminFee: "0.00",
      provisionFee: "0.0000",
      limitAutoApproval: "0.00",
      salesFee: null,
      isActive: true,
    });
  });
});

describe("productRuleError", () => {
  it("accepts the KTA example (AC-20.01)", () => {
    expect(errorOf({})).toBeNull();
  });

  it("rejects a maximal plafond below the minimal plafond (AC-20.02)", () => {
    expect(errorOf({ minPlafond: "300000000.00", maxPlafond: "5000000.00" })).toEqual({
      code: "INVALID_PLAFOND_RANGE",
      status: 422,
      message: "Maximal plafond must be greater than minimal plafond",
    });
  });

  it("rejects a 6-character product code (AC-20.04)", () => {
    expect(errorOf({ productCode: "KPRSUB" })).toEqual({
      code: "INVALID_PRODUCT_CODE",
      status: 422,
      message: "Product code must be 1 to 5 letters or digits",
    });
  });

  it("rejects a product code with symbols (AC-20.04)", () => {
    expect(errorOf({ productCode: "KP-1" })?.code).toBe("INVALID_PRODUCT_CODE");
  });

  it("rejects a limit auto approval above the maximal plafond (AC-20.05)", () => {
    expect(errorOf({ maxPlafond: "300000000.00", limitAutoApproval: "300000001.00" })).toEqual({
      code: "AUTO_APPROVAL_LIMIT_EXCEEDED",
      status: 422,
      message: "Limit auto approval must not exceed maximal plafond",
    });
  });

  it("accepts a limit auto approval equal to the maximal plafond (AC-20.05)", () => {
    expect(errorOf({ limitAutoApproval: "300000000.00" })).toBeNull();
  });

  it("rejects a maximum tenor above the core banking limit with the limit in the message (AC-20.07)", () => {
    expect(errorOf({ maxTenor: 36 }, 24)).toEqual({
      code: "TENOR_EXCEEDS_CORE_LIMIT",
      status: 422,
      message: "Maximum tenor must not exceed core banking limit (24 months)",
    });
  });

  it("accepts a maximum tenor equal to the core banking limit (AC-20.07)", () => {
    expect(errorOf({ maxTenor: 24 }, 24)).toBeNull();
  });

  it("rejects a validity end before its start", () => {
    expect(errorOf({ validTo: "2026-09-30" })?.code).toBe("INVALID_DATE_RANGE");
  });

  it("requires a contract type for a Syariah product", () => {
    const error = productRuleError(toProductData({ ...kta, productCategory: "SYARIAH" }), CORE_LIMIT);
    expect(error?.code).toBe("VALIDATION_FAILED");
    expect(error?.details).toEqual([{ field: "contractType", code: "REQUIRED", message: "This field is required" }]);
  });
});

describe("sameProductData", () => {
  it("treats the same amount written with another scale as unchanged", () => {
    const current = toProductData(kta);
    expect(sameProductData(current, toProductData({ ...kta, minPlafond: "5000000.0" }))).toBe(true);
  });

  it("detects a changed field", () => {
    expect(sameProductData(toProductData(kta), toProductData({ ...kta, dbrMax: "35.0000" }))).toBe(false);
  });
});

describe("parseTenorLimit", () => {
  it("reads the tenant value as whole months", () => {
    expect(parseTenorLimit("24")).toBe(24);
  });

  it("fails loudly on a value that is not a whole number", () => {
    expect(() => parseTenorLimit("abc")).toThrow("CORE_MAX_TENOR_MONTHS must be an integer");
  });
});
