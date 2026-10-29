import { describe, expect, it } from "vitest";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { assertDisbursementDate, assertNotBeforeValidated } from "./validity-rules.js";

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

  it("AC-101.01 accepts a recorded date on the validated date", () => {
    expect(() => assertNotBeforeValidated("2026-10-21", "2026-10-21")).not.toThrow();
  });

  it("AC-101.04 rejects a recorded date before the validated date with the AC message", () => {
    expect(() => assertNotBeforeValidated("2026-10-20", "2026-10-21")).toThrow(
      new DomainError(
        "DISBURSEMENT_BEFORE_VALIDATED_DATE",
        "Disbursement date must not be earlier than the validated date (21-10-2026)",
        422,
      ),
    );
  });
});
