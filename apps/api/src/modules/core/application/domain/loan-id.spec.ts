import { describe, expect, it } from "vitest";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { formatLoanId, LOAN_ID_MAX_SEQUENCE, loanIdExhausted } from "./loan-id.js";

describe("formatLoanId (api-specs 12 §12.2 langkah 4)", () => {
  it("AC-49.01 joins ddMMyyyy, the product code, and a 7-digit counter", () => {
    expect(formatLoanId(new Date("2026-10-20T03:00:00Z"), "KTA", 13)).toBe("20102026KTA0000013");
  });

  it("AC-49.04 TRM_LID_003 dates the Loan ID in Asia/Jakarta, not UTC", () => {
    expect(formatLoanId(new Date("2026-10-20T16:59:59Z"), "KTA", 14)).toBe("20102026KTA0000014");
    expect(formatLoanId(new Date("2026-10-20T17:00:00Z"), "KTA", 14)).toBe("21102026KTA0000014");
  });

  it("AC-49.04 keeps the counter at seven digits up to the limit", () => {
    expect(formatLoanId(new Date("2026-10-20T03:00:00Z"), "KPR", LOAN_ID_MAX_SEQUENCE)).toBe("20102026KPR9999999");
  });
});

describe("loanIdExhausted", () => {
  it("AC-49.04 TRM_LID_005 carries the counter limit message", () => {
    const error = loanIdExhausted();

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toMatchObject({
      code: "LOAN_ID_EXHAUSTED",
      status: 422,
      message: "Loan ID counter has reached its limit. Please contact your administrator",
    });
  });
});
