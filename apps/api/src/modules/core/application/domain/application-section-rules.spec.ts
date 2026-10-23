import { describe, expect, it } from "vitest";
import { applicationLimitError, applicationRequiredError } from "./application-section-rules.js";

const KTA = { minPlafond: "5000000.00", maxPlafond: "300000000.00", minTenor: 6, maxTenor: 60 };
const LIMIT_MESSAGE = "Requested limit must be between 5,000,000 and 300,000,000";
const TENOR_MESSAGE = "Tenor must be between 6 and 60 months";

describe("application section rules", () => {
  it("AC-39.02 marks each empty required field with This field is required", () => {
    const error = applicationRequiredError({
      applicationType: "NTB",
      productCategory: "NON_COLLATERAL",
      segment: "MIKRO",
      tenorProposed: 36,
      requestedLimit: undefined,
      productId: undefined,
    });

    expect(error?.code).toBe("VALIDATION_FAILED");
    expect(error?.status).toBe(400);
    expect(error?.details).toEqual([
      { field: "productId", code: "REQUIRED", message: "This field is required" },
      { field: "requestedLimit", code: "REQUIRED", message: "This field is required" },
    ]);
  });

  it.each([
    ["TRM_APP_001", "4999999.00", 36, "LIMIT_OUT_OF_RANGE", LIMIT_MESSAGE],
    ["TRM_APP_002", "5000000.00", 36, null, null],
    ["TRM_APP_003", "300000000.00", 36, null, null],
    ["TRM_APP_004", "300000001.00", 36, "LIMIT_OUT_OF_RANGE", LIMIT_MESSAGE],
    ["TRM_APP_005", "20000000.00", 5, "TENOR_OUT_OF_RANGE", TENOR_MESSAGE],
    ["TRM_APP_006", "20000000.00", 6, null, null],
    ["TRM_APP_007", "20000000.00", 60, null, null],
    ["TRM_APP_008", "20000000.00", 61, "TENOR_OUT_OF_RANGE", TENOR_MESSAGE],
  ])("AC-39.03 %s limit %s tenor %i", (_row, requestedLimit, tenorProposed, code, message) => {
    const error = applicationLimitError({ requestedLimit, tenorProposed }, KTA);

    expect(error && { code: error.code, status: error.status, message: error.message }).toEqual(
      code === null ? null : { code, status: 422, message },
    );
  });
});
