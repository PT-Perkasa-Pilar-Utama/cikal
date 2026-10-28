import { describe, expect, it } from "vitest";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { assertDisbursementDate } from "./validity-rules.js";

describe("validity rules", () => {
  it("AC-76.01 accepts tomorrow as the disbursement date", () => {
    expect(() => assertDisbursementDate("2026-10-21", "2026-10-20")).not.toThrow();
  });

  it("AC-76.02 rejects today with the AC message", () => {
    expect(() => assertDisbursementDate("2026-10-20", "2026-10-20")).toThrow(
      new DomainError("DISBURSEMENT_DATE_TOO_EARLY", "Disbursement date must be at least 1 day after today", 422),
    );
  });

  it("accepts the first day of the next month and year", () => {
    expect(() => assertDisbursementDate("2027-01-01", "2026-12-31")).not.toThrow();
  });
});
