import { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";
import { approvedTerms } from "./approved-terms.js";

const snapshot = {
  PRODUCT_APPROVER_RATE_MIN: "11.0000",
  PRODUCT_APPROVER_RATE_MAX: "15.0000",
  PRODUCT_MIN_TENOR: "6",
  PRODUCT_MAX_TENOR: "60",
};
const requested = new Decimal("20000000.00");
const terms =
  (changes: Parameters<typeof approvedTerms>[0], values = snapshot) =>
  () =>
    approvedTerms(changes, values, requested);

describe("approved terms", () => {
  it("AC-97.06 takes an Approver rate inside the range", () => {
    expect(terms({ interestRate: "13.0000" })().interestRate?.toString()).toBe("13");
  });

  it("AC-97.05 rejects an Approver rate outside the range", () => {
    expect(terms({ interestRate: "16.0000" })).toThrow(
      expect.objectContaining({ code: "RATE_OUT_OF_RANGE", message: "Interest rate must be between 11% and 15%" }),
    );
  });

  it("rejects a rate change when the SubProduct has no Approver range", () => {
    expect(terms({ interestRate: "13.0000" }, { ...snapshot, PRODUCT_APPROVER_RATE_MAX: "" })).toThrow(
      expect.objectContaining({ code: "ACTION_DENIED" }),
    );
  });

  it("rejects a loan amount above the requested limit", () => {
    expect(terms({ loanAmount: "20000001.00" })).toThrow(
      expect.objectContaining({
        code: "VALIDATION_FAILED",
        details: [expect.objectContaining({ field: "loanAmount" })],
      }),
    );
    expect(terms({ loanAmount: "15000000.00" })().loanAmount?.toString()).toBe("15000000");
  });

  it("rejects a tenor outside the product limits", () => {
    expect(terms({ tenorApproved: 61 })).toThrow(
      expect.objectContaining({
        details: [
          expect.objectContaining({ field: "tenorApproved", message: "Tenor must be between 6 and 60 months" }),
        ],
      }),
    );
    expect(terms({ tenorApproved: 24 })().tenor).toBe(24);
  });
});
