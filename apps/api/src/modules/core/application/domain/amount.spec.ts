import { describe, expect, it } from "vitest";
import { formatAmount } from "./amount.js";

describe("formatAmount", () => {
  it("groups thousands with commas and drops a zero fraction", () => {
    expect(formatAmount("5000000.00")).toBe("5,000,000");
    expect(formatAmount("300000000")).toBe("300,000,000");
    expect(formatAmount("999.5")).toBe("999.50");
  });
});
