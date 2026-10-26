import { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";
import { approverRateRange, assertApproverRate, type RateRange } from "./approver-rate.js";

const range = approverRateRange({
  PRODUCT_APPROVER_RATE_MIN: "11.0000",
  PRODUCT_APPROVER_RATE_MAX: "15.0000",
}) as RateRange;
const check = (rate: string) => () => assertApproverRate(new Decimal(rate), range);

describe("approver interest rate", () => {
  it("AC-97.05 rejects a rate outside the Approver range", () => {
    expect(check("16")).toThrow(
      expect.objectContaining({
        code: "RATE_OUT_OF_RANGE",
        status: 422,
        message: "Interest rate must be between 11% and 15%",
      }),
    );
  });

  it("AC-97.06 accepts a rate inside the Approver range", () => {
    expect(check("13")).not.toThrow();
  });

  it("accepts both ends of the range", () => {
    expect(check("11")).not.toThrow();
    expect(check("15")).not.toThrow();
  });

  it("has no range when the SubProduct leaves either end empty", () => {
    expect(approverRateRange({ PRODUCT_APPROVER_RATE_MIN: "11.0000" })).toBeNull();
  });
});
