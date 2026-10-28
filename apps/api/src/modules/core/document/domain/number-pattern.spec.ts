import { describe, expect, it } from "vitest";
import { DomainError } from "../../../../platform/http/domain-error.js";
import {
  type NumberContext,
  parsePattern,
  periodKey,
  renderNumber,
  scopeKey,
  sequenceCapacity,
} from "./number-pattern.js";

const branch011: NumberContext = { branchCode: "011", productCode: "KPR", companyCode: "001", date: "2026-10-21" };

function rejection(pattern: string): { code: string; message: string } {
  try {
    parsePattern(pattern);
  } catch (error) {
    if (error instanceof DomainError) return { code: error.code, message: error.message };
  }
  throw new Error(`${pattern} was accepted`);
}

describe("document number pattern", () => {
  it("AC-102.01 renders the preview SP3K-011-202610-00001", () => {
    expect(renderNumber(parsePattern("SP3K-{BRANCH_CODE}-{YYYY}{MM}-{SEQ:5}"), branch011, 1)).toBe(
      "SP3K-011-202610-00001",
    );
  });

  it("AC-102.02 renders 0013/SP3K/011/X/2026 with the roman month", () => {
    expect(renderNumber(parsePattern("{SEQ:4}/SP3K/{BRANCH_CODE}/{MM_ROMAN}/{YYYY}"), branch011, 13)).toBe(
      "0013/SP3K/011/X/2026",
    );
  });

  it("renders the company, product, two-digit year, and day tokens", () => {
    expect(renderNumber(parsePattern("{COMPANY_CODE}.{PRODUCT_CODE}.{YY}{DD}.{SEQ:3}"), branch011, 7)).toBe(
      "001.KPR.2621.007",
    );
  });

  it.each(["SP3K/{BRANCH_CODE}/{YYYY}", "{SEQ:4}/{SEQ:4}", "{SEQ:2}/SP3K", "{SEQ:10}/SP3K", "{SEQ}/SP3K"])(
    "AC-102.04 rejects %s without exactly one valid sequence token",
    (pattern) => {
      expect(rejection(pattern)).toEqual({
        code: "INVALID_SEQUENCE_TOKEN",
        message: "Pattern must contain exactly one sequence token {SEQ:n} with n between 3 and 9",
      });
    },
  );

  it("AC-102.05 names the first unknown token", () => {
    expect(rejection("{SEQ:4}/SP3K/{BRANCH_NAME}/{DOC}")).toEqual({
      code: "UNKNOWN_TOKEN",
      message: "Unknown token: BRANCH_NAME",
    });
  });

  it("AC-102.06 caps {SEQ:4} at 9999", () => {
    expect(sequenceCapacity(parsePattern("{SEQ:4}"))).toBe(9999);
  });

  it("AC-102.03 starts a new period key each month for a monthly reset", () => {
    expect(periodKey("MONTHLY", "2026-10-31")).toBe("202610");
    expect(periodKey("MONTHLY", "2026-11-01")).toBe("202611");
    expect(periodKey("YEARLY", "2026-11-01")).toBe("2026");
    expect(periodKey("DAILY", "2026-11-01")).toBe("20261101");
    expect(periodKey("NONE", "2026-11-01")).toBe("ALL");
  });

  it("keys the counter by its scope", () => {
    expect(scopeKey("COMPANY", branch011)).toBe("001");
    expect(scopeKey("BRANCH", branch011)).toBe("011");
    expect(scopeKey("PRODUCT", branch011)).toBe("KPR");
    expect(scopeKey("BRANCH_PRODUCT", branch011)).toBe("011-KPR");
  });
});
